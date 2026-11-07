#!/usr/bin/env python3
"""Sprint 3 API acceptance tests: read-only and invalid requests."""

import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get(
    "SPRINT3_API_URL",
    "http://127.0.0.1:5000",
).rstrip("/")

PASSWORD = os.environ.get("SPRINT3_TEST_PASSWORD", "password123")
STAFF_EMAIL = os.environ.get("SPRINT3_STAFF_EMAIL", "staff@redenow.com")
RESIDENT_EMAIL = os.environ.get("SPRINT3_RESIDENT_EMAIL", "jane@redenow.com")

passed = 0
failed = 0


def request(method, path, token=None, data=None):
    headers = {"Accept": "application/json"}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(
        BASE + path,
        data=body,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status = response.status
            raw = response.read()
    except urllib.error.HTTPError as error:
        status = error.code
        raw = error.read()

    try:
        payload = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        payload = {}

    return status, payload


def check(label, actual, expected):
    global passed, failed

    if actual in expected:
        passed += 1
        print(f"PASS  {label}: HTTP {actual}")
    else:
        failed += 1
        print(
            f"FAIL  {label}: HTTP {actual}; "
            f"expected {sorted(expected)}"
        )


def login(email):
    status, payload = request(
        "POST",
        "/api/auth/login",
        data={"email": email, "password": PASSWORD},
    )

    if status != 200 or not payload.get("access_token"):
        print(f"STOP: Could not log in as {email} (HTTP {status}).")
        sys.exit(2)

    return payload["access_token"]


def main():
    print("=" * 48)
    print("RED-E NOW — SPRINT 3 API SECURITY TESTS")
    print("=" * 48)

    try:
        staff = login(STAFF_EMAIL)
        resident = login(RESIDENT_EMAIL)

        print("\nAuthentication")
        check(
            "Appointments require login",
            request("GET", "/api/appointments")[0],
            {401, 422},
        )
        check(
            "Resident can view appointments",
            request("GET", "/api/appointments", resident)[0],
            {200},
        )
        check(
            "Staff can view appointments",
            request("GET", "/api/appointments", staff)[0],
            {200},
        )

        print("\nRole permissions")
        check(
            "Staff cannot book resident pickups",
            request(
                "POST",
                "/api/appointments",
                staff,
                {"package_id": 1, "pickup_start": "2026-11-02T11:00"},
            )[0],
            {403},
        )
        check(
            "Staff cannot cancel resident pickups",
            request(
                "POST",
                "/api/appointments/999999999/cancel",
                staff,
            )[0],
            {403},
        )
        check(
            "Resident cannot update package status",
            request(
                "PUT",
                "/api/packages/999999999",
                resident,
                {"status": "scheduled"},
            )[0],
            {403},
        )

        print("\nBooking validation")
        cases = [
            ("Missing JSON fields", {}, {400}),
            ("Invalid package ID", {"package_id": -1}, {400}),
            (
                "Non-numeric package ID",
                {"package_id": "abc", "pickup_start": "2026-11-02T11:00"},
                {400},
            ),
            (
                "Invalid date",
                {"package_id": 1, "pickup_start": "not-a-date"},
                {400},
            ),
            (
                "Weekend booking",
                {"package_id": 1, "pickup_start": "2026-11-07T11:00"},
                {400},
            ),
            (
                "Before opening hours",
                {"package_id": 1, "pickup_start": "2026-11-02T08:30"},
                {400},
            ),
            (
                "After closing hours",
                {"package_id": 1, "pickup_start": "2026-11-02T17:00"},
                {400},
            ),
            (
                "Invalid time increment",
                {"package_id": 1, "pickup_start": "2026-11-02T11:15"},
                {400},
            ),
        ]

        for label, data, expected in cases:
            check(
                label,
                request(
                    "POST",
                    "/api/appointments",
                    resident,
                    data,
                )[0],
                expected,
            )

        print("\nOwnership and cancellation")
        check(
            "Cannot book nonexistent package",
            request(
                "POST",
                "/api/appointments",
                resident,
                {
                    "package_id": 999999999,
                    "pickup_start": "2026-11-09T11:00",
                },
            )[0],
            {404},
        )
        check(
            "Cannot cancel nonexistent appointment",
            request(
                "POST",
                "/api/appointments/999999999/cancel",
                resident,
            )[0],
            {404},
        )

    except (urllib.error.URLError, TimeoutError, OSError) as error:
        print(f"\nSTOP: Cannot reach Flask API: {error}")
        sys.exit(2)

    print("\n" + "=" * 48)
    print(f"RESULT: {passed} passed, {failed} failed")
    print("=" * 48)

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
