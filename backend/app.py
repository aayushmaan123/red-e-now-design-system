from flask import Flask

from routes.health import health_bp


def create_app():
    # Create the main Flask application
    app = Flask(__name__)

    # Register the health routes under the /api URL
    app.register_blueprint(health_bp, url_prefix="/api")

    return app


# Create the app so Flask can run it
app = create_app()


if __name__ == "__main__":
    # Run the development server on port 5000
    app.run(debug=True, host="0.0.0.0", port=5000)
