
from flask_jwt_extended import create_access_token

from utils.passwords import verify_password


def authenticate_user(user, password):
    # A missing user or password cannot log in.
    if not user or not password:
        return None

    # Check the password against the stored hash.
    stored_hash = user.get("password_hash")

    if not stored_hash:
        return None

    if not verify_password(stored_hash, password):
        return None

    # Only our two supported roles can log in.
    role = user.get("role")

    if role not in ("resident", "staff"):
        return None

    # Put the user's ID in the token.
    # The role can be checked by protected routes.
    access_token = create_access_token(
        identity=str(user["id"]),
        additional_claims={"role": role}
    )

    return {
        "access_token": access_token
    }
