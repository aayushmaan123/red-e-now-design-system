
import json
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from mysql.connector import Error, IntegrityError

from services.database import get_db_connection


packages_bp = Blueprint("packages", __name__)

VALID_STATUSES = (
    "received",
    "available",
    "scheduled",
    "prepared",
    "picked_up",
)

ALLOWED_TRANSITIONS = {
    "received": {"available"},
    "available": {"scheduled"},
    "scheduled": {"prepared"},
    "prepared": {"picked_up"},
    "picked_up": set(),
}

PACKAGE_SELECT = """
    SELECT
        p.id,
        p.carrier_name,
        p.tracking_code,
        p.resident_id,
        r.name AS resident_name,
        r.unit AS resident_unit,
        p.description,
        p.location_code,
        p.status,
        p.has_exception,
        p.arrived_at,
        p.registered_by
    FROM packages AS p
    JOIN users AS r ON r.id = p.resident_id
"""


def error_response(code, message, status):
    return jsonify({
        "success": False,
        "error": {"code": code, "message": message},
    }), status


def staff_only():
    return get_jwt().get("role") == "staff"


def resident_only():
    return get_jwt().get("role") == "resident"


def serialize_package(package):
    if package is None:
        return None

    result = dict(package)
    arrived_at = result.get("arrived_at")

    if isinstance(arrived_at, datetime):
        result["arrived_at"] = arrived_at.replace(
            tzinfo=timezone.utc
        ).isoformat()

    if result.get("description") is None:
        result["description"] = ""

    return result


def fetch_package(cursor, package_id):
    cursor.execute(
        PACKAGE_SELECT + " WHERE p.id = %s",
        (package_id,),
    )
    return serialize_package(cursor.fetchone())


def close_resources(cursor, connection):
    if cursor is not None:
        cursor.close()

    if connection is not None and connection.is_connected():
        connection.close()


def database_error(error):
    current_app.logger.error(
        "Package database operation failed: %s", error
    )
    return error_response(
        "DATABASE_ERROR",
        "The database operation could not be completed.",
        500,
    )


def add_audit(cursor, package_id, actor_id, action, old, new):
    cursor.execute(
        """
        INSERT INTO package_audit_log
            (package_id, changed_by, action, old_values, new_values)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            package_id,
            actor_id,
            action,
            json.dumps(old) if old is not None else None,
            json.dumps(new) if new is not None else None,
        ),
    )


@packages_bp.route("/api/packages", methods=["POST"])
@jwt_required()
def create_package():
    if not staff_only():
        return error_response(
            "FORBIDDEN", "Staff access required.", 403
        )

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return error_response(
            "VALIDATION_ERROR", "A JSON object is required.", 400
        )

    carrier_name = data.get("carrier_name")
    tracking_code = data.get("tracking_code")
    resident_id = data.get("resident_id")
    description = data.get("description", "")
    location_code = data.get("location_code")

    for field, value, max_length in (
        ("Carrier name", carrier_name, 50),
        ("Tracking code", tracking_code, 100),
        ("Storage location", location_code, 50),
    ):
        if not isinstance(value, str) or not value.strip():
            return error_response(
                "VALIDATION_ERROR", f"{field} is required.", 400
            )
        if len(value.strip()) > max_length:
            return error_response(
                "VALIDATION_ERROR", f"{field} is too long.", 400
            )

    if type(resident_id) is not int or resident_id <= 0:
        return error_response(
            "VALIDATION_ERROR",
            "A valid resident ID is required.",
            400,
        )

    if not isinstance(description, str):
        return error_response(
            "VALIDATION_ERROR", "Description must be text.", 400
        )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT id FROM users WHERE id = %s AND role = 'resident'",
            (resident_id,),
        )

        if cursor.fetchone() is None:
            return error_response(
                "VALIDATION_ERROR",
                "The selected resident does not exist.",
                400,
            )

        cursor.execute(
            "SELECT id FROM packages WHERE tracking_code = %s LIMIT 1",
            (tracking_code.strip(),),
        )

        if cursor.fetchone() is not None:
            return error_response(
                "CONFLICT", "Tracking code already exists.", 409
            )

        actor_id = int(get_jwt_identity())

        cursor.execute(
            """
            INSERT INTO packages (
                carrier_name,
                tracking_code,
                resident_id,
                description,
                location_code,
                status,
                registered_by
            )
            VALUES (%s, %s, %s, %s, %s, 'received', %s)
            """,
            (
                carrier_name.strip(),
                tracking_code.strip(),
                resident_id,
                description.strip(),
                location_code.strip(),
                actor_id,
            ),
        )

        package_id = cursor.lastrowid
        package = fetch_package(cursor, package_id)

        add_audit(
            cursor, package_id, actor_id,
            "created", None, package
        )

        connection.commit()

        return jsonify({
            "success": True,
            "package": package,
        }), 201

    except IntegrityError as error:
        if connection is not None:
            connection.rollback()
        current_app.logger.warning("Package conflict: %s", error)
        return error_response(
            "CONFLICT", "Package conflicts with existing data.", 409
        )

    except (Error, RuntimeError, ValueError) as error:
        if connection is not None:
            connection.rollback()
        return database_error(error)

    finally:
        close_resources(cursor, connection)


@packages_bp.route("/api/packages", methods=["GET"])
@jwt_required()
def list_packages():
    if not staff_only():
        return error_response(
            "FORBIDDEN", "Staff access required.", 403
        )

    status = request.args.get("status")
    search = request.args.get("search", "").strip()

    if status and status not in VALID_STATUSES:
        return error_response(
            "VALIDATION_ERROR", "Invalid package status.", 400
        )

    conditions = []
    params = []

    if status:
        conditions.append("p.status = %s")
        params.append(status)

    if search:
        conditions.append("""
            (
                p.tracking_code LIKE %s
                OR p.carrier_name LIKE %s
                OR r.name LIKE %s
                OR r.unit LIKE %s
                OR p.location_code LIKE %s
            )
        """)
        params.extend([f"%{search}%"] * 5)

    query = PACKAGE_SELECT

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY p.arrived_at DESC, p.id DESC"

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, tuple(params))

        packages = [
            serialize_package(row)
            for row in cursor.fetchall()
        ]

        return jsonify({
            "success": True,
            "packages": packages,
        }), 200

    except (Error, RuntimeError) as error:
        return database_error(error)

    finally:
        close_resources(cursor, connection)


@packages_bp.route("/api/packages/<int:package_id>", methods=["GET"])
@jwt_required()
def get_package(package_id):
    if not staff_only():
        return error_response(
            "FORBIDDEN", "Staff access required.", 403
        )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        package = fetch_package(cursor, package_id)

        if package is None:
            return error_response(
                "NOT_FOUND", "Package not found.", 404
            )

        return jsonify({
            "success": True,
            "package": package,
        }), 200

    except (Error, RuntimeError) as error:
        return database_error(error)

    finally:
        close_resources(cursor, connection)


@packages_bp.route("/api/packages/<int:package_id>", methods=["PUT"])
@jwt_required()
def update_package(package_id):
    if not staff_only():
        return error_response(
            "FORBIDDEN", "Staff access required.", 403
        )

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return error_response(
            "VALIDATION_ERROR", "A JSON object is required.", 400
        )

    editable_fields = (
        "status",
        "carrier_name",
        "tracking_code",
        "description",
        "location_code",
    )

    updates = {}

    for field in editable_fields:
        if field not in data:
            continue

        value = data[field]

        if field == "status":
            if not isinstance(value, str) or value not in VALID_STATUSES:
                return error_response(
                    "VALIDATION_ERROR", "Invalid package status.", 400
                )

        elif field == "description":
            if not isinstance(value, str):
                return error_response(
                    "VALIDATION_ERROR", "Description must be text.", 400
                )
            value = value.strip()

        else:
            max_length = 100 if field == "tracking_code" else 50

            if not isinstance(value, str) or not value.strip():
                return error_response(
                    "VALIDATION_ERROR",
                    f"{field} must be nonempty text.",
                    400,
                )

            value = value.strip()

            if len(value) > max_length:
                return error_response(
                    "VALIDATION_ERROR",
                    f"{field} is too long.",
                    400,
                )

        updates[field] = value

    if not updates:
        return error_response(
            "VALIDATION_ERROR",
            "No editable package fields were provided.",
            400,
        )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id, status, carrier_name, tracking_code,
                description, location_code
            FROM packages
            WHERE id = %s
            FOR UPDATE
            """,
            (package_id,),
        )

        existing = cursor.fetchone()

        if existing is None:
            connection.rollback()
            return error_response(
                "NOT_FOUND", "Package not found.", 404
            )

        if "status" in updates:
            old_status = existing["status"]
            new_status = updates["status"]

            # Sprint 4: completing pickup requires the verified
            # handoff workflow, not a generic package update.
            if new_status == "picked_up" and old_status != "picked_up":
                connection.rollback()
                return error_response(
                    "HANDOFF_REQUIRED",
                    "Complete pickup through the verified handoff workflow.",
                    409,
                )

            if (
                new_status != old_status
                and new_status not in ALLOWED_TRANSITIONS[old_status]
            ):
                connection.rollback()
                return error_response(
                    "INVALID_STATUS_TRANSITION",
                    "This package status change is not allowed.",
                    409,
                )

        # Sprint 3: scheduling must happen through the appointment API.
        if (
            updates.get("status") == "scheduled"
            and existing["status"] != "scheduled"
        ):
            connection.rollback()
            return error_response(
                "APPOINTMENT_REQUIRED",
                "Schedule pickups through the resident appointment system.",
                409,
            )

        # Staff may prepare only packages with an active appointment.
        if (
            updates.get("status") == "prepared"
            and updates["status"] != existing["status"]
        ):
            cursor.execute(
                """
                SELECT id
                FROM pickup_appointments
                WHERE package_id = %s
                  AND status = 'scheduled'
                LIMIT 1
                FOR UPDATE
                """,
                (package_id,),
            )

            if cursor.fetchone() is None:
                connection.rollback()
                return error_response(
                    "APPOINTMENT_REQUIRED",
                    "An active pickup appointment is required.",
                    409,
                )

        if "tracking_code" in updates:
            cursor.execute(
                """
                SELECT id FROM packages
                WHERE tracking_code = %s AND id <> %s
                LIMIT 1
                """,
                (updates["tracking_code"], package_id),
            )

            if cursor.fetchone() is not None:
                connection.rollback()
                return error_response(
                    "CONFLICT",
                    "Tracking code already exists.",
                    409,
                )

        changed_old = {
            field: existing[field]
            for field in updates
            if existing[field] != updates[field]
        }

        changed_new = {
            field: updates[field]
            for field in changed_old
        }

        if changed_new:
            assignments = ", ".join(
                f"{field} = %s" for field in changed_new
            )

            cursor.execute(
                f"UPDATE packages SET {assignments} WHERE id = %s",
                tuple(changed_new.values()) + (package_id,),
            )

            action = (
                "status_changed"
                if "status" in changed_new
                else "updated"
            )

            add_audit(
                cursor,
                package_id,
                int(get_jwt_identity()),
                action,
                changed_old,
                changed_new,
            )

        connection.commit()
        package = fetch_package(cursor, package_id)

        return jsonify({
            "success": True,
            "package": package,
        }), 200

    except IntegrityError as error:
        if connection is not None:
            connection.rollback()
        current_app.logger.warning("Package conflict: %s", error)
        return error_response(
            "CONFLICT",
            "Package update conflicts with existing data.",
            409,
        )

    except (Error, RuntimeError) as error:
        if connection is not None:
            connection.rollback()
        return database_error(error)

    finally:
        close_resources(cursor, connection)


@packages_bp.route(
    "/api/packages/<int:package_id>/audit",
    methods=["GET"],
)
@jwt_required()
def package_audit(package_id):
    if not staff_only():
        return error_response(
            "FORBIDDEN", "Staff access required.", 403
        )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        if fetch_package(cursor, package_id) is None:
            return error_response(
                "NOT_FOUND", "Package not found.", 404
            )

        cursor.execute(
            """
            SELECT
                a.id,
                a.package_id,
                a.changed_by,
                u.name AS changed_by_name,
                a.action,
                a.old_values,
                a.new_values,
                a.changed_at
            FROM package_audit_log AS a
            JOIN users AS u ON u.id = a.changed_by
            WHERE a.package_id = %s
            ORDER BY a.changed_at DESC, a.id DESC
            """,
            (package_id,),
        )

        events = cursor.fetchall()

        for event in events:
            changed_at = event["changed_at"]

            if isinstance(changed_at, datetime):
                event["changed_at"] = changed_at.replace(
                    tzinfo=timezone.utc
                ).isoformat()

            for key in ("old_values", "new_values"):
                if isinstance(event[key], str):
                    event[key] = json.loads(event[key])

        return jsonify({
            "success": True,
            "audit": events,
        }), 200

    except (Error, RuntimeError, ValueError) as error:
        return database_error(error)

    finally:
        close_resources(cursor, connection)


@packages_bp.route("/api/my-packages", methods=["GET"])
@jwt_required()
def my_packages():
    if not resident_only():
        return error_response(
            "FORBIDDEN", "Resident access required.", 403
        )

    resident_id = int(get_jwt_identity())

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            PACKAGE_SELECT + """
                WHERE p.resident_id = %s
                ORDER BY p.arrived_at DESC, p.id DESC
            """,
            (resident_id,),
        )

        packages = [
            serialize_package(row)
            for row in cursor.fetchall()
        ]

        return jsonify({
            "success": True,
            "packages": packages,
        }), 200

    except (Error, RuntimeError) as error:
        return database_error(error)

    finally:
        close_resources(cursor, connection)
