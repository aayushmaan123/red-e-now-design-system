import mysql.connector
from mysql.connector import Error

from config.settings import Config


def get_db_connection():
    # Make sure the required database settings are available first
    if not all([
        Config.DB_HOST,
        Config.DB_NAME,
        Config.DB_USER
    ]):
        raise RuntimeError(
            "Database connection settings have not been configured yet."
        )

    try:
        # Create a new connection to the Red-E Now MySQL database
        options = {
            "host": Config.DB_HOST,
            "port": Config.DB_PORT,
            "database": Config.DB_NAME,
            "user": Config.DB_USER,
            "password": Config.DB_PASSWORD,
        }

        # Hosted databases (PlanetScale) require TLS.
        if Config.DB_SSL:
            options["ssl_disabled"] = False
            options["ssl_verify_identity"] = True
            if Config.DB_SSL_CA:
                options["ssl_ca"] = Config.DB_SSL_CA

        connection = mysql.connector.connect(**options)

        # Return the connection so our services can use it
        return connection

    except Error as error:
        # Keep the database error in one place instead of handling it everywhere
        raise RuntimeError(
            f"Could not connect to the database: {error}"
        ) from error
