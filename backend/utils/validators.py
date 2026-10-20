import re


def validate_login_data(data):
    # Make sure the frontend actually sent JSON data
    if not isinstance(data, dict):
        return False, "A JSON request body is required."

    # Pull out the login fields and remove accidental spaces
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    # Both fields are required for login
    if not email or not password:
        return False, "Email and password are required."

    # Do a basic check that the email looks valid
    email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

    if not re.match(email_pattern, email):
        return False, "A valid email address is required."

    # The request has the basic information needed for login
    return True, {
        "email": email,
        "password": password
    }
