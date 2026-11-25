"""Create (and optionally seed or reset) the Red-E Now database.

    python scripts/db_bootstrap.py              apply database/bootstrap.sql (schema only, idempotent)
    python scripts/db_bootstrap.py --seed       schema + demo data, only if the database has no users yet
    python scripts/db_bootstrap.py --reset      DROP every Red-E Now table, then schema + demo data
    python scripts/db_bootstrap.py --reset --no-seed    wipe to an empty schema

--reset asks you to type the database name before it drops anything. For a
non-interactive run pass it instead:  --reset --confirm <DB_NAME>. If the
name does not match the database the script is connected to, it stops.
    python scripts/db_bootstrap.py --counts     just print row counts

Connection settings come from the environment, exactly like the backend:
    DB_HOST  DB_PORT  DB_NAME  DB_USER  DB_PASSWORD  DB_SSL  DB_SSL_CA
They are read from backend/.env by default. Point at another database with
    python scripts/db_bootstrap.py --env-file backend/.env.hosted --reset
(.env.* files are gitignored). Variables already set in the shell win over the file.

Seeding also reads APP_TIMEZONE, PICKUP_WEEKENDS and DEMO_PASSWORD
(default password123) so the demo data matches how the API is configured.

Run it with the backend's interpreter so its packages are available:
    backend\\venv\\Scripts\\python.exe scripts\\db_bootstrap.py --seed      (Windows)
    backend/venv/bin/python scripts/db_bootstrap.py --seed                 (macOS / Linux)

The password is never printed.
"""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

try:
    import mysql.connector
    from dotenv import dotenv_values
except ImportError as error:  # pragma: no cover - guidance only
    sys.exit(
        f"Missing package ({error.name}). Run this with the backend interpreter, "
        "e.g. backend\\venv\\Scripts\\python.exe scripts\\db_bootstrap.py"
    )

BOOTSTRAP_SQL = ROOT / "database" / "bootstrap.sql"
SEED_SQL = ROOT / "database" / "seed_demo.sql"

# Children before parents, so drops never trip a foreign key.
TABLES = [
    "account_audit_log",
    "package_exceptions",
    "package_audit_log",
    "pickup_appointments",
    "pickup_slots",
    "packages",
    "scheduling_settings",
    "buildings",
    "users",
]


def load_env(env_file):
    """Fill os.environ from the env file without overriding the shell."""
    path = Path(env_file)
    if not path.is_absolute():
        path = ROOT / path
    if not path.exists():
        return None
    for key, value in dotenv_values(path).items():
        if value is not None and key not in os.environ:
            os.environ[key] = value
    return path


def connect():
    host = os.getenv("DB_HOST", "")
    name = os.getenv("DB_NAME", "")
    user = os.getenv("DB_USER", "")
    missing = [k for k, v in (("DB_HOST", host), ("DB_NAME", name), ("DB_USER", user)) if not v]
    if missing:
        sys.exit("Missing database settings: " + ", ".join(missing))

    options = {
        "host": host,
        "port": int(os.getenv("DB_PORT", "3306")),
        "database": name,
        "user": user,
        "password": os.getenv("DB_PASSWORD", ""),
        "time_zone": "+00:00",   # TIMESTAMP columns are UTC, same as the API
        "autocommit": False,
        "connection_timeout": 30,
    }

    use_tls = os.getenv("DB_SSL", "false").strip().lower() == "true"
    if use_tls:
        ca = os.getenv("DB_SSL_CA", "").strip()
        if not ca:
            import certifi
            ca = certifi.where()
        options.update(ssl_disabled=False, ssl_verify_identity=True, ssl_ca=ca)

    try:
        connection = mysql.connector.connect(**options)
    except mysql.connector.Error as error:
        sys.exit(f"Could not connect to {user}@{host}/{name}: {error}")

    print(f"Connected: {name} on {host}:{options['port']} as {user} (TLS {'on' if use_tls else 'off'})")
    return connection


def statements(path):
    """Split a .sql file on semicolons that end a line; drop -- comment lines.

    /* ... */ comments are kept: bootstrap.sql uses TiDB option comments.
    The two SQL files contain no semicolons inside string literals.
    """
    lines = [
        line for line in path.read_text(encoding="utf-8").splitlines()
        if not line.strip().startswith("--")
    ]
    for chunk in "\n".join(lines).split(";\n"):
        statement = chunk.strip().rstrip(";").strip()
        if statement:
            yield statement


def run_file(cursor, path):
    count = 0
    for statement in statements(path):
        try:
            cursor.execute(statement)
        except mysql.connector.Error as error:
            first_line = statement.splitlines()[0][:90]
            raise SystemExit(f"\n{path.name} failed at: {first_line}\n  {error}") from error
        if cursor.with_rows:
            cursor.fetchall()
        count += 1
    return count


def existing_tables(cursor):
    cursor.execute("SHOW TABLES")
    return {row[0] for row in cursor.fetchall()}


def print_counts(cursor):
    present = existing_tables(cursor)
    print("\nRow counts")
    for table in reversed(TABLES):
        if table not in present:
            print(f"  {table:<22} (missing)")
            continue
        cursor.execute(f"SELECT COUNT(*) FROM `{table}`")
        print(f"  {table:<22} {cursor.fetchone()[0]}")

    if "packages" in present:
        cursor.execute("SELECT status, COUNT(*) FROM packages GROUP BY status ORDER BY status")
        rows = cursor.fetchall()
        if rows:
            print("  packages by status     " + ", ".join(f"{status} {n}" for status, n in rows))
    if "users" in present:
        cursor.execute("SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role")
        rows = cursor.fetchall()
        if rows:
            print("  users by role          " + ", ".join(f"{role} {n}" for role, n in rows))
    if "pickup_slots" in present:
        cursor.execute("SELECT MIN(pickup_start), MAX(pickup_start) FROM pickup_slots")
        first, last = cursor.fetchone()
        if first:
            print(f"  pickup slots           {first:%a %Y-%m-%d %H:%M} to {last:%a %Y-%m-%d %H:%M}")
    if "buildings" in present:
        cursor.execute("""
            SELECT b.name, s.open_time, s.close_time, s.slot_minutes, s.default_capacity
            FROM buildings b JOIN scheduling_settings s ON s.building_id = b.id
            WHERE b.id = 1
        """)
        row = cursor.fetchone()
        if row:
            print(f"  building               {row[0]}, desk {str(row[1])[:-3]}-{str(row[2])[:-3]}, "
                  f"{row[3]} min slots, {row[4]} per slot")


def seed(cursor):
    from utils.clock import building_now, building_timezone   # backend/utils
    from utils.passwords import hash_password

    now_local = datetime.now(building_timezone())
    offset_minutes = int(now_local.utcoffset().total_seconds() // 60)
    seed_date = building_now().date()
    weekends = os.getenv("PICKUP_WEEKENDS", "false").strip().lower() == "true"
    demo_password = os.getenv("DEMO_PASSWORD", "password123")

    cursor.execute("SET @seed_date = %s", (seed_date.isoformat(),))
    cursor.execute("SET @tz_offset_minutes = %s", (offset_minutes,))
    cursor.execute("SET @pickup_weekends = %s", (1 if weekends else 0,))
    cursor.execute("SET @demo_password_hash = %s", (hash_password(demo_password),))

    count = run_file(cursor, SEED_SQL)
    print(
        f"Seeded demo data: {count} statements, dated {seed_date:%a %Y-%m-%d} "
        f"({building_timezone()}, UTC{offset_minutes / 60:+g}h, "
        f"weekend pickups {'on' if weekends else 'off'})"
    )


def main():
    parser = argparse.ArgumentParser(
        description="Create, seed or reset the Red-E Now database.",
        epilog="Settings come from DB_* environment variables (default file: backend/.env).",
    )
    parser.add_argument("--seed", action="store_true", help="load demo data (only into a database with no users)")
    parser.add_argument("--reset", action="store_true", help="drop all Red-E Now tables first, then schema + demo data")
    parser.add_argument("--no-seed", action="store_true", help="with --reset: leave the schema empty")
    parser.add_argument("--counts", action="store_true", help="print row counts and exit")
    parser.add_argument("--confirm", metavar="DB_NAME", default="",
                        help="with --reset: skip the prompt by naming the database to wipe; "
                             "it must equal DB_NAME, so a reset never lands on the wrong database")
    parser.add_argument("--env-file", default="backend/.env", help="env file with DB_* settings (default: backend/.env)")
    args = parser.parse_args()

    env_path = load_env(args.env_file)
    print(f"Settings: {env_path if env_path else 'environment only (no ' + args.env_file + ')'}")

    connection = connect()
    cursor = connection.cursor()
    try:
        if args.counts:
            print_counts(cursor)
            return 0

        if args.reset:
            target = f"{os.getenv('DB_NAME')} on {os.getenv('DB_HOST')}"
            # A reset has to name its target. Settings can come from the
            # shell or a file, so "whatever DB_NAME happens to be" is not
            # good enough for a command that drops tables.
            if args.confirm:
                typed = args.confirm.strip()
            else:
                print(f"\n--reset deletes ALL Red-E Now data in {target}.")
                typed = input("Type the database name to continue: ").strip()
            if typed != os.getenv("DB_NAME"):
                print(f"Cancelled: '{typed}' is not the connected database. Nothing was changed.")
                return 1
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            for table in TABLES:
                cursor.execute(f"DROP TABLE IF EXISTS `{table}`")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            connection.commit()
            print(f"Dropped {len(TABLES)} tables in {target}")

        applied = run_file(cursor, BOOTSTRAP_SQL)
        connection.commit()
        print(f"Schema ready: {applied} statements from {BOOTSTRAP_SQL.name}")

        if (args.seed or args.reset) and not args.no_seed:
            cursor.execute("SELECT COUNT(*) FROM users")
            if cursor.fetchone()[0] > 0:
                print("\nThis database already has users, so the demo seed was skipped.")
                print("Use --reset to wipe it and load fresh demo data.")
                print_counts(cursor)
                return 1
            seed(cursor)
            connection.commit()

        print_counts(cursor)
        return 0
    except BaseException:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    sys.exit(main())
