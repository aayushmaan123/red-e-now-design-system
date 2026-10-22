from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from services.auth_service import authenticate_user
from services.user_service import find_user_by_email
from utils.auth import role_required
from utils.validators import validate_login_data


# Keep authentication-related routes together
auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    # Read the JSON login information sent by the frontend
    data = request.get_json(silent=True)

    # Validate the request before touching the database
    is_valid, result = validate_login_data(data)

    if not is_valid:
        return jsonify({
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": result
            }
        }), 400

    try:
        # Ask the database layer for the account that owns this email
        user = find_user_by_email(result["email"])

        # Verify the password and create a token if the account is valid
        auth_result = authenticate_user(
            user,
            result["password"]
        )

        # Use the same response for an unknown email or wrong password
        if auth_result is None:
            return jsonify({
                "success": False,
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid email or password."
                }
            }), 401

        # Send the token and basic account information to the frontend
        return jsonify({
            "success": True,
            "access_token": auth_result["access_token"],
            "user": auth_result["user"]
        }), 200

    except (RuntimeError, NotImplementedError):
        # Authentication cannot finish until the database is available
        return jsonify({
            "success": False,
            "error": {
                "code": "AUTH_SERVICE_UNAVAILABLE",
                "message": "Authentication service is currently unavailable."
            }
        }), 503


@auth_bp.route("/protected-test", methods=["GET"])
@jwt_required()
def protected_test():
    # Get the user ID stored inside the authentication token
    user_id = get_jwt_identity()

    return jsonify({
        "success": True,
        "message": "You are authenticated.",
        "user_id": user_id
    }), 200


@auth_bp.route("/resident-test", methods=["GET"])
@role_required(["resident"])
def resident_test():
    # Only authenticated residents should reach this route
    return jsonify({
        "success": True,
        "message": "Resident access granted."
    }), 200


@auth_bp.route("/staff-test", methods=["GET"])
@role_required(["staff"])
def staff_test():
    # Only authenticated staff members should reach this route
    return jsonify({
        "success": True,
        "message": "Staff access granted."
    }), 200
