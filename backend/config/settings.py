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
