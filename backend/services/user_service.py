
from services.database import get_db_connection


def find_user_by_email(email):
    """
    Find a user by email address.

    Returns:
        dict: User information if found.
        None: If no matching user exists.
    """

    if not isinstance(email, str) or not email.strip():
        return None

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        query = """
            SELECT
                id,
                name,
                email,
                password_hash,
                role,
                unit
            FROM users
            WHERE email = %s
            LIMIT 1
        """

        cursor.execute(query, (email.strip(),))
        user = cursor.fetchone()

        return user

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()
