
import os
import secrets
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager

# Bring in all the routes our backend uses.
from routes.handoff import handoff_bp
from routes.auth import auth_bp
from routes.packages import packages_bp
from routes.residents import residents_bp
from routes.appointments import appointments_bp
from routes.scheduling import scheduling_bp
from services.database import DatabaseUnavailable, get_db_connection
from utils.rate_limit import limiter


# Grab our local settings from the .env file.
# This keeps passwords and secret keys out of the code.
load_dotenv()

# The API cannot do anything useful without these.
REQUIRED_SETTINGS = ("JWT_SECRET_KEY", "DB_HOST", "DB_NAME", "DB_USER")


def missing_settings():
    return [
        name for name in REQUIRED_SETTINGS
        if not os.getenv(name, "").strip()
    ]


def create_app():
    # This is where our Flask application gets set up.
    app = Flask(__name__)

    # JWT is what keeps users logged in when they make API requests.
    # We need a secret key so nobody can fake a login token.
    #
    # A missing setting must not crash the import: on a serverless host
    # that turns every request into an opaque 500. The app still starts
    # and answers every /api request with a clear 503 instead (see
    # require_configuration below). The throwaway key is never used to
    # issue a token because no request gets past that check.
    app.config["JWT_SECRET_KEY"] = (
        os.getenv("JWT_SECRET_KEY", "").strip() or secrets.token_urlsafe(48)
    )

    if missing_settings():
        app.logger.error(
            "Missing configuration: %s", ", ".join(missing_settings())
        )

    # How long a login lasts before the user must sign in again.
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(
        hours=int(os.getenv("JWT_EXPIRES_HOURS", "12"))
    )

    # Allow our React frontend to communicate with Flask.
    # Our current Vite frontend runs on port 8080.
    # FRONTEND_ORIGIN may list several origins separated by commas
    # (e.g. local dev + the Vercel production URL).
    # A wildcard is never accepted. To allow preview deployments, set
    # FRONTEND_ORIGIN_REGEX to one explicit pattern, for example
    # https://red-e-now-[a-z0-9-]+-yourteam\.vercel\.app
    frontend_origins = [
        origin.strip().rstrip("/")
        for origin in os.getenv(
            "FRONTEND_ORIGIN",
            "http://localhost:8080"
        ).split(",")
        if origin.strip() and "*" not in origin
    ]

    origin_pattern = os.getenv("FRONTEND_ORIGIN_REGEX", "").strip()
    if origin_pattern and origin_pattern not in ("*", ".*", "^.*$"):
        frontend_origins.append(origin_pattern)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": frontend_origins
            }
        },
        allow_headers=["Content-Type", "Authorization"]
    )

    # Turn on JWT authentication for protected routes.
    jwt = JWTManager(app)

    # Per-IP limits on login and register (see utils/rate_limit.py).
    limiter.init_app(app)

    # Connect all our API routes to the Flask application.
    # Auth handles login, packages handles package management,
    # and residents lets staff find real residents from MySQL.
    app.register_blueprint(auth_bp)
    app.register_blueprint(packages_bp)
    app.register_blueprint(residents_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(handoff_bp)
    app.register_blueprint(scheduling_bp)

    # Refuse to serve the API until it is configured, and say what is
    # missing (names only, never values).
    @app.before_request
    def require_configuration():
        missing = missing_settings()
        if missing and request.method != "OPTIONS":
            return jsonify({
                "success": False,
                "error": {
                    "code": "NOT_CONFIGURED",
                    "message": "The API is missing configuration: "
                               + ", ".join(missing) + "."
                }
            }), 503
        return None

    # A quick way to check that the backend is running.
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "success": True,
            "message": "RED-E-NOW backend is running."
        }), 200

    # Same, plus one round trip to MySQL. Used after a deploy.
    @app.route("/api/health/db", methods=["GET"])
    def health_db():
        connection = get_db_connection()
        try:
            cursor = connection.cursor()
            cursor.execute("SELECT COUNT(*) FROM buildings")
            cursor.fetchone()
            cursor.close()
        finally:
            connection.close()

        return jsonify({
            "success": True,
            "message": "Database connection is working."
        }), 200

    # The database could not be reached (wrong settings, TLS, paused
    # instance). Routes that do not handle this themselves end up here.
    @app.errorhandler(DatabaseUnavailable)
    def database_unavailable(error):
        app.logger.error("Database unavailable: %s", error)
        return jsonify({
            "success": False,
            "error": {
                "code": "DATABASE_UNAVAILABLE",
                "message": "The database is not reachable right now. "
                           "Try again in a moment."
            }
        }), 503

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

    # Too many login or signup attempts from one address.
    @app.errorhandler(429)
    def rate_limited(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "RATE_LIMITED",
                "message": "Too many attempts. Wait a minute and try again."
            }
        }), 429

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
