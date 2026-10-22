
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from services.user_service import find_user_by_email
from services.auth_service import authenticate_user

from utils.auth import role_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    # Make sure the frontend sends JSON.
    if not request.is_json:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request body must be JSON."
            }
        }), 400

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid JSON data."
            }
        }), 400

    email = data.get("email", "")
    password = data.get("password", "")

    # Check the login fields.
    if not isinstance(email, str) or not isinstance(password, str):
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Email and password must be text."
            }
        }), 400

    email = email.strip().lower()

    if not email or not password:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Email and password are required."
            }
        }), 400

    # Look for the user in MySQL.
    try:
        user = find_user_by_email(email)
    except (NotImplementedError, RuntimeError):
        return jsonify({
            "success": False,
            "error": {
                "code": "AUTH_SERVICE_UNAVAILABLE",
                "message": "Login service is currently unavailable."
            }
        }), 503

    # Don't reveal whether the email exists.
    if not user:
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password."
            }
        }), 401

    # Verify the password and generate a JWT.
    auth_result = authenticate_user(user, password)

    if not auth_result:
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password."
            }
        }), 401

    # The frontend needs all four user fields.
    return jsonify({
        "success": True,
        "access_token": auth_result["access_token"],
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }), 200


@auth_bp.route("/protected-test", methods=["GET"])
@jwt_required()
def protected_test():
    return jsonify({
        "success": True,
        "message": "You are logged in."
    }), 200


@auth_bp.route("/resident-test", methods=["GET"])
@role_required("resident")
def resident_test():
    return jsonify({
        "success": True,
        "message": "Resident access granted."
    }), 200


@auth_bp.route("/staff-test", methods=["GET"])
@role_required("staff")
def staff_test():
    return jsonify({
        "success": True,
        "message": "Staff access granted."
    }), 200
