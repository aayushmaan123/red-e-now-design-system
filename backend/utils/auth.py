from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request


def role_required(allowed_roles):
    # This decorator lets us protect routes based on the user's role
    def decorator(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            # Make sure the request has a valid JWT first
            verify_jwt_in_request()

            # Read the user's role from the JWT
            claims = get_jwt()
            user_role = claims.get("role")

            # Block the request if the user's role is not allowed
            if user_role not in allowed_roles:
                return jsonify({
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "You do not have permission to access this resource."
                    }
                }), 403

            # The role is allowed, so continue to the actual route
            return function(*args, **kwargs)

        return wrapper

    return decorator
