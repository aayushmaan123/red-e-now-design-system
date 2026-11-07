
import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# Bring in all the routes our backend uses.
from routes.auth import auth_bp
from routes.packages import packages_bp
from routes.residents import residents_bp
from routes.appointments import appointments_bp
from routes.scheduling import scheduling_bp


# Grab our local settings from the .env file.
# This keeps passwords and secret keys out of the code.
load_dotenv()


def create_app():
    # This is where our Flask application gets set up.
    app = Flask(__name__)

    # JWT is what keeps users logged in when they make API requests.
    # We need a secret key so nobody can fake a login token.
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

    if not app.config["JWT_SECRET_KEY"]:
        raise RuntimeError(
            "JWT_SECRET_KEY is missing from the .env file."
        )

    # Allow our React frontend to communicate with Flask.
    # Our current Vite frontend runs on port 8080.
    frontend_origin = os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:8080"
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

    # Turn on JWT authentication for protected routes.
    jwt = JWTManager(app)

    # Connect all our API routes to the Flask application.
    # Auth handles login, packages handles package management,
    # and residents lets staff find real residents from MySQL.
    app.register_blueprint(auth_bp)
    app.register_blueprint(packages_bp)
    app.register_blueprint(residents_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(scheduling_bp)

    # A quick way to check that the backend is running.
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "success": True,
            "message": "RED-E-NOW backend is running."
        }), 200

    # Give the frontend a clean JSON response for missing pages.
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "The requested endpoint was not found."
            }
        }), 404

    # This happens when someone uses the wrong request method.
    # For example, sending GET to an endpoint that only accepts POST.
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "METHOD_NOT_ALLOWED",
                "message": "This HTTP method is not allowed."
            }
        }), 405

    # Catch unexpected backend errors without exposing private details.
    @app.errorhandler(500)
    def internal_server_error(error):
        app.logger.exception(
            "An internal server error occurred."
        )

        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred."
            }
        }), 500

    # If someone forgets to send a JWT, return a helpful error.
    @jwt.unauthorized_loader
    def missing_token(message):
        return jsonify({
            "success": False,
            "error": {
                "code": "MISSING_TOKEN",
                "message": message
            }
        }), 401

    # Reject tokens that aren't valid.
    @jwt.invalid_token_loader
    def invalid_token(message):
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_TOKEN",
                "message": message
            }
        }), 422

    # Ask users to log in again when their JWT expires.
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


# Build the app so Flask can start serving requests.
app = create_app()


if __name__ == "__main__":
    # These settings control how Flask runs on our Ubuntu VM.
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "False").lower() == "true"

    app.run(
        host=host,
        port=port,
        debug=debug
    )
