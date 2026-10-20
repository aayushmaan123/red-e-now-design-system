from werkzeug.security import check_password_hash, generate_password_hash


def hash_password(password):
    # Turn a plain password into a secure hash before database storage
    return generate_password_hash(password)


def verify_password(password_hash, password):
    # Compare a login password against the stored password hash
    return check_password_hash(password_hash, password)
