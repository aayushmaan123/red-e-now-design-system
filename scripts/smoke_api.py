"""Red-E Now API smoke test.

Runs against any deployment of the backend, local or hosted:

    python scripts/smoke_api.py --base http://127.0.0.1:5000
    python scripts/smoke_api.py --base https://<api-project>.vercel.app --handoff

What it checks
    health, staff + resident login, /auth/me, building-code-gated register
    (unique throwaway email), package create + read, resident isolation,
    slot listing, a 403 for a resident on a staff route, scheduling settings
    (building name), and the staff password-reset endpoint.

--handoff additionally walks the whole pickup loop for the throwaway
    resident: available -> book -> move -> cancel -> book the open slot ->
    prepare -> check-in -> verify -> sign-off -> complete -> audit trail.
    It needs an open pickup slot today (weekday, inside desk hours);
    otherwise those steps are reported as SKIP, not as failures.

The script only uses the public API, so it leaves one throwaway resident
("Smoke Test ...", unit ZZ9) and one package behind per run. Restore demo
data with:  python scripts/db_bootstrap.py --reset --seed

Standard library only. Exit code 0 when every check passes.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date, timedelta


PASSED = []
FAILED = []
SKIPPED = []


class Api:
    def __init__(self, base):
        base = base.rstrip("/")
        self.base = base if base.endswith("/api") else base + "/api"

    def call(self, method, path, data=None, token=None):
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        body = json.dumps(data).encode() if data is not None else None
        request = urllib.request.Request(
            self.base + path, data=body, headers=headers, method=method
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.status, json.loads(response.read().decode())
        except urllib.error.HTTPError as error:
            raw = error.read().decode(errors="replace")
            try:
                return error.code, json.loads(raw)
            except ValueError:
                return error.code, {"raw": raw[:200]}
        except (urllib.error.URLError, TimeoutError) as error:
            return 0, {"error": {"code": "NETWORK_ERROR", "message": str(error)}}


def check(name, ok, detail=""):
    (PASSED if ok else FAILED).append(name)
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}" + (f"  ({detail})" if detail else ""))
    return ok


def skip(name, reason):
    SKIPPED.append(name)
    print(f"  [SKIP] {name}  ({reason})")


def code_of(body):
    return (body.get("error") or {}).get("code")


def main():
    parser = argparse.ArgumentParser(description="Red-E Now API smoke test")
    parser.add_argument("--base", default=os.getenv("API_BASE", "http://127.0.0.1:5000"),
                        help="API origin, with or without the /api suffix")
    parser.add_argument("--staff-email", default=os.getenv("SMOKE_STAFF_EMAIL", "staff@redenow.com"))
    parser.add_argument("--resident-email", default=os.getenv("SMOKE_RESIDENT_EMAIL", "jane@redenow.com"))
    parser.add_argument("--password", default=os.getenv("SMOKE_PASSWORD", "password123"),
                        help="password shared by the seeded demo accounts")
    parser.add_argument("--building-code", default=os.getenv("SMOKE_BUILDING_CODE", "REDENOW"))
    parser.add_argument("--handoff", action="store_true",
                        help="also walk booking and the verified handoff end to end")
    args = parser.parse_args()

    api = Api(args.base)
    stamp = int(time.time())
    print(f"Red-E Now API smoke test -> {api.base}")

    # ── Health ────────────────────────────────────────────────
    print("\nHealth")
    status, body = api.call("GET", "/health")
    if not check("GET /health", status == 200 and body.get("success") is True, f"status={status}"):
        print("\nBackend is not reachable; stopping.")
        return 1

    # ── Auth ──────────────────────────────────────────────────
    print("\nAuth")
    status, body = api.call("POST", "/auth/login", {"email": args.staff_email, "password": args.password})
    staff_token = body.get("access_token", "")
    check("staff login", status == 200 and body.get("user", {}).get("role") == "staff", f"status={status} {code_of(body) or ''}")

    status, body = api.call("POST", "/auth/login", {"email": args.resident_email, "password": args.password})
    seeded_resident_token = body.get("access_token", "")
    check("resident login", status == 200 and body.get("user", {}).get("role") == "resident", f"status={status} {code_of(body) or ''}")

    status, body = api.call("POST", "/auth/login", {"email": args.staff_email, "password": "definitely-wrong"})
    check("wrong password rejected", status == 401 and code_of(body) == "INVALID_CREDENTIALS", f"status={status}")

    if not staff_token or not seeded_resident_token:
        print("\nCannot continue without both demo logins (is the demo seed loaded?).")
        return 1

    status, body = api.call("GET", "/auth/me", token=staff_token)
    check("GET /auth/me (staff)", status == 200 and body.get("user", {}).get("email") == args.staff_email, f"status={status}")
    status, body = api.call("GET", "/auth/me")
    check("GET /auth/me without token", status == 401, f"status={status}")

    # ── Register (unique throwaway resident) ──────────────────
    print("\nRegister")
    email = f"smoke-{stamp}@example.com"
    new_password = f"smoke-{stamp}-pw"
    form = {"name": f"Smoke Test {stamp}", "email": email, "password": new_password, "unit": "zz9"}
    status, body = api.call("POST", "/auth/register", {**form, "building_code": "not-the-code"})
    check("register with wrong building code", status == 400 and code_of(body) == "INVALID_BUILDING_CODE", f"status={status}")
    status, body = api.call("POST", "/auth/register", {**form, "building_code": args.building_code})
    resident = body.get("user", {})
    resident_token = body.get("access_token", "")
    if not check("register with building code", status == 201 and resident.get("role") == "resident" and resident.get("unit") == "ZZ9", f"status={status} {code_of(body) or ''}"):
        return 1
    status, body = api.call("POST", "/auth/register", {**form, "building_code": args.building_code})
    check("duplicate email rejected", status == 409 and code_of(body) == "EMAIL_TAKEN", f"status={status}")
    status, body = api.call("GET", "/my-packages", token=resident_token)
    check("new resident starts with no packages", status == 200 and body.get("packages") == [], f"status={status}")

    # ── Role checks ───────────────────────────────────────────
    print("\nRoles")
    status, body = api.call("GET", "/packages", token=resident_token)
    check("resident on staff route -> 403", status == 403 and code_of(body) == "FORBIDDEN", f"status={status}")
    status, body = api.call("POST", f"/residents/{resident['id']}/reset-password", token=resident_token)
    check("resident cannot reset passwords -> 403", status == 403, f"status={status}")
    status, body = api.call("GET", "/my-packages", token=staff_token)
    check("staff on resident route -> 403", status == 403, f"status={status}")

    # ── Packages ──────────────────────────────────────────────
    print("\nPackages")
    tracking = f"SMOKE{stamp}"
    status, body = api.call("POST", "/packages", {
        "carrier_name": "UPS", "tracking_code": tracking, "resident_id": resident["id"],
        "location_code": "SHELF-S1", "description": "Smoke test parcel",
    }, token=staff_token)
    package = body.get("package", {})
    if not check("staff registers a package", status == 201 and package.get("status") == "received", f"status={status} {code_of(body) or ''}"):
        return 1
    package_id = package["id"]
    status, body = api.call("GET", f"/packages/{package_id}", token=staff_token)
    check("staff reads the package", status == 200 and body.get("package", {}).get("tracking_code") == tracking, f"status={status}")
    arrived = body.get("package", {}).get("arrived_at", "")
    check("arrived_at is a UTC instant", arrived.endswith("+00:00"), arrived)
    status, body = api.call("GET", "/my-packages", token=resident_token)
    mine = [p["id"] for p in body.get("packages", [])]
    check("resident sees exactly their package", status == 200 and mine == [package_id], f"ids={mine}")
    status, body = api.call("GET", "/my-packages", token=seeded_resident_token)
    others = [p["id"] for p in body.get("packages", [])]
    check("another resident does not see it", status == 200 and package_id not in others)

    # ── Scheduling ────────────────────────────────────────────
    print("\nScheduling")
    status, body = api.call("GET", "/scheduling/settings", token=resident_token)
    settings = body.get("settings", {})
    check("settings include the building name", status == 200 and bool(settings.get("building_name")), settings.get("building_name", ""))

    # The API decides what "today" is (building time), so probe a window of dates.
    earliest_slots, later_day, later_slots = [], None, []
    probe = date.today() - timedelta(days=1)
    slots_ok = True
    for _ in range(10):
        status, body = api.call("GET", f"/scheduling/slots?date={probe.isoformat()}", token=resident_token)
        slots_ok = slots_ok and status == 200
        slots = [s for s in body.get("slots", []) if s.get("available")]
        if slots and not earliest_slots and not later_slots:
            # first date with open slots: today at the building, unless the desk is closed
            earliest_slots, earliest_day = slots, probe
        elif slots and earliest_slots and not later_slots:
            later_day, later_slots = probe, slots
        probe += timedelta(days=1)
    check("GET /scheduling/slots", slots_ok and bool(earliest_slots), f"{len(earliest_slots)} open on {earliest_day if earliest_slots else 'n/a'}")
    status, body = api.call("GET", "/scheduling/slots?date=not-a-date", token=resident_token)
    check("bad slot date rejected", status == 400, f"status={status}")

    # ── Password reset (staff only) ───────────────────────────
    print("\nPassword reset")
    status, body = api.call("POST", f"/residents/{resident['id']}/reset-password", token=staff_token)
    temporary = body.get("temporary_password", "")
    check("staff issues a temporary password", status == 200 and len(temporary) >= 12, f"status={status} {code_of(body) or ''}")
    status, body = api.call("POST", "/auth/login", {"email": email, "password": new_password})
    check("old password stops working", status == 401, f"status={status}")
    status, body = api.call("POST", "/auth/login", {"email": email, "password": temporary})
    check("temporary password signs in", status == 200, f"status={status}")
    resident_token = body.get("access_token", resident_token)

    # ── Full pickup loop (optional) ───────────────────────────
    if args.handoff:
        print("\nBooking and handoff")
        run_handoff(api, staff_token, resident_token, package_id, resident, earliest_slots, later_slots)

    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed, {len(SKIPPED)} skipped")
    if FAILED:
        print("Failed: " + "; ".join(FAILED))
    return 1 if FAILED else 0


def run_handoff(api, staff_token, resident_token, package_id, resident, earliest_slots, later_slots):
    status, body = api.call("PUT", f"/packages/{package_id}", {"status": "available"}, token=staff_token)
    if not check("staff marks the package available", status == 200, f"status={status} {code_of(body) or ''}"):
        return

    if len(later_slots) >= 2:
        first, second = later_slots[0], later_slots[1]
        status, body = api.call("POST", "/appointments", {"package_id": package_id, "pickup_start": first["pickup_start"]}, token=resident_token)
        appointment_id = body.get("appointment", {}).get("id")
        check("resident books a slot", status == 201, f"{first['pickup_start']} status={status} {code_of(body) or ''}")
        day = first["pickup_start"][:10]
        status, body = api.call("GET", f"/scheduling/slots?date={day}", token=staff_token)
        after = next((s for s in body.get("slots", []) if s["pickup_start"] == first["pickup_start"]), {})
        check("slot capacity drops by one", after.get("remaining") == first["remaining"] - 1, f"{first['remaining']} -> {after.get('remaining')}")
        status, body = api.call("POST", f"/appointments/{appointment_id}/reschedule", {"pickup_start": second["pickup_start"]}, token=resident_token)
        check("resident moves the booking", status == 200, f"-> {second['pickup_start']} status={status} {code_of(body) or ''}")
        status, body = api.call("POST", f"/appointments/{appointment_id}/cancel", token=resident_token)
        check("resident cancels the booking", status == 200, f"status={status} {code_of(body) or ''}")
    else:
        skip("book / move / cancel a later slot", "no later day with two open slots")

    # Book the earliest open slot: the one in progress, or the next to start.
    if not earliest_slots:
        skip("handoff", "no open pickup slot (outside desk hours or weekend)")
        return
    target = earliest_slots[0]
    status, body = api.call("POST", "/appointments", {"package_id": package_id, "pickup_start": target["pickup_start"]}, token=resident_token)
    appointment_id = body.get("appointment", {}).get("id")
    if not check("resident books the open slot", status == 201, f"{target['pickup_start']} status={status} {code_of(body) or ''}"):
        return

    status, body = api.call("GET", "/appointments", token=staff_token)
    row = next((a for a in body.get("appointments", []) if a["id"] == appointment_id), {})
    check("staff sees the booking", row.get("resident_id") == resident["id"] and row.get("package_status") == "scheduled")
    check("pickup times are building wall-clock (no offset)", "+" not in row.get("pickup_start", "+") and "GMT" not in str(row.get("pickup_start")))

    status, body = api.call("PUT", f"/packages/{package_id}", {"status": "picked_up"}, token=staff_token)
    check("picked_up cannot skip the handoff", status == 409 and code_of(body) == "HANDOFF_REQUIRED", f"status={status}")
    status, body = api.call("PUT", f"/packages/{package_id}", {"status": "prepared"}, token=staff_token)
    check("staff marks it prepared", status == 200, f"status={status} {code_of(body) or ''}")

    status, body = api.call("POST", f"/appointments/{appointment_id}/verify-identity", {"identity_confirmed": True}, token=staff_token)
    check("verify before check-in is refused", status == 409 and code_of(body) == "CHECK_IN_REQUIRED", f"status={status}")

    status, body = api.call("POST", f"/appointments/{appointment_id}/check-in", token=resident_token)
    if status == 409 and code_of(body) == "OUTSIDE_PICKUP_WINDOW":
        skip("check-in -> complete", f"check-in for {target['pickup_start']} is not open yet; rerun closer to the slot")
        return
    if not check("resident checks in", status == 200, f"status={status} {code_of(body) or ''}"):
        return
    status, body = api.call("POST", f"/appointments/{appointment_id}/verify-identity", {"identity_confirmed": True}, token=staff_token)
    check("staff verifies identity", status == 200, f"status={status} {code_of(body) or ''}")
    status, body = api.call("POST", f"/appointments/{appointment_id}/signoff", {"recipient_name": resident["name"], "acknowledged": True, "note": "smoke test"}, token=staff_token)
    check("staff records sign-off", status == 200, f"status={status} {code_of(body) or ''}")

    status, body = api.call("GET", "/appointments", token=staff_token)
    row = next((a for a in body.get("appointments", []) if a["id"] == appointment_id), {})
    check("appointment list exposes the recipient", row.get("recipient_name") == resident["name"] and row.get("handoff_status") == "Signed off", f"{row.get('handoff_status')}")
    stamps = [row.get("checked_in_at"), row.get("identity_verified_at"), row.get("acknowledged_at")]
    check("handoff timestamps are ISO 8601", all(isinstance(s, str) and "T" in s and "GMT" not in s for s in stamps), str(stamps[0]))

    status, body = api.call("POST", f"/appointments/{appointment_id}/complete", token=staff_token)
    check("staff completes the pickup", status == 200, f"status={status} {code_of(body) or ''}")
    status, body = api.call("GET", f"/packages/{package_id}", token=staff_token)
    check("package ends as picked_up", body.get("package", {}).get("status") == "picked_up")
    status, body = api.call("GET", f"/packages/{package_id}/audit", token=staff_token)
    actions = [entry["action"] for entry in body.get("audit", [])]
    check("audit trail recorded", status == 200 and "created" in actions and "signed_off" in actions and len(actions) >= 8, f"{len(actions)} entries")
    status, body = api.call("GET", "/appointments", token=resident_token)
    done = next((a for a in body.get("appointments", []) if a["id"] == appointment_id), {})
    check("resident sees the completed pickup", done.get("status") == "completed" and bool(done.get("handed_off_at")))


if __name__ == "__main__":
    sys.exit(main())
