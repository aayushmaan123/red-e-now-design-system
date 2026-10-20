from flask_jwt_extended import create_access_token

from utils.passwords import verify_password


def authenticate_user(user, password):
    # Make sure the database actually returned a user
    if not user:
        return None

    # Get the stored password hash from the database result
    password_hash = user.get("password_hash")

    if not password_hash:
        return None

    # Check the submitted password against the stored hash
    if not verify_password(password_hash, password):
        return None

    # Only allow roles that the backend currently understands
    role = user.get("role")

    if role not in ["resident", "staff"]:
        return None

    # Keep the user ID as a string inside the JWT
    user_id = str(user.get("id"))

    # Create a signed token containing the user's role
    access_token = create_access_token(
        identity=user_id,
        additional_claims={
            "role": role
        }
    )

    # Return only the information the frontend actually needs
    return {
        "access_token": access_token,
        "user": {
            "id": user.get("id"),
            "role": role
        }
    }
