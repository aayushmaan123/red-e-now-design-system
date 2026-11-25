
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


def find_user_by_id(user_id):
    """
    Find a user by their numeric ID (used by GET /api/auth/me).

    Returns:
        dict: User information (without password hash) if found.
        None: If no matching user exists.
    """

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, name, email, role, unit
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        return cursor.fetchone()

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


def building_code_is_valid(code):
    """
    Check a building registration code (case-insensitive).

    Returns:
        bool: True when a building with this code exists.
    """

    if not isinstance(code, str) or not code.strip():
        return False

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id
            FROM buildings
            WHERE UPPER(registration_code) = UPPER(%s)
            LIMIT 1
            """,
            (code.strip(),),
        )
        return cursor.fetchone() is not None

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


class DuplicateEmailError(Exception):
    """Raised when a registration uses an email that already exists."""


def create_resident(name, email, password_hash, unit):
    """
    Insert a new resident account.

    Returns:
        dict: The created user (without password hash).

    Raises:
        DuplicateEmailError: If the email is already registered.
    """

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        try:
            cursor.execute(
                """
                INSERT INTO users (name, email, password_hash, role, unit)
                VALUES (%s, %s, %s, 'resident', %s)
                """,
                (name, email, password_hash, unit),
            )
        except Exception as error:
            # MySQL error 1062 = duplicate entry on the UNIQUE email key.
            if getattr(error, "errno", None) == 1062:
                raise DuplicateEmailError() from error
            raise

        connection.commit()

        return {
            "id": cursor.lastrowid,
            "name": name,
            "email": email,
            "role": "resident",
            "unit": unit,
        }

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()
