from datetime import datetime, timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from mysql.connector import Error

from services.database import get_db_connection
from routes.packages import add_audit
from routes.scheduling import read_settings, time_text

appointments_bp = Blueprint("appointments", __name__)

# Settings loaded from MySQL.


def fail(code, message, status):
    return jsonify({
        "success": False,
        "error": {"code": code, "message": message}
    }), status


def serialize(row):
    result = dict(row)
    for key in ("pickup_start", "pickup_end", "created_at"):
        if isinstance(result.get(key), datetime):
            result[key] = result[key].isoformat()

    if row.get("status") == "completed":
        row["handoff_status"] = "Completed"
    elif row.get("acknowledged_at") is not None:
        row["handoff_status"] = "Signed off"
    elif row.get("identity_verified_at") is not None:
        row["handoff_status"] = "Identity verified"
    elif row.get("checked_in_at") is not None:
        row["handoff_status"] = "Waiting"
    else:
        row["handoff_status"] = "Not checked in"

    return result


def appointment_list(cursor, where="", params=()):
    cursor.execute("""
        SELECT a.id, a.package_id, a.resident_id,
               a.pickup_start, a.pickup_end, a.status, a.created_at,
            a.checked_in_at, a.identity_verified_at,
            a.acknowledged_at, a.handed_off_at,
               p.tracking_code, p.carrier_name, p.location_code,
               p.status AS package_status,
               u.name AS resident_name, u.unit AS resident_unit
        FROM pickup_appointments a
        JOIN packages p ON p.id = a.package_id
        JOIN users u ON u.id = a.resident_id
    """ + where + " ORDER BY a.pickup_start ASC", params)
    return [serialize(row) for row in cursor.fetchall()]


@appointments_bp.route("/api/appointments", methods=["GET"])
@jwt_required()
def list_appointments():
    role = get_jwt().get("role")
    if role not in ("resident", "staff"):
        return fail("FORBIDDEN", "Access denied.", 403)

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        if role == "resident":
            appointments = appointment_list(
                cursor, " WHERE a.resident_id = %s",
                (int(get_jwt_identity()),)
            )
        else:
            appointments = appointment_list(cursor)

        return jsonify({
            "success": True,
            "appointments": appointments
        }), 200
    except Error:
        current_app.logger.exception("Could not list appointments")
        return fail("DATABASE_ERROR", "Could not load appointments.", 500)
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


@appointments_bp.route("/api/appointments", methods=["POST"])
@jwt_required()
def create_appointment():
    if get_jwt().get("role") != "resident":
        return fail("FORBIDDEN", "Resident access required.", 403)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return fail("VALIDATION_ERROR", "JSON object required.", 400)

    package_id = data.get("package_id")
    start_text = data.get("pickup_start")

    if type(package_id) is not int or package_id <= 0:
        return fail("VALIDATION_ERROR", "Valid package ID required.", 400)

    if not isinstance(start_text, str):
        return fail("VALIDATION_ERROR", "Pickup start time required.", 400)

    try:
        start = datetime.strptime(start_text, "%Y-%m-%dT%H:%M")
    except ValueError:
        return fail(
            "VALIDATION_ERROR",
            "Use YYYY-MM-DDTHH:MM for pickup_start.",
            400
        )

    resident_id = int(get_jwt_identity())
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)


        # Coordinate booking with staff scheduling-settings updates.
        cursor.execute(
            "SELECT building_id FROM scheduling_settings "
            "WHERE building_id = 1 FOR UPDATE"
        )
        cursor.fetchone()
        settings = read_settings(cursor)
        if not settings:
            connection.rollback()
            return fail("NOT_FOUND", "Scheduling settings missing.", 404)

        duration = settings["slot_minutes"]
        end = start + timedelta(minutes=duration)

        opening = datetime.strptime(
            time_text(settings["open_time"]), "%H:%M"
        ).time()
        closing = datetime.strptime(
            time_text(settings["close_time"]), "%H:%M"
        ).time()

        opening_dt = datetime.combine(start.date(), opening)
        closing_dt = datetime.combine(start.date(), closing)

        if (
            start <= datetime.now()
            or start.weekday() >= 5
            or start < opening_dt
            or end > closing_dt
            or (start - opening_dt).total_seconds() % (duration * 60) != 0
        ):
            connection.rollback()
            return fail(
                "VALIDATION_ERROR",
                "Choose a future weekday slot within scheduling hours.",
                400,
            )

        # Lock the package to prevent simultaneous bookings for it.
        cursor.execute("""
            SELECT id, resident_id, status
            FROM packages WHERE id = %s FOR UPDATE
        """, (package_id,))
        package = cursor.fetchone()

        if package is None or package["resident_id"] != resident_id:
            connection.rollback()
            return fail("NOT_FOUND", "Package not found.", 404)

        if package["status"] != "available":
            connection.rollback()
            return fail(
                "CONFLICT",
                "Only available packages can be scheduled.",
                409
            )

        cursor.execute("""
            SELECT id FROM pickup_appointments
            WHERE package_id = %s AND status = 'scheduled'
            LIMIT 1
        """, (package_id,))

        if cursor.fetchone():
            connection.rollback()
            return fail("CONFLICT", "Package already scheduled.", 409)

        # Lock the shared time slot to serialize bookings across packages.
        # The unique pickup_start primary key makes this safe under concurrency.
        cursor.execute("""
            INSERT INTO pickup_slots (pickup_start, capacity)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE capacity = capacity
        """, (start, settings["default_capacity"]))

        cursor.execute("""
            SELECT capacity
            FROM pickup_slots
            WHERE pickup_start = %s
            FOR UPDATE
        """, (start,))
        slot = cursor.fetchone()

        cursor.execute("""
            SELECT COUNT(*) AS booked
            FROM pickup_appointments
            WHERE pickup_start = %s
              AND status = 'scheduled'
            FOR UPDATE
        """, (start,))
        booked = cursor.fetchone()["booked"]

        if booked >= slot["capacity"]:
            connection.rollback()
            return fail(
                "SLOT_FULL",
                "This pickup time is fully booked. Please choose another slot.",
                409
            )

        cursor.execute("""
            INSERT INTO pickup_appointments
                (package_id, resident_id, pickup_start, pickup_end)
            VALUES (%s, %s, %s, %s)
        """, (package_id, resident_id, start, end))

        appointment_id = cursor.lastrowid

        cursor.execute("""
            UPDATE packages SET status = 'scheduled'
            WHERE id = %s
        """, (package_id,))

        add_audit(
            cursor, package_id, resident_id,
            "status_changed",
            {"status": "available"},
            {"status": "scheduled", "appointment_id": appointment_id}
        )

        connection.commit()

        cursor.execute("""
            SELECT id, package_id, resident_id,
                   pickup_start, pickup_end, status, created_at
            FROM pickup_appointments WHERE id = %s
        """, (appointment_id,))

        return jsonify({
            "success": True,
            "appointment": serialize(cursor.fetchone())
        }), 201

    except Error:
        if connection is not None:
            connection.rollback()
        current_app.logger.exception("Could not create appointment")
        return fail("DATABASE_ERROR", "Could not schedule pickup.", 500)
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


@appointments_bp.route(
    "/api/appointments/<int:appointment_id>/cancel",
    methods=["POST"]
)
@jwt_required()
def cancel_appointment(appointment_id):
    if get_jwt().get("role") != "resident":
        return fail("FORBIDDEN", "Resident access required.", 403)

    resident_id = int(get_jwt_identity())
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT package_id FROM pickup_appointments
            WHERE id = %s AND resident_id = %s
        """, (appointment_id, resident_id))
        existing = cursor.fetchone()

        if existing is None:
            connection.rollback()
            return fail("NOT_FOUND", "Appointment not found.", 404)

        # Lock package first, matching the booking lock order.
        cursor.execute("""
            SELECT id, status FROM packages
            WHERE id = %s FOR UPDATE
        """, (existing["package_id"],))
        package = cursor.fetchone()

        cursor.execute("""
            SELECT id, status FROM pickup_appointments
            WHERE id = %s AND resident_id = %s FOR UPDATE
        """, (appointment_id, resident_id))
        appointment = cursor.fetchone()

        if appointment["status"] != "scheduled":
            connection.rollback()
            return fail("CONFLICT", "Appointment is not active.", 409)

        if package["status"] != "scheduled":
            connection.rollback()
            return fail(
                "CONFLICT",
                "This package can no longer be rescheduled.",
                409
            )


        cursor.execute(
            "SELECT pickup_start FROM pickup_appointments WHERE id = %s",
            (appointment_id,),
        )
        pickup_start = cursor.fetchone()["pickup_start"]

        settings = read_settings(cursor)
        if not settings:
            connection.rollback()
            return fail("NOT_FOUND", "Scheduling settings missing.", 404)

        cutoff = timedelta(minutes=settings["cancellation_cutoff_minutes"])

        if datetime.now() >= pickup_start - cutoff:
            connection.rollback()
            return fail(
                "CANCELLATION_CUTOFF",
                "The cancellation deadline has passed.",
                409,
            )

        cursor.execute("""
            UPDATE pickup_appointments SET status = 'cancelled'
            WHERE id = %s
        """, (appointment_id,))

        cursor.execute("""
            UPDATE packages SET status = 'available'
            WHERE id = %s
        """, (existing["package_id"],))

        add_audit(
            cursor, existing["package_id"], resident_id,
            "status_changed",
            {"status": "scheduled"},
            {"status": "available", "cancelled_appointment_id": appointment_id}
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Pickup cancelled successfully."
        }), 200

    except Error:
        if connection is not None:
            connection.rollback()
        current_app.logger.exception("Could not cancel appointment")
        return fail("DATABASE_ERROR", "Could not cancel pickup.", 500)
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()


@appointments_bp.route(
    "/api/appointments/<int:appointment_id>/reschedule",
    methods=["POST"],
)
@jwt_required()
def reschedule_appointment(appointment_id):
    if get_jwt().get("role") != "resident":
        return fail("FORBIDDEN", "Resident access required.", 403)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return fail("VALIDATION_ERROR", "JSON object required.", 400)

    start_text = data.get("pickup_start")
    if not isinstance(start_text, str):
        return fail("VALIDATION_ERROR", "Pickup start time required.", 400)

    try:
        new_start = datetime.strptime(start_text, "%Y-%m-%dT%H:%M")
    except ValueError:
        return fail(
            "VALIDATION_ERROR",
            "Use YYYY-MM-DDTHH:MM for pickup_start.",
            400,
        )

    resident_id = int(get_jwt_identity())
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        # Serialize rescheduling with staff settings updates.
        cursor.execute(
            "SELECT building_id FROM scheduling_settings "
            "WHERE building_id = 1 FOR UPDATE"
        )
        cursor.fetchone()

        # Find the appointment and its package without locking yet.
        cursor.execute("""
            SELECT package_id
            FROM pickup_appointments
            WHERE id = %s AND resident_id = %s
        """, (appointment_id, resident_id))
        existing = cursor.fetchone()

        if not existing:
            connection.rollback()
            return fail("NOT_FOUND", "Appointment not found.", 404)

        # Match booking/cancellation lock order: package first.
        cursor.execute("""
            SELECT id, status, resident_id
            FROM packages
            WHERE id = %s
            FOR UPDATE
        """, (existing["package_id"],))
        package = cursor.fetchone()

        if (
            not package
            or package["resident_id"] != resident_id
            or package["status"] != "scheduled"
        ):
            connection.rollback()
            return fail(
                "CONFLICT",
                "This package cannot be rescheduled.",
                409,
            )

        cursor.execute("""
            SELECT id, package_id, pickup_start, pickup_end, status
            FROM pickup_appointments
            WHERE id = %s AND resident_id = %s
            FOR UPDATE
        """, (appointment_id, resident_id))
        appointment = cursor.fetchone()

        if not appointment or appointment["status"] != "scheduled":
            connection.rollback()
            return fail("CONFLICT", "Appointment is not active.", 409)

        settings = read_settings(cursor)
        if not settings:
            connection.rollback()
            return fail("NOT_FOUND", "Scheduling settings missing.", 404)

        old_start = appointment["pickup_start"]
        cutoff = timedelta(
            minutes=settings["cancellation_cutoff_minutes"]
        )

        if datetime.now() >= old_start - cutoff:
            connection.rollback()
            return fail(
                "RESCHEDULE_CUTOFF",
                "The rescheduling deadline has passed.",
                409,
            )

        duration = settings["slot_minutes"]
        new_end = new_start + timedelta(minutes=duration)

        opening = datetime.strptime(
            time_text(settings["open_time"]), "%H:%M"
        ).time()
        closing = datetime.strptime(
            time_text(settings["close_time"]), "%H:%M"
        ).time()

        opening_dt = datetime.combine(new_start.date(), opening)
        closing_dt = datetime.combine(new_start.date(), closing)

        if (
            new_start <= datetime.now()
            or new_start.weekday() >= 5
            or new_start < opening_dt
            or new_end > closing_dt
            or (new_start - opening_dt).total_seconds()
                % (duration * 60) != 0
        ):
            connection.rollback()
            return fail(
                "VALIDATION_ERROR",
                "Choose a future weekday slot within scheduling hours.",
                400,
            )

        if new_start == old_start:
            connection.rollback()
            return fail(
                "CONFLICT",
                "The appointment is already booked for this time.",
                409,
            )

        # Ensure a capacity row exists for the requested time.
        cursor.execute("""
            INSERT INTO pickup_slots (pickup_start, capacity)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE capacity = capacity
        """, (new_start, settings["default_capacity"]))

        # Serialize bookings competing for this time slot.
        cursor.execute("""
            SELECT capacity
            FROM pickup_slots
            WHERE pickup_start = %s
            FOR UPDATE
        """, (new_start,))
        slot = cursor.fetchone()

        cursor.execute("""
            SELECT COUNT(*) AS booked
            FROM pickup_appointments
            WHERE pickup_start = %s
              AND status = 'scheduled'
            FOR UPDATE
        """, (new_start,))
        booked = cursor.fetchone()["booked"]

        if booked >= slot["capacity"]:
            connection.rollback()
            return fail(
                "SLOT_FULL",
                "This pickup time is fully booked. Choose another slot.",
                409,
            )

        cursor.execute("""
            UPDATE pickup_appointments
            SET pickup_start = %s,
                pickup_end = %s
            WHERE id = %s AND status = 'scheduled'
        """, (new_start, new_end, appointment_id))

        if cursor.rowcount != 1:
            connection.rollback()
            return fail(
                "CONFLICT",
                "Appointment changed. Please refresh.",
                409,
            )

        add_audit(
            cursor,
            appointment["package_id"],
            resident_id,
            "status_changed",
            {
                "appointment_id": appointment_id,
                "pickup_start": old_start.isoformat(),
            },
            {
                "appointment_id": appointment_id,
                "pickup_start": new_start.isoformat(),
            },
        )

        connection.commit()

        cursor.execute("""
            SELECT id, package_id, resident_id,
                   pickup_start, pickup_end, status, created_at
            FROM pickup_appointments
            WHERE id = %s
        """, (appointment_id,))

        return jsonify({
            "success": True,
            "appointment": serialize(cursor.fetchone()),
        }), 200

    except Error:
        if connection is not None:
            connection.rollback()
        current_app.logger.exception("Could not reschedule appointment")
        return fail(
            "DATABASE_ERROR",
            "Could not reschedule pickup.",
            500,
        )
    finally:
        if cursor is not None:
            cursor.close()
        if connection is not None and connection.is_connected():
            connection.close()
