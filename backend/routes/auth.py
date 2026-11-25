
from flask import Blueprint, jsonify, request
import re

from flask_jwt_extended import get_jwt_identity, jwt_required

from services.user_service import (
    DuplicateEmailError,
    building_code_is_valid,
    create_resident,
    find_user_by_email,
    find_user_by_id,
)
from services.auth_service import authenticate_user, issue_token
from utils.passwords import hash_password

from utils.auth import role_required
from utils.rate_limit import LOGIN_LIMIT, REGISTER_LIMIT, limiter

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
@limiter.limit(LOGIN_LIMIT, methods=["POST"])
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
            "role": user["role"],
            "unit": user.get("unit")
        }
    }), 200


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8


def _error(code, message, status):
    return jsonify({
        "success": False,
        "error": {"code": code, "message": message}
    }), status


def _public_user(user):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "unit": user.get("unit"),
    }


@auth_bp.route("/register", methods=["POST"])
@limiter.limit(REGISTER_LIMIT, methods=["POST"])
def register():
    # Self-service resident signup, gated by the building's registration code.
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return _error("VALIDATION_ERROR", "Request body must be JSON.", 400)

    fields = {}
    for key in ("name", "email", "password", "unit", "building_code"):
        value = data.get(key, "")
        if not isinstance(value, str):
            return _error("VALIDATION_ERROR", f"{key} must be text.", 400)
        fields[key] = value

    name = fields["name"].strip()
    email = fields["email"].strip().lower()
    password = fields["password"]
    unit = fields["unit"].strip().upper()
    building_code = fields["building_code"].strip()

    if not name or not email or not password or not unit or not building_code:
        return _error(
            "VALIDATION_ERROR",
            "Name, email, password, unit, and building code are required.",
            400,
        )

    if len(name) > 100:
        return _error("VALIDATION_ERROR", "Name is too long.", 400)

    if len(email) > 100 or not EMAIL_PATTERN.match(email):
        return _error("VALIDATION_ERROR", "Enter a valid email address.", 400)

    if len(unit) > 20:
        return _error("VALIDATION_ERROR", "Unit is too long.", 400)

    if len(password) < MIN_PASSWORD_LENGTH:
        return _error(
            "VALIDATION_ERROR",
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters.",
            400,
        )

    try:
        if not building_code_is_valid(building_code):
            return _error(
                "INVALID_BUILDING_CODE",
                "That building code is not recognized. Ask your front desk for it.",
                400,
            )

        user = create_resident(name, email, hash_password(password), unit)
    except DuplicateEmailError:
        return _error(
            "EMAIL_TAKEN",
            "An account with this email already exists.",
            409,
        )
    except (NotImplementedError, RuntimeError):
        return _error(
            "AUTH_SERVICE_UNAVAILABLE",
            "Registration is currently unavailable.",
            503,
        )

    return jsonify({
        "success": True,
        "access_token": issue_token(user),
        "user": _public_user(user),
    }), 201


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    # Lets the frontend restore a session from a stored token.
    try:
        user = find_user_by_id(get_jwt_identity())
    except (NotImplementedError, RuntimeError):
        return _error(
            "AUTH_SERVICE_UNAVAILABLE",
            "Login service is currently unavailable.",
            503,
        )

    if not user:
        return _error("USER_NOT_FOUND", "This account no longer exists.", 401)

    return jsonify({"success": True, "user": _public_user(user)}), 200


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
