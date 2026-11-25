import mysql.connector
from mysql.connector import Error

from config.settings import Config


class DatabaseUnavailable(RuntimeError):
    """The database is not configured or could not be reached.

    Subclasses RuntimeError so routes that already catch RuntimeError keep
    working; anything else is turned into a 503 by the handler in app.py.
    """


def get_db_connection():
    """Open one connection for the current request.

    Callers close it in a finally block. Nothing is pooled or kept at
    module level, so this is safe on serverless hosts where instances
    are frozen and thawed between requests.
    """
    # Make sure the required database settings are available first
    if not all([
        Config.DB_HOST,
        Config.DB_NAME,
        Config.DB_USER
    ]):
        raise DatabaseUnavailable(
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
            # Read and write TIMESTAMP columns as UTC on every host, so
            # arrived_at / changed_at are true instants (see utils/clock.py).
            "time_zone": "+00:00",
            # Fail fast instead of hanging a serverless function.
            "connection_timeout": 10,
        }

        # Hosted MySQL (TiDB Cloud, PlanetScale, ...) requires TLS.
        # DB_SSL_CA may point at a CA bundle; without it we use certifi's,
        # which is the same on Windows, macOS, Linux and Vercel.
        if Config.DB_SSL:
            ca_bundle = Config.DB_SSL_CA
            if not ca_bundle:
                import certifi
                ca_bundle = certifi.where()

            options["ssl_disabled"] = False
            options["ssl_verify_cert"] = True
            options["ssl_verify_identity"] = True
            options["ssl_ca"] = ca_bundle

        connection = mysql.connector.connect(**options)

        # Return the connection so our services can use it
        return connection

    except Error as error:
        # Keep the database error in one place instead of handling it everywhere
        raise DatabaseUnavailable(
            f"Could not connect to the database: {error}"
        ) from error
