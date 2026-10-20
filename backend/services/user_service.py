from services.database import get_db_connection


def find_user_by_email(email):
    # This function will eventually retrieve a user from the real database.
    # We are keeping the database-specific code here so our routes stay clean.

    connection = None
    cursor = None

    try:
        # Open a connection using our shared database service
        connection = get_db_connection()

        # Return database rows as dictionaries instead of tuples
        cursor = connection.cursor(dictionary=True)

        # The final SQL query will be added once the database schema is confirmed.
        # We do not want to guess table or column names owned by the database team.
        raise NotImplementedError(
            "User lookup is waiting for the finalized database schema."
        )

    finally:
        # Always close the cursor when one was successfully created
        if cursor is not None:
            cursor.close()

        # Always close the database connection when one was opened
        if connection is not None and connection.is_connected():
            connection.close()
