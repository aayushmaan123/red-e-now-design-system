import os

from dotenv import load_dotenv


# Load the values stored in our local .env file
load_dotenv()


class Config:
    # Basic settings used by the Flask development server
    DEBUG = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    HOST = os.getenv("HOST", "127.0.0.1")
    PORT = int(os.getenv("PORT", "5000"))

    # This controls which frontend is allowed to call our API
    FRONTEND_ORIGIN = os.getenv(
        "FRONTEND_ORIGIN",
        "http://localhost:5173"
    )

    # These values will be provided by the database teammate
    DB_HOST = os.getenv("DB_HOST", "")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_NAME = os.getenv("DB_NAME", "")
    DB_USER = os.getenv("DB_USER", "")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")

    # This secret is used to securely sign authentication tokens
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
