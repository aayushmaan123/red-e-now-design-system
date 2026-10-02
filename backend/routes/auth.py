from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from utils.auth import role_required


# Keep authentication-related routes together
auth_bp = Blueprint("auth", __name__)


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
