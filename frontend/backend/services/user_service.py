from utils.passwords import hash_password

# Hardcoded test users until the database is connected.
# Passwords are "password123" hashed with werkzeug scrypt.
_TEST_PASSWORD_HASH = hash_password("password123")

_MOCK_USERS = [
    {
        "id": 1,
        "name": "Maya Chen",
        "email": "resident@example.com",
        "password_hash": _TEST_PASSWORD_HASH,
        "role": "resident",
    },
    {
        "id": 2,
        "name": "Alex Morgan",
        "email": "staff@example.com",
        "password_hash": _TEST_PASSWORD_HASH,
        "role": "staff",
    },
]


def find_user_by_email(email):
    """Return a mock user dict or None."""
    if not email:
        return None
    email = email.strip().lower()
    for user in _MOCK_USERS:
        if user["email"] == email:
            return user
    return None
