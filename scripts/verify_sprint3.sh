#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "======================================"
echo " RED-E NOW — SPRINT 3 VERIFICATION"
echo "======================================"

echo
echo "[1/5] Git branch"
branch=$(git branch --show-current)
echo "Branch: $branch"
test "$branch" = "test-main"

echo
echo "[2/5] Backend Python syntax"
(
  cd backend
  python3 -m py_compile \
    app.py \
    routes/appointments.py \
    routes/packages.py
)
echo "PASS"

echo
echo "[3/5] Frontend TypeScript"
(
  cd frontend
  npx tsc --noEmit
)
echo "PASS"

echo
echo "[4/5] Appointment/package consistency"
sudo mysql -D rede_now -e "
SELECT
    a.id AS appointment_id,
    a.status AS appointment_status,
    p.status AS package_status,
    p.tracking_code
FROM pickup_appointments a
JOIN packages p ON p.id = a.package_id
WHERE
    (a.status = 'scheduled'
     AND p.status NOT IN ('scheduled', 'prepared'))
    OR
    (a.status = 'completed'
     AND p.status <> 'picked_up');
"

echo
echo "[5/5] Slot capacity violations"
sudo mysql -D rede_now -e "
SELECT
    a.pickup_start,
    COUNT(*) AS active_bookings,
    COALESCE(s.capacity, 3) AS capacity
FROM pickup_appointments a
LEFT JOIN pickup_slots s
    ON s.pickup_start = a.pickup_start
WHERE a.status = 'scheduled'
GROUP BY a.pickup_start, s.capacity
HAVING COUNT(*) > COALESCE(s.capacity, 3);
"

echo
echo "Verification commands completed."
echo "IMPORTANT: Inspect the two SQL results above."
echo "Both should contain zero rows."
