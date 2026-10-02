from flask import Flask

from config.settings import Config
from routes.health import health_bp


def create_app():
    # Create the main Flask application
    app = Flask(__name__)

    # Load our application settings from the Config class
    app.config.from_object(Config)

    # Register the health routes under the /api URL
    app.register_blueprint(health_bp, url_prefix="/api")

    return app


# Create the app so Flask can run it
app = create_app()


if __name__ == "__main__":
    # Use our environment settings when starting the development server
    app.run(
        debug=app.config["DEBUG"],
        host=app.config["HOST"],
        port=app.config["PORT"]
    )
