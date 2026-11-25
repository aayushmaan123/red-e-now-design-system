from datetime import datetime, date, time, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required
from mysql.connector import Error

from services.database import get_db_connection
from utils.clock import (
    building_now,
    building_timezone,
    building_today,
    is_pickup_day,
    local_iso,
)

scheduling_bp = Blueprint("scheduling", __name__)

BUILDING_ID = 1


def error(code, message, status):
    return jsonify({
        "success": False,
        "error": {"code": code, "message": message},
    }), status


def read_settings(cursor):
    cursor.execute("""
        SELECT s.building_id, b.name AS building_name,
               s.open_time, s.close_time, s.slot_minutes,
               s.default_capacity, s.cancellation_cutoff_minutes
        FROM scheduling_settings AS s
        JOIN buildings AS b ON b.id = s.building_id
        WHERE s.building_id = %s
    """, (BUILDING_ID,))
    return cursor.fetchone()


def time_text(value):
    if isinstance(value, timedelta):
        seconds = int(value.total_seconds())
        return f"{seconds // 3600:02d}:{(seconds // 60) % 60:02d}"
    if isinstance(value, time):
        return value.strftime("%H:%M")
    return str(value)[:5]


def settings_json(row):
    return {
        "building_id": row["building_id"],
        "building_name": row["building_name"],
        "open_time": time_text(row["open_time"]),
        "close_time": time_text(row["close_time"]),
        "slot_minutes": row["slot_minutes"],
        "default_capacity": row["default_capacity"],
        "cancellation_cutoff_minutes":
            row["cancellation_cutoff_minutes"],
        # Pickup times are building-local. Clients use these to compare
        # against the building's clock instead of the viewer's.
        "timezone": str(building_timezone()),
        "building_now": local_iso(building_now()),
    }


@scheduling_bp.route("/api/scheduling/settings", methods=["GET"])
@jwt_required()
def get_settings():
    if get_jwt().get("role") not in ("resident", "staff"):
        return error("FORBIDDEN", "Access denied.", 403)

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        settings = read_settings(cursor)

        if not settings:
            return error("NOT_FOUND", "Scheduling settings missing.", 404)

        return jsonify({
            "success": True,
            "settings": settings_json(settings),
        }), 200
    except Error:
        current_app.logger.exception("Could not load scheduling settings")
        return error("DATABASE_ERROR", "Could not load settings.", 500)
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@scheduling_bp.route("/api/scheduling/settings", methods=["PUT"])
@jwt_required()
def update_settings():
    if get_jwt().get("role") != "staff":
        return error("FORBIDDEN", "Staff access required.", 403)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error("VALIDATION_ERROR", "JSON object required.", 400)

    required = (
        "open_time",
        "close_time",
        "slot_minutes",
        "default_capacity",
        "cancellation_cutoff_minutes",
    )

    if any(key not in data for key in required):
        return error("VALIDATION_ERROR", "All settings are required.", 400)

    try:
        opening = datetime.strptime(data["open_time"], "%H:%M").time()
        closing = datetime.strptime(data["close_time"], "%H:%M").time()
    except (ValueError, TypeError):
        return error("VALIDATION_ERROR", "Use HH:MM for hours.", 400)

    duration = data["slot_minutes"]
    capacity = data["default_capacity"]
    cutoff = data["cancellation_cutoff_minutes"]

    if (
        opening >= closing
        or type(duration) is not int
        or duration not in (15, 30, 60)
        or type(capacity) is not int
        or capacity < 1
        or capacity > 100
        or type(cutoff) is not int
        or cutoff < 0
        or cutoff > 10080
    ):
        return error("VALIDATION_ERROR", "Invalid scheduling settings.", 400)

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # Pickup times are stored in building-local time, so compare
        # against the building's clock rather than the database's NOW().
        now = building_now()

        # Lock the settings row so simultaneous updates are serialized.
        cursor.execute("""
            SELECT building_id, open_time, close_time,
                   slot_minutes, default_capacity
            FROM scheduling_settings
            WHERE building_id = %s
            FOR UPDATE
        """, (BUILDING_ID,))
        existing_settings = cursor.fetchone()

        if not existing_settings:
            connection.rollback()
            return error("NOT_FOUND", "Scheduling settings missing.", 404)

        # Existing future bookings must remain valid under new hours
        # and duration. Historical appointments are not changed.
        cursor.execute("""
            SELECT pickup_start, pickup_end
            FROM pickup_appointments
            WHERE status = 'scheduled'
              AND pickup_start > %s
            FOR UPDATE
        """, (now,))
        future_appointments = cursor.fetchall()

        for appointment in future_appointments:
            start = appointment["pickup_start"]
            end = appointment["pickup_end"]

            day_open = datetime.combine(start.date(), opening)
            day_close = datetime.combine(start.date(), closing)

            if (
                not is_pickup_day(start)
                or start < day_open
                or end > day_close
                or (start - day_open).total_seconds()
                    % (duration * 60) != 0
                or (end - start).total_seconds() != duration * 60
            ):
                connection.rollback()
                return error(
                    "EXISTING_BOOKINGS",
                    "These settings conflict with existing future pickups. "
                    "Reschedule those appointments first.",
                    409,
                )

        cursor.execute("""
            UPDATE scheduling_settings
            SET open_time = %s,
                close_time = %s,
                slot_minutes = %s,
                default_capacity = %s,
                cancellation_cutoff_minutes = %s
            WHERE building_id = %s
        """, (
            opening, closing, duration, capacity, cutoff, BUILDING_ID,
        ))

        if cursor.rowcount == 0:
            cursor.execute(
                "SELECT building_id FROM scheduling_settings "
                "WHERE building_id = %s",
                (BUILDING_ID,),
            )
            if not cursor.fetchone():
                connection.rollback()
                return error("NOT_FOUND", "Scheduling settings missing.", 404)

        # Keep future stored slot capacities in sync with staff settings.
        # Booking and rescheduling acquire the settings lock first.
        cursor.execute("""
            SELECT pickup_start
            FROM pickup_slots
            WHERE pickup_start > %s
            ORDER BY pickup_start
            FOR UPDATE
        """, (now,))
        cursor.fetchall()

        # One query for every future slot (not one per slot: a week of
        # slots would be over a hundred round trips to a hosted database).
        cursor.execute("""
            SELECT COALESCE(MAX(slot.booked), 0) AS most_booked
            FROM (
                SELECT COUNT(*) AS booked
                FROM pickup_appointments
                WHERE status = 'scheduled'
                  AND pickup_start > %s
                GROUP BY pickup_start
            ) AS slot
        """, (now,))

        if cursor.fetchone()["most_booked"] > capacity:
            connection.rollback()
            return error(
                "EXISTING_BOOKINGS",
                "Capacity is below existing future bookings. "
                "Reschedule those appointments first.",
                409,
            )

        cursor.execute("""
            UPDATE pickup_slots
            SET capacity = %s
            WHERE pickup_start > %s
        """, (capacity, now))

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Scheduling settings saved.",
        }), 200
    except Error:
        if connection:
            connection.rollback()
        current_app.logger.exception("Could not update scheduling settings")
        return error("DATABASE_ERROR", "Could not save settings.", 500)
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@scheduling_bp.route("/api/scheduling/slots", methods=["GET"])
@jwt_required()
def available_slots():
    if get_jwt().get("role") not in ("resident", "staff"):
        return error("FORBIDDEN", "Access denied.", 403)

    date_text = request.args.get("date", "")

    try:
        selected_date = date.fromisoformat(date_text)
    except ValueError:
        return error("VALIDATION_ERROR", "Use YYYY-MM-DD for date.", 400)

    if not is_pickup_day(selected_date):
        return jsonify({"success": True, "slots": []}), 200

    now = building_now()

    if selected_date < building_today():
        return jsonify({"success": True, "slots": []}), 200

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        settings = read_settings(cursor)
        if not settings:
            return error("NOT_FOUND", "Scheduling settings missing.", 404)

        opening = datetime.combine(
            selected_date,
            datetime.strptime(time_text(settings["open_time"]), "%H:%M").time(),
        )
        closing = datetime.combine(
            selected_date,
            datetime.strptime(time_text(settings["close_time"]), "%H:%M").time(),
        )

        cursor.execute("""
            SELECT a.pickup_start, COUNT(*) AS booked
            FROM pickup_appointments a
            WHERE DATE(a.pickup_start) = %s
              AND a.status = 'scheduled'
            GROUP BY a.pickup_start
        """, (selected_date,))
        counts = {
            row["pickup_start"]: row["booked"]
            for row in cursor.fetchall()
        }

        cursor.execute("""
            SELECT pickup_start, capacity
            FROM pickup_slots
            WHERE DATE(pickup_start) = %s
        """, (selected_date,))
        capacities = {
            row["pickup_start"]: row["capacity"]
            for row in cursor.fetchall()
        }

        slots = []
        current = opening
        duration = timedelta(minutes=settings["slot_minutes"])

        while current + duration <= closing:
            # Offer the slot that is in progress too; it stays
            # bookable until it ends (matches POST /api/appointments).
            if current + duration > now:
                booked = counts.get(current, 0)
                capacity = capacities.get(
                    current, settings["default_capacity"]
                )
                slots.append({
                    "pickup_start": current.strftime("%Y-%m-%dT%H:%M"),
                    "pickup_end": (current + duration).strftime(
                        "%Y-%m-%dT%H:%M"
                    ),
                    "capacity": capacity,
                    "booked": booked,
                    "remaining": max(0, capacity - booked),
                    "available": booked < capacity,
                })

            current += duration

        return jsonify({"success": True, "slots": slots}), 200

    except Error:
        current_app.logger.exception("Could not load pickup slots")
        return error("DATABASE_ERROR", "Could not load slots.", 500)
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
