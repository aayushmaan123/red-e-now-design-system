from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from mysql.connector import Error

from services.database import get_db_connection
from routes.packages import add_audit
from utils.clock import building_now, check_in_opens_at


handoff_bp = Blueprint("handoff", __name__)


def fail(code, message, status):
    return jsonify({
        "success": False,
        "error": {"code": code, "message": message},
    }), status


def close_db(cursor, connection):
    if cursor is not None:
        cursor.close()
    if connection is not None and connection.is_connected():
        connection.close()


def load_handoff(cursor, appointment_id):
    # Lock the package first, matching the existing appointment workflow.
    cursor.execute(
        """
        SELECT package_id
        FROM pickup_appointments
        WHERE id = %s
        """,
        (appointment_id,),
    )
    found = cursor.fetchone()
    if found is None:
        return None, None

    cursor.execute(
        """
        SELECT id, status, has_exception, resident_id
        FROM packages
        WHERE id = %s
        FOR UPDATE
        """,
        (found["package_id"],),
    )
    package = cursor.fetchone()

    cursor.execute(
        """
        SELECT
            id, package_id, resident_id, pickup_start, pickup_end,
            status, checked_in_at, identity_verified_at,
            identity_verified_by, recipient_name, acknowledged_at,
            handed_off_at, signed_off_by, signoff_note
        FROM pickup_appointments
        WHERE id = %s
        FOR UPDATE
        """,
        (appointment_id,),
    )
    appointment = cursor.fetchone()
    return package, appointment


def run_handoff(appointment_id, operation):
    role = get_jwt().get("role")
    actor_id = int(get_jwt_identity())

    if operation == "check-in":
        if role != "resident":
            return fail("FORBIDDEN", "Resident access required.", 403)
    elif role != "staff":
        return fail("FORBIDDEN", "Staff access required.", 403)

    data = request.get_json(silent=True)
    if operation in ("verify-identity", "signoff"):
        if not isinstance(data, dict):
            return fail("VALIDATION_ERROR", "A JSON object is required.", 400)

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        connection.start_transaction()

        package, appointment = load_handoff(cursor, appointment_id)

        if appointment is None or package is None:
            connection.rollback()
            return fail("NOT_FOUND", "Appointment not found.", 404)

        if operation == "check-in" and appointment["resident_id"] != actor_id:
            connection.rollback()
            return fail("NOT_FOUND", "Appointment not found.", 404)

        if appointment["status"] != "scheduled":
            connection.rollback()
            return fail(
                "INVALID_APPOINTMENT_STATUS",
                "Only scheduled appointments can use the handoff workflow.",
                409,
            )

        if package["status"] != "prepared":
            connection.rollback()
            return fail(
                "PACKAGE_NOT_READY",
                "Staff must prepare the package before handoff.",
                409,
            )

        if package["has_exception"]:
            connection.rollback()
            return fail(
                "PACKAGE_EXCEPTION",
                "Resolve the package exception before handoff.",
                409,
            )

        # Building-local wall-clock time, never the server's own clock.
        now = building_now()

        if operation == "check-in":
            if appointment["checked_in_at"] is not None:
                connection.rollback()
                return fail("ALREADY_CHECKED_IN", "Already checked in.", 409)

            opens_at = check_in_opens_at(
                appointment["pickup_start"],
                appointment["pickup_end"],
            )

            if not (opens_at <= now <= appointment["pickup_end"]):
                connection.rollback()
                return fail(
                    "OUTSIDE_PICKUP_WINDOW",
                    "Check-in opens shortly before your pickup window "
                    "and closes when the window ends.",
                    409,
                )

            cursor.execute(
                """
                UPDATE pickup_appointments
                SET checked_in_at = %s
                WHERE id = %s
                """,
                (now, appointment_id),
            )

            add_audit(
                cursor, package["id"], actor_id, "updated",
                {"checked_in_at": None},
                {"checked_in_at": now.isoformat()},
            )
            message = "Checked in. Waiting for staff."

        elif operation == "verify-identity":
            if appointment["checked_in_at"] is None:
                connection.rollback()
                return fail("CHECK_IN_REQUIRED", "Resident must check in first.", 409)

            if appointment["identity_verified_at"] is not None:
                connection.rollback()
                return fail(
                    "ALREADY_VERIFIED",
                    "Identity has already been verified.",
                    409,
                )

            if data.get("identity_confirmed") is not True:
                connection.rollback()
                return fail(
                    "VERIFICATION_REQUIRED",
                    "Staff must explicitly confirm identity verification.",
                    400,
                )

            cursor.execute(
                """
                UPDATE pickup_appointments
                SET identity_verified_at = %s,
                    identity_verified_by = %s
                WHERE id = %s
                """,
                (now, actor_id, appointment_id),
            )

            add_audit(
                cursor, package["id"], actor_id, "updated",
                {"identity_verified_at": None},
                {
                    "identity_verified_at": now.isoformat(),
                    "identity_verified_by": actor_id,
                },
            )
            message = "Identity verification recorded."

        elif operation == "signoff":
            if appointment["checked_in_at"] is None:
                connection.rollback()
                return fail("CHECK_IN_REQUIRED", "Resident must check in first.", 409)

            if appointment["identity_verified_at"] is None:
                connection.rollback()
                return fail(
                    "IDENTITY_VERIFICATION_REQUIRED",
                    "Verify identity before recording acknowledgement.",
                    409,
                )

            if appointment["acknowledged_at"] is not None:
                connection.rollback()
                return fail(
                    "ALREADY_SIGNED_OFF",
                    "Acknowledgement has already been recorded.",
                    409,
                )

            recipient_name = data.get("recipient_name")
            if (
                not isinstance(recipient_name, str)
                or not recipient_name.strip()
                or len(recipient_name.strip()) > 150
            ):
                connection.rollback()
                return fail(
                    "VALIDATION_ERROR",
                    "Recipient name must be 1 to 150 characters.",
                    400,
                )

            if data.get("acknowledged") is not True:
                connection.rollback()
                return fail(
                    "ACKNOWLEDGEMENT_REQUIRED",
                    "The recipient must explicitly acknowledge receipt.",
                    400,
                )

            note = data.get("note", "")
            if not isinstance(note, str) or len(note) > 255:
                connection.rollback()
                return fail(
                    "VALIDATION_ERROR",
                    "Note must be text of at most 255 characters.",
                    400,
                )

            cursor.execute(
                """
                UPDATE pickup_appointments
                SET recipient_name = %s,
                    acknowledged_at = %s,
                    signed_off_by = %s,
                    signoff_note = %s
                WHERE id = %s
                """,
                (recipient_name.strip(), now, actor_id, note.strip(), appointment_id),
            )

            add_audit(
                cursor, package["id"], actor_id, "signed_off",
                None,
                {
                    "appointment_id": appointment_id,
                    "recipient_name": recipient_name.strip(),
                    "acknowledged_at": now.isoformat(),
                    "recorded_by_staff": actor_id,
                },
            )
            message = "Recipient acknowledgement recorded."

        elif operation == "complete":
            if (
                appointment["checked_in_at"] is None
                or appointment["identity_verified_at"] is None
                or appointment["acknowledged_at"] is None
                or appointment["signed_off_by"] is None
                or not appointment["recipient_name"]
            ):
                connection.rollback()
                return fail(
                    "HANDOFF_INCOMPLETE",
                    "Check-in, identity verification, and recipient acknowledgement "
                    "are all required before pickup completion.",
                    409,
                )

            cursor.execute(
                """
                UPDATE pickup_appointments
                SET status = 'completed',
                    handed_off_at = %s
                WHERE id = %s AND status = 'scheduled'
                """,
                (now, appointment_id),
            )

            cursor.execute(
                """
                UPDATE packages
                SET status = 'picked_up'
                WHERE id = %s AND status = 'prepared'
                """,
                (package["id"],),
            )

            add_audit(
                cursor, package["id"], actor_id, "status_changed",
                {"status": "prepared"},
                {
                    "status": "picked_up",
                    "appointment_id": appointment_id,
                    "handed_off_at": now.isoformat(),
                },
            )
            message = "Pickup completed successfully."

        else:
            connection.rollback()
            return fail("INVALID_OPERATION", "Invalid handoff operation.", 400)

        connection.commit()

        return jsonify({
            "success": True,
            "appointment_id": appointment_id,
            "package_id": package["id"],
            "operation": operation,
            "message": message,
            "timestamp": now.isoformat(),
        }), 200

    except (Error, RuntimeError, ValueError) as error:
        if connection is not None:
            connection.rollback()
        current_app.logger.error("Handoff failed: %s", error)
        return fail(
            "DATABASE_ERROR",
            "The handoff operation could not be completed.",
            500,
        )

    finally:
        close_db(cursor, connection)


@handoff_bp.route(
    "/api/appointments/<int:appointment_id>/check-in",
    methods=["POST"],
)
@jwt_required()
def check_in(appointment_id):
    return run_handoff(appointment_id, "check-in")


@handoff_bp.route(
    "/api/appointments/<int:appointment_id>/verify-identity",
    methods=["POST"],
)
@jwt_required()
def verify_identity(appointment_id):
    return run_handoff(appointment_id, "verify-identity")


@handoff_bp.route(
    "/api/appointments/<int:appointment_id>/signoff",
    methods=["POST"],
)
@jwt_required()
def signoff(appointment_id):
    return run_handoff(appointment_id, "signoff")


@handoff_bp.route(
    "/api/appointments/<int:appointment_id>/complete",
    methods=["POST"],
)
@jwt_required()
def complete(appointment_id):
    return run_handoff(appointment_id, "complete")
