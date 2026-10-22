
import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from routes.auth import auth_bp
from routes.packages import packages_bp


# Load environment variables from the backend .env file.
load_dotenv()


def create_app():
    app = Flask(__name__)

    # JWT settings for resident and staff login.
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

    if not app.config["JWT_SECRET_KEY"]:
        raise RuntimeError("JWT_SECRET_KEY is missing from the .env file.")

    # Allow requests from the frontend.
    frontend_origin = os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:3000"
    )

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [frontend_origin]
            }
        },
        allow_headers=["Content-Type", "Authorization"]
    )

    # Enable JWT authentication.
    jwt = JWTManager(app)

    # Register our API routes.
    app.register_blueprint(auth_bp)
    app.register_blueprint(packages_bp)

    # Check whether the backend is running.
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "success": True,
            "message": "RED-E-NOW backend is running."
        }), 200

    # Return JSON when a route does not exist.
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "The requested endpoint was not found."
            }
        }), 404

    # Return JSON when an HTTP method is not allowed.
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "METHOD_NOT_ALLOWED",
                "message": "This HTTP method is not allowed."
            }
        }), 405

    # Return JSON for unexpected server errors.
    @app.errorhandler(500)
    def internal_server_error(error):
        app.logger.exception("An internal server error occurred.")

        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred."
            }
        }), 500

    # Return JSON when the JWT is missing.
    @jwt.unauthorized_loader
    def missing_token(message):
        return jsonify({
            "success": False,
            "error": {
                "code": "MISSING_TOKEN",
                "message": message
            }
        }), 401

    # Return JSON when the JWT is invalid.
    @jwt.invalid_token_loader
    def invalid_token(message):
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_TOKEN",
                "message": message
            }
        }), 422

    # Return JSON when the JWT has expired.
    @jwt.expired_token_loader
    def expired_token(jwt_header, jwt_payload):
        return jsonify({
            "success": False,
            "error": {
                "code": "TOKEN_EXPIRED",
                "message": "Your login session has expired."
            }
        }), 401

    return app


app = create_app()


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "False").lower() == "true"

    app.run(
        host=host,
        port=port,
        debug=debug
    )
