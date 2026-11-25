"""Time helpers for Red-E Now.

Two kinds of time live in the database:

* Wall-clock DATETIME columns (pickup_start, pickup_end, checked_in_at,
  identity_verified_at, acknowledged_at, handed_off_at). These are stored in
  the building's local time, because a 2:00 PM pickup slot means 2:00 PM at
  the front desk no matter where the server runs.
* TIMESTAMP columns (arrived_at, created_at, changed_at). MySQL stores these
  as instants; the DB session runs in UTC (see services/database.py), so they
  come back as UTC.

Servers do not share the building's clock (Vercel runs in UTC), so never call
datetime.now() or date.today() directly in a route. Use building_now().
"""

import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


DEFAULT_TIMEZONE = "America/New_York"

# Residents may check in this many slot-lengths before their window opens,
# so someone who arrives a little early is not turned away at the desk.
EARLY_CHECK_IN_SLOTS = 1


def building_timezone():
    name = os.getenv("APP_TIMEZONE", DEFAULT_TIMEZONE).strip() or DEFAULT_TIMEZONE

    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo(DEFAULT_TIMEZONE)


def building_now():
    """Current wall-clock time at the building, as a naive datetime."""
    return datetime.now(building_timezone()).replace(tzinfo=None, microsecond=0)


def building_today():
    return building_now().date()


def check_in_opens_at(pickup_start, pickup_end):
    """Earliest wall-clock time a resident may check in for a slot."""
    return pickup_start - (pickup_end - pickup_start) * EARLY_CHECK_IN_SLOTS


def local_iso(value):
    """Serialize a wall-clock DATETIME: no offset, it is building time."""
    if isinstance(value, datetime):
        return value.replace(microsecond=0).isoformat()
    return value


def utc_iso(value):
    """Serialize a TIMESTAMP read from a UTC session as a true instant."""
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc).isoformat()
    return value
