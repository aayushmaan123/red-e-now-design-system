
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

packages_bp = Blueprint("packages", __name__)

# Temporary storage until the database is connected.
packages = []
next_package_id = 1

VALID_STATUSES = {
    "received",
    "available",
    "scheduled",
    "prepared",
    "picked_up"
}


def error_response(code, message, status):
    return jsonify({
        "success": False,
        "error": {
            "code": code,
            "message": message
        }
    }), status


def staff_only():
    return get_jwt().get("role") == "staff"


@packages_bp.route("/api/packages", methods=["POST"])
@jwt_required()
def create_package():
    global next_package_id

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

    if not isinstance(carrier_name, str) or not carrier_name.strip():
        return error_response(
            "VALIDATION_ERROR", "Carrier name is required.", 400
        )

    if not isinstance(tracking_code, str) or not tracking_code.strip():
        return error_response(
            "VALIDATION_ERROR", "Tracking code is required.", 400
        )

    if type(resident_id) is not int or resident_id <= 0:
        return error_response(
            "VALIDATION_ERROR", "A valid resident ID is required.", 400
        )

    if not isinstance(description, str):
        return error_response(
            "VALIDATION_ERROR", "Description must be text.", 400
        )

    if any(p["tracking_code"] == tracking_code.strip() for p in packages):
        return error_response(
            "CONFLICT", "Tracking code already exists.", 409
        )

    package = {
        "id": next_package_id,
        "carrier_name": carrier_name.strip(),
        "tracking_code": tracking_code.strip(),
        "resident_id": resident_id,
        "resident_name": None,
        "resident_unit": None,
        "description": description.strip(),
        "status": "received",
        "arrived_at": datetime.now(timezone.utc).isoformat(),
        "registered_by": int(get_jwt_identity())
    }

    packages.append(package)
    next_package_id += 1

    return jsonify({
        "success": True,
        "package": package
    }), 201


@packages_bp.route("/api/packages", methods=["GET"])
@jwt_required()
def list_packages():
    if not staff_only():
        return error_response(
            "FORBIDDEN", "Staff access required.", 403
        )

    status = request.args.get("status")
    search = request.args.get("search", "").strip().lower()

    if status and status not in VALID_STATUSES:
        return error_response(
            "VALIDATION_ERROR", "Invalid package status.", 400
        )

    results = packages

    if status:
        results = [p for p in results if p["status"] == status]

    if search:
        results = [
            p for p in results
            if search in p["tracking_code"].lower()
            or search in p["carrier_name"].lower()
        ]

    return jsonify({
        "success": True,
        "packages": results
    }), 200


@packages_bp.route("/api/packages/<int:package_id>", methods=["GET"])
@jwt_required()
def get_package(package_id):
    if not staff_only():
        return error_response(
            "FORBIDDEN", "Staff access required.", 403
        )

    package = next(
        (p for p in packages if p["id"] == package_id), None
    )

    if package is None:
        return error_response(
            "NOT_FOUND", "Package not found.", 404
        )

    return jsonify({
        "success": True,
        "package": package
    }), 200


@packages_bp.route("/api/packages/<int:package_id>", methods=["PUT"])
@jwt_required()
def update_package(package_id):
    if not staff_only():
        return error_response(
            "FORBIDDEN", "Staff access required.", 403
        )

    package = next(
        (p for p in packages if p["id"] == package_id), None
    )

    if package is None:
        return error_response(
            "NOT_FOUND", "Package not found.", 404
        )

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return error_response(
            "VALIDATION_ERROR", "A JSON object is required.", 400
        )

    status = data.get("status")

    if status not in VALID_STATUSES:
        return error_response(
            "VALIDATION_ERROR", "Invalid package status.", 400
        )

    # Only permit forward progress through package statuses.
    allowed_transitions = {
        "received": {"available"},
        "available": {"scheduled"},
        "scheduled": {"prepared"},
        "prepared": {"picked_up"},
        "picked_up": set()
    }

    current_status = package["status"]

    if status != current_status and status not in allowed_transitions[current_status]:
        return error_response(
            "INVALID_STATUS_TRANSITION",
            "This package status change is not allowed.",
            409
        )

    package["status"] = status

    return jsonify({
        "success": True,
        "package": package
    }), 200


@packages_bp.route("/api/my-packages", methods=["GET"])
@jwt_required()
def my_packages():
    if get_jwt().get("role") != "resident":
        return error_response(
            "FORBIDDEN", "Resident access required.", 403
        )

    resident_id = int(get_jwt_identity())

    results = [
        p for p in packages
        if p["resident_id"] == resident_id
    ]

    return jsonify({
        "success": True,
        "packages": results
    }), 200
