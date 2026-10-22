from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config.settings import Config
from routes.health import health_bp
from routes.auth import auth_bp
from utils.error_handlers import register_error_handlers


def create_app():
    # Create the main Flask application
    app = Flask(__name__)

    # Load our settings from the Config class
    app.config.from_object(Config)

    # Set up JWT authentication for protected API routes
    JWTManager(app)

    # Allow the frontend application to communicate with our API
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": app.config["FRONTEND_ORIGIN"]
            }
        }
    )

    # Register the health-check routes under /api
    app.register_blueprint(
        health_bp,
        url_prefix="/api"
    )
    # Register authentication routes under /api/auth
    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )


    # Register our shared JSON error handlers
    register_error_handlers(app)

    # Return the finished Flask application
    return app


# Create the application using our setup function
app = create_app()


if __name__ == "__main__":
    # Start the development server using our environment settings
    app.run(
        debug=app.config["DEBUG"],
        host=app.config["HOST"],
        port=app.config["PORT"]
    )
