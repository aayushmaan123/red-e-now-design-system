
import secrets

from flask import Blueprint, current_app, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from mysql.connector import Error

from services.database import get_db_connection
from utils.passwords import hash_password


residents_bp = Blueprint("residents", __name__)

# Letters and digits that are hard to misread when the desk reads a
# temporary password aloud or writes it down (no 0/O, 1/l/I).
TEMP_PASSWORD_ALPHABET = (
    "abcdefghjkmnpqrstuvwxyz"
    "ABCDEFGHJKMNPQRSTUVWXYZ"
    "23456789"
)


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


def generate_temporary_password():
    # Three groups of four, e.g. "k7Qm-x2Hp-9dTr" (about 69 bits).
    groups = [
        "".join(secrets.choice(TEMP_PASSWORD_ALPHABET) for _ in range(4))
        for _ in range(3)
    ]
    return "-".join(groups)


@residents_bp.route("/api/residents", methods=["GET"])
@jwt_required()
def list_residents():
    if get_jwt().get("role") != "staff":
        return fail("FORBIDDEN", "Staff access required.", 403)

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, name, email, unit
            FROM users
            WHERE role = 'resident'
            ORDER BY name ASC, id ASC
        """)

        residents = cursor.fetchall()

        return jsonify({
            "success": True,
            "residents": residents
        }), 200

    except (Error, RuntimeError) as error:
        current_app.logger.error(
            "Resident lookup failed: %s", error
        )
        return fail("DATABASE_ERROR", "Unable to load residents.", 500)

    finally:
        close_db(cursor, connection)


@residents_bp.route(
    "/api/residents/<int:resident_id>/reset-password",
    methods=["POST"],
)
@jwt_required()
def reset_resident_password(resident_id):
    # The front desk issues a temporary password in person. There is no
    # email provider, so this is the only password recovery path.
    if get_jwt().get("role") != "staff":
        return fail("FORBIDDEN", "Staff access required.", 403)

    actor_id = int(get_jwt_identity())
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, name, email, unit
            FROM users
            WHERE id = %s AND role = 'resident'
            FOR UPDATE
            """,
            (resident_id,),
        )
        resident = cursor.fetchone()

        if resident is None:
            connection.rollback()
            return fail("NOT_FOUND", "Resident not found.", 404)

        temporary_password = generate_temporary_password()

        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (hash_password(temporary_password), resident_id),
        )

        cursor.execute(
            """
            INSERT INTO account_audit_log (user_id, changed_by, action)
            VALUES (%s, %s, 'password_reset')
            """,
            (resident_id, actor_id),
        )

        connection.commit()

        # Log who and for whom, never the password itself.
        current_app.logger.info(
            "Password reset for resident %s by staff %s",
            resident_id, actor_id,
        )

        response = jsonify({
            "success": True,
            "resident": resident,
            # Shown to staff once; only the hash is stored.
            "temporary_password": temporary_password,
        })
        response.headers["Cache-Control"] = "no-store"
        return response, 200

    except (Error, RuntimeError) as error:
        if connection is not None:
            connection.rollback()
        current_app.logger.error(
            "Password reset failed: %s", error
        )
        return fail(
            "DATABASE_ERROR",
            "The password could not be reset.",
            500,
        )

    finally:
        close_db(cursor, connection)
