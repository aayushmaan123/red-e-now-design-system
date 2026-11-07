#!/usr/bin/env python3
"""Verify concurrent bookings respect pickup-slot capacity."""

import concurrent.futures
import sys
import uuid
from datetime import datetime, timedelta

from test_sprint3_lifecycle import api, login


def main():
    staff = login("staff@redenow.com")
    jane = login("jane@redenow.com")
    john = login("john@redenow.com")

    # Find a future weekday slot with all capacity available.
    # Avoid reusing a slot filled by an earlier test run.
    slot = None

    for offset in range(21, 90):
        day = datetime.now() + timedelta(days=offset)
        if day.weekday() >= 5:
            continue

        candidate = day.replace(
            hour=14, minute=0, second=0, microsecond=0
        ).strftime("%Y-%m-%dT%H:%M")

        status, payload = api(
            "GET", f"/api/scheduling/slots?date={day:%Y-%m-%d}",
            jane,
        )

        if status != 200:
            raise RuntimeError(
                f"Could not check slots: HTTP {status}"
            )

        if any(
            item["pickup_start"] == candidate
            and item["remaining"] >= 3
            and item["booked"] == 0
            for item in payload["slots"]
        ):
            slot = candidate
            break

    if slot is None:
        raise RuntimeError("No empty capacity-three slot found.")

    print("Concurrency test slot:", slot)

    packages = []

    for resident_id, token in (
        (2, jane),
        (2, jane),
        (3, john),
        (3, john),
    ):
        tracking = "SPRINT3-CONCURRENT-" + uuid.uuid4().hex

        status, payload = api(
            "POST", "/api/packages", staff,
            {
                "carrier_name": "Sprint 3 Test",
                "tracking_code": tracking,
                "resident_id": resident_id,
                "description": "Concurrency acceptance test",
                "location_code": "TEST-CONCURRENT",
            },
        )

        if status != 201:
            raise RuntimeError(
                f"Package registration failed: HTTP {status}"
            )

        package_id = payload["package"]["id"]

        status, _ = api(
            "PUT", f"/api/packages/{package_id}", staff,
            {"status": "available"},
        )

        if status != 200:
            raise RuntimeError(
                f"Package availability update failed: HTTP {status}"
            )

        packages.append((package_id, token))

    def book(item):
        package_id, token = item
        status, payload = api(
            "POST", "/api/appointments", token,
            {"package_id": package_id, "pickup_start": slot},
        )
        return package_id, status, payload

    with concurrent.futures.ThreadPoolExecutor(
        max_workers=4
    ) as executor:
        results = list(executor.map(book, packages))

    for package_id, status, payload in results:
        print(
            f"Package {package_id}: HTTP {status}",
            payload.get("error", ""),
        )

    successes = sum(
        status == 201 for _, status, _ in results
    )

    print(f"Successful bookings: {successes}/4")

    if successes == 3:
        print("PASS: Slot capacity respected.")
        return 0

    print("FAIL: Expected exactly 3 successful bookings.")
    return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print("STOP:", error)
        sys.exit(2)
