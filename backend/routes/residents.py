
from flask import Blueprint, current_app, jsonify
from flask_jwt_extended import get_jwt, jwt_required
from mysql.connector import Error

from services.database import get_db_connection


residents_bp = Blueprint("residents", __name__)


@residents_bp.route("/api/residents", methods=["GET"])
@jwt_required()
def list_residents():
    if get_jwt().get("role") != "staff":
        return jsonify({
            "success": False,
            "error": {
                "code": "FORBIDDEN",
                "message": "Staff access required."
            }
        }), 403

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, name, unit
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

        return jsonify({
            "success": False,
            "error": {
                "code": "DATABASE_ERROR",
                "message": "Unable to load residents."
            }
        }), 500

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()
