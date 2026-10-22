from flask import Blueprint, jsonify


# Keep health-check routes together in their own blueprint
health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    # This lets us quickly check that the backend is running
    return jsonify({
        "status": "ok",
        "service": "Red-E Now Backend"
    }), 200
