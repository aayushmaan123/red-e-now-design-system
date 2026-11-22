"""
Red-E Now Sprint 4 — API endpoint test script.
Run from the RED-E-NOW repo root with: python test_api.py
Tests: health, auth, packages, appointments, and the 4-step handoff flow.
"""
import json, urllib.request, urllib.error, sys

BASE = "http://127.0.0.1:5000/api"
PASS = 0
FAIL = 0
RESULTS = []

def req(method, path, data=None, token=None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(r, timeout=10)
        return json.loads(resp.read().decode()), resp.status
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return json.loads(body), e.code
        except:
            return {"raw": body}, e.code
    except Exception as e:
        return {"error": str(e)}, 0

def test(name, passed, detail=""):
    global PASS, FAIL
    status = "PASS" if passed else "FAIL"
    if passed: PASS += 1
    else: FAIL += 1
    print(f"  [{status}] {name}" + (f" -- {detail}" if detail else ""))
    RESULTS.append((name, passed, detail))

print("=" * 60)
print("Red-E Now Sprint 4 -- API Test Suite")
print("=" * 60)

# 1. Health
print("\n--- Health ---")
data, code = req("GET", "/health")
test("GET /api/health", code == 200, f"status={code}")

# 2. Staff login
print("\n--- Auth ---")
data, code = req("POST", "/auth/login", {"email": "staff@redenow.com", "password": "password123"})
staff_token = data.get("access_token", "")
test("Staff login", code == 200 and bool(staff_token), f"status={code}")

# 3. Resident login
data, code = req("POST", "/auth/login", {"email": "john@redenow.com", "password": "password123"})
resident_token = data.get("access_token", "")
test("Resident login", code == 200 and bool(resident_token), f"status={code}")

if not staff_token or not resident_token:
    print("\n  Cannot continue without both tokens.")
    sys.exit(1)

# 4. Packages
print("\n--- Packages ---")
data, code = req("GET", "/packages", token=staff_token)
packages = data.get("packages", [])
test("GET /api/packages", code == 200, f"count={len(packages)}")

if packages:
    has_exc_field = "has_exception" in packages[0]
    test("has_exception in package response", has_exc_field,
         "PRESENT" if has_exc_field else "MISSING -- backend issue #2")

# 5. Appointments
print("\n--- Appointments ---")
data, code = req("GET", "/appointments", token=staff_token)
appointments = data.get("appointments", [])
test("GET /api/appointments", code == 200, f"count={len(appointments)}")

if appointments:
    a = appointments[0]
    handoff_fields = ["checked_in_at", "identity_verified_at", "identity_verified_by",
                      "recipient_name", "acknowledged_at", "handed_off_at",
                      "signed_off_by", "signoff_note"]
    present = [f for f in handoff_fields if f in a]
    missing = [f for f in handoff_fields if f not in a]
    test("Handoff fields in appointment response",
         len(present) == len(handoff_fields),
         f"present={len(present)}/{len(handoff_fields)}, missing={missing}" if missing else f"all {len(handoff_fields)} present")

    hs = a.get("handoff_status")
    test("handoff_status in appointment response",
         "handoff_status" in a and hs is not None,
         f"value={hs!r}" if "handoff_status" in a else "MISSING -- backend issue #1")

    has_exc = "has_exception" in a
    test("has_exception in appointment response", has_exc,
         "PRESENT" if has_exc else "MISSING -- backend issue #2")

# 6. Handoff guard
print("\n--- Handoff Guard ---")
prepared_pkgs = [p for p in packages if p.get("status") == "prepared"]
if prepared_pkgs:
    pkg = prepared_pkgs[0]
    data, code = req("PUT", f"/packages/{pkg['id']}", {"status": "picked_up"}, token=staff_token)
    test("PUT picked_up blocked (HANDOFF_REQUIRED)",
         code != 200 or "HANDOFF" in str(data).upper(),
         f"status={code}, resp={json.dumps(data)[:120]}")
else:
    test("PUT picked_up blocked", True, "SKIP -- no prepared packages")

# 7. Handoff endpoints
print("\n--- Handoff Endpoints ---")
scheduled_appts = [a for a in appointments if a.get("status") == "scheduled"]
if scheduled_appts:
    aid = scheduled_appts[0]["id"]
    data, code = req("POST", f"/appointments/{aid}/check-in", token=resident_token)
    test("POST check-in exists", code != 404, f"status={code}, msg={json.dumps(data)[:100]}")
    data, code = req("POST", f"/appointments/{aid}/verify-identity", {"identity_confirmed": True}, token=staff_token)
    test("POST verify-identity exists", code != 404, f"status={code}, msg={json.dumps(data)[:100]}")
    data, code = req("POST", f"/appointments/{aid}/signoff", {"recipient_name": "Test", "acknowledged": True}, token=staff_token)
    test("POST signoff exists", code != 404, f"status={code}, msg={json.dumps(data)[:100]}")
    data, code = req("POST", f"/appointments/{aid}/complete", token=staff_token)
    test("POST complete exists", code != 404, f"status={code}, msg={json.dumps(data)[:100]}")
else:
    print("  SKIP -- no scheduled appointments")

print("\n" + "=" * 60)
print(f"RESULTS: {PASS} passed, {FAIL} failed, {PASS+FAIL} total")
print("=" * 60)
if FAIL:
    print("\nFailed:")
    for n, p, d in RESULTS:
        if not p: print(f"  - {n}: {d}")
