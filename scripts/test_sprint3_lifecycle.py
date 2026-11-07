#!/usr/bin/env python3
"""Sprint 3 end-to-end lifecycle acceptance tests."""

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta

BASE = os.environ.get(
    "SPRINT3_API_URL", "http://127.0.0.1:5000"
).rstrip("/")

PASSWORD = os.environ.get("SPRINT3_TEST_PASSWORD", "password123")

passed = 0
failed = 0


def api(method, path, token=None, data=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = None
    if data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(
        BASE + path, data=body, headers=headers, method=method
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            status = response.status
            raw = response.read()
    except urllib.error.HTTPError as error:
        status = error.code
        raw = error.read()

    try:
        payload = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        payload = {}

    return status, payload


def login(email):
    status, payload = api(
        "POST", "/api/auth/login",
        data={"email": email, "password": PASSWORD}
    )
    if status != 200 or not payload.get("access_token"):
        raise RuntimeError(f"Login failed for {email}: HTTP {status}")
    return payload["access_token"]


def check(label, status, expected):
    global passed, failed
    if status == expected:
        passed += 1
        print(f"PASS  {label}: HTTP {status}")
    else:
        failed += 1
        print(f"FAIL  {label}: HTTP {status}, expected {expected}")


def next_weekday():
    day = datetime.now() + timedelta(days=7)
    while day.weekday() >= 5:
        day += timedelta(days=1)
    return day.replace(hour=14, minute=0, second=0, microsecond=0)


def main():
    print("=" * 52)
    print("RED-E NOW — SPRINT 3 LIFECYCLE ACCEPTANCE")
    print("=" * 52)

    try:
        jane = login("jane@redenow.com")
        john = login("john@redenow.com")
        staff = login("staff@redenow.com")

        slot = next_weekday().strftime("%Y-%m-%dT%H:%M")
        print(f"\nTest pickup slot: {slot}")

        # Register a fresh package for each lifecycle test run.
        import uuid

        status, payload = api(
            "GET", "/api/packages", staff
        )
        if status != 200:
            raise RuntimeError(
                f"Cannot load packages: HTTP {status}"
            )

        # Jane Doe's resident ID, confirmed in the database.
        resident_id = 2

        tracking = "SPRINT3-LIFECYCLE-" + uuid.uuid4().hex[:12]

        status, payload = api(
            "POST", "/api/packages", staff,
            {
                "carrier_name": "Sprint 3 Test",
                "tracking_code": tracking,
                "resident_id": resident_id,
                "description": "Automated lifecycle acceptance test",
                "location_code": "TEST-QUEUE",
            }
        )
        check("Staff registers test package", status, 201)

        if status != 201:
            raise RuntimeError(
                f"Cannot register test package: HTTP {status}"
            )

        package_id = payload["package"]["id"]

        status, _ = api(
            "PUT", f"/api/packages/{package_id}", staff,
            {"status": "available"}
        )
        check("Staff makes package available", status, 200)

        if status != 200:
            raise RuntimeError(
                "Cannot make test package available."
            )

        status, payload = api(
            "POST", "/api/appointments", jane,
            {"package_id": package_id, "pickup_start": slot}
        )
        check("Jane books fresh test package", status, 201)
        if status != 201:
            raise RuntimeError("Cannot continue without initial booking")

        appointment_id = payload["appointment"]["id"]

        # Duplicate booking must be rejected.
        status, _ = api(
            "POST", "/api/appointments", jane,
            {"package_id": package_id, "pickup_start": slot}
        )
        check("Duplicate booking rejected", status, 409)

        # John must not cancel Jane's appointment.
        status, _ = api(
            "POST",
            f"/api/appointments/{appointment_id}/cancel",
            john
        )
        check("Other resident cannot cancel", status, 404)

        # Jane cancels.
        status, _ = api(
            "POST",
            f"/api/appointments/{appointment_id}/cancel",
            jane
        )
        check("Jane cancels pickup", status, 200)

        # Rebook the same package.
        status, payload = api(
            "POST", "/api/appointments", jane,
            {"package_id": package_id, "pickup_start": slot}
        )
        check("Jane rebooks test package", status, 201)
        if status != 201:
            raise RuntimeError("Cannot continue without rebooking")

        # Staff prepares the package.
        status, _ = api(
            "PUT", f"/api/packages/{package_id}", staff,
            {"status": "prepared"}
        )
        check("Staff prepares package", status, 200)

        # Prepared pickups cannot be cancelled.
        new_appointment_id = payload["appointment"]["id"]
        status, _ = api(
            "POST",
            f"/api/appointments/{new_appointment_id}/cancel",
            jane
        )
        check("Prepared pickup cannot be cancelled", status, 409)

        # Staff confirms pickup.
        status, _ = api(
            "PUT", f"/api/packages/{package_id}", staff,
            {"status": "picked_up"}
        )
        check("Staff completes pickup", status, 200)

        # Verify appointment completion through the API.
        status, payload = api("GET", "/api/appointments", jane)
        check("Resident appointment list", status, 200)

        if status == 200:
            appointments = payload.get("appointments", [])
            matching = [
                item for item in appointments
                if item.get("id") == new_appointment_id
            ]
            if matching and matching[0].get("status") == "completed":
                check("Appointment marked completed", 200, 200)
            else:
                check("Appointment marked completed", 500, 200)

    except (RuntimeError, urllib.error.URLError, OSError) as error:
        print(f"\nSTOP: {error}")
        sys.exit(2)

    print("\n" + "=" * 52)
    print(f"RESULT: {passed} passed, {failed} failed")
    print("=" * 52)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
