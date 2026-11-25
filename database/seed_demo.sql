-- Red-E Now: demo data for an empty database that already has the schema.
--
-- Apply through the script, not by hand:
--     python scripts/db_bootstrap.py --seed      (empty database)
--     python scripts/db_bootstrap.py --reset     (wipe and reseed)
--
-- The script sets four session variables before running this file:
--     @seed_date            today at the building (YYYY-MM-DD)
--     @tz_offset_minutes    building UTC offset on that date (New York winter = -300)
--     @pickup_weekends      1 when PICKUP_WEEKENDS=true, else 0
--     @demo_password_hash   backend hash_password() of the demo password
-- No password hash is stored in this file. Every account gets the same demo
-- password (password123 unless DEMO_PASSWORD is set when seeding).
--
-- Everything is dated relative to @seed_date, so the data always looks current:
--     @d0  today, or the next pickup day if today is a weekend
--     @d1  the pickup day after @d0
--     @p1  the last pickup day before today, @p2 the one before that
-- DATETIME values are building wall-clock. TIMESTAMP values are UTC, written
-- as wall-clock minus @tz_offset_minutes.

SET @seed_date = COALESCE(@seed_date, CURDATE());
SET @tz = COALESCE(@tz_offset_minutes, -300);
SET @wk = COALESCE(@pickup_weekends, 0);

SET @today = CAST(@seed_date AS DATETIME);
SET @d0 = @today + INTERVAL (IF(@wk = 1, 0, CASE WEEKDAY(@today) WHEN 5 THEN 2 WHEN 6 THEN 1 ELSE 0 END)) DAY;
SET @d1 = @d0 + INTERVAL (IF(@wk = 1, 1, CASE WEEKDAY(@d0) WHEN 4 THEN 3 ELSE 1 END)) DAY;
SET @p1 = @today - INTERVAL (IF(@wk = 1, 1, CASE WEEKDAY(@today) WHEN 0 THEN 3 WHEN 6 THEN 2 ELSE 1 END)) DAY;
SET @p2 = @p1 - INTERVAL (IF(@wk = 1, 1, CASE WEEKDAY(@p1) WHEN 0 THEN 3 ELSE 1 END)) DAY;
SET @yesterday = @today - INTERVAL 1 DAY;

-- ── Building ────────────────────────────────────────────────
-- Desk hours run into the evening so the demo works after class too.

UPDATE buildings
SET name = 'Oakwood Residences', registration_code = 'REDENOW'
WHERE id = 1;

UPDATE scheduling_settings
SET open_time = '08:00:00', close_time = '20:00:00',
    slot_minutes = 30, default_capacity = 3, cancellation_cutoff_minutes = 0
WHERE building_id = 1;

-- ── People: 2 staff, 7 residents ────────────────────────────

INSERT INTO users (id, name, email, password_hash, role, unit, created_at) VALUES
(1, 'Maria Alvarez', 'staff@redenow.com',  @demo_password_hash, 'staff',    NULL,  @today - INTERVAL 60 DAY),
(2, 'Devon Brooks',  'desk@redenow.com',   @demo_password_hash, 'staff',    NULL,  @today - INTERVAL 45 DAY),
(3, 'Jane Doe',      'jane@redenow.com',   @demo_password_hash, 'resident', '4B',  @today - INTERVAL 40 DAY),
(4, 'John Smith',    'john@redenow.com',   @demo_password_hash, 'resident', '7A',  @today - INTERVAL 38 DAY),
(5, 'Priya Nair',    'priya@redenow.com',  @demo_password_hash, 'resident', '2C',  @today - INTERVAL 30 DAY),
(6, 'Marcus Reed',   'marcus@redenow.com', @demo_password_hash, 'resident', '9D',  @today - INTERVAL 27 DAY),
(7, 'Sofia Rossi',   'sofia@redenow.com',  @demo_password_hash, 'resident', '3A',  @today - INTERVAL 21 DAY),
(8, 'Elena Petrova', 'elena@redenow.com',  @demo_password_hash, 'resident', '5F',  @today - INTERVAL 14 DAY),
(9, 'Tom Becker',    'tom@redenow.com',    @demo_password_hash, 'resident', '11B', @today - INTERVAL 9 DAY);

-- ── Packages: 14, every status ──────────────────────────────
-- received 2 · available 4 · scheduled 3 · prepared 2 · picked_up 3

INSERT INTO packages
    (id, carrier_name, tracking_code, resident_id, description, location_code, status, registered_by, arrived_at)
VALUES
(1,  'UPS',       '1Z999AA10123456784',     3, 'Medium box',                  'SHELF-A1',  'received',  1, @yesterday + INTERVAL '16:40' HOUR_MINUTE - INTERVAL @tz MINUTE),
(2,  'Amazon',    'TBA612345678901',        3, 'Padded envelope',             'SHELF-A2',  'available', 1, @yesterday + INTERVAL '11:15' HOUR_MINUTE - INTERVAL @tz MINUTE),
(3,  'FedEx',     '794644790132',           4, 'Large box',                   'FLOOR-01',  'available', 2, @today - INTERVAL 2 DAY + INTERVAL '14:05' HOUR_MINUTE - INTERVAL @tz MINUTE),
(4,  'USPS',      '9400111899223197428490', 4, 'Small envelope',              'BIN-03',    'scheduled', 1, @today - INTERVAL 2 DAY + INTERVAL '10:30' HOUR_MINUTE - INTERVAL @tz MINUTE),
(5,  'DHL',       '4837261950',             5, 'Shoe box',                    'SHELF-B1',  'scheduled', 1, @yesterday + INTERVAL '09:50' HOUR_MINUTE - INTERVAL @tz MINUTE),
(6,  'UPS',       '1Z12345E0205271688',     6, 'Heavy box, two-person lift',  'FLOOR-02',  'prepared',  2, @today - INTERVAL 3 DAY + INTERVAL '13:20' HOUR_MINUTE - INTERVAL @tz MINUTE),
(7,  'FedEx',     '612938475610',           3, 'Document envelope',           'DESK-01',   'prepared',  1, @today - INTERVAL 2 DAY + INTERVAL '15:45' HOUR_MINUTE - INTERVAL @tz MINUTE),
(8,  'Amazon',    'TBA498213376502',        7, 'Small box',                   'SHELF-C2',  'received',  2, @yesterday + INTERVAL '17:05' HOUR_MINUTE - INTERVAL @tz MINUTE),
(9,  'USPS',      '9205590164917312751089', 6, 'Poly mailer',                 'BIN-07',    'available', 1, @p1 - INTERVAL 3 DAY + INTERVAL '12:30' HOUR_MINUTE - INTERVAL @tz MINUTE),
(10, 'UPS',       '1Z999AA10987654321',     3, 'Small box',                   'SHELF-A3',  'picked_up', 1, @p1 - INTERVAL 2 DAY + INTERVAL '11:00' HOUR_MINUTE - INTERVAL @tz MINUTE),
(11, 'FedEx',     '770112233445',           5, 'Garment bag',                 'RACK-01',   'picked_up', 2, @p1 - INTERVAL 2 DAY + INTERVAL '09:30' HOUR_MINUTE - INTERVAL @tz MINUTE),
(12, 'LaserShip', 'LS48201937',             8, 'Meal kit box',                'FRIDGE-01', 'picked_up', 1, @p2 - INTERVAL 2 DAY + INTERVAL '16:10' HOUR_MINUTE - INTERVAL @tz MINUTE),
(13, 'OnTrac',    'D10012345678901',        8, 'Flat box',                    'SHELF-D1',  'available', 2, @yesterday + INTERVAL '10:10' HOUR_MINUTE - INTERVAL @tz MINUTE),
(14, 'DHL',       '5519203746',             9, 'Poster tube',                 'RACK-02',   'scheduled', 1, @yesterday + INTERVAL '14:45' HOUR_MINUTE - INTERVAL @tz MINUTE);

-- ── Pickup appointments ─────────────────────────────────────
-- 3 completed handoffs, 5 upcoming (3 of them today), 1 cancelled.

INSERT INTO pickup_appointments
    (id, package_id, resident_id, pickup_start, pickup_end, status,
     checked_in_at, identity_verified_at, identity_verified_by,
     recipient_name, acknowledged_at, handed_off_at, signed_off_by, signoff_note, created_at)
VALUES
(1, 10, 3, @p1 + INTERVAL '10:00' HOUR_MINUTE, @p1 + INTERVAL '10:30' HOUR_MINUTE, 'completed',
    @p1 + INTERVAL '10:04' HOUR_MINUTE, @p1 + INTERVAL '10:05' HOUR_MINUTE, 1,
    'Jane Doe', @p1 + INTERVAL '10:06' HOUR_MINUTE, @p1 + INTERVAL '10:07' HOUR_MINUTE, 1, NULL,
    @p1 - INTERVAL 1 DAY + INTERVAL '19:00' HOUR_MINUTE - INTERVAL @tz MINUTE),
(2, 11, 5, @p1 + INTERVAL '15:30' HOUR_MINUTE, @p1 + INTERVAL '16:00' HOUR_MINUTE, 'completed',
    @p1 + INTERVAL '15:38' HOUR_MINUTE, @p1 + INTERVAL '15:40' HOUR_MINUTE, 2,
    'Priya Nair', @p1 + INTERVAL '15:41' HOUR_MINUTE, @p1 + INTERVAL '15:42' HOUR_MINUTE, 2, 'Photo ID checked',
    @p1 - INTERVAL 1 DAY + INTERVAL '20:15' HOUR_MINUTE - INTERVAL @tz MINUTE),
(3, 12, 8, @p2 + INTERVAL '12:00' HOUR_MINUTE, @p2 + INTERVAL '12:30' HOUR_MINUTE, 'completed',
    @p2 + INTERVAL '12:10' HOUR_MINUTE, @p2 + INTERVAL '12:12' HOUR_MINUTE, 1,
    'Elena Petrova', @p2 + INTERVAL '12:13' HOUR_MINUTE, @p2 + INTERVAL '12:14' HOUR_MINUTE, 1, NULL,
    @p2 - INTERVAL 1 DAY + INTERVAL '18:30' HOUR_MINUTE - INTERVAL @tz MINUTE),
(4, 4, 4, @d1 + INTERVAL '10:00' HOUR_MINUTE, @d1 + INTERVAL '10:30' HOUR_MINUTE, 'scheduled',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    @yesterday + INTERVAL '18:00' HOUR_MINUTE - INTERVAL @tz MINUTE),
(5, 5, 5, @d0 + INTERVAL '17:00' HOUR_MINUTE, @d0 + INTERVAL '17:30' HOUR_MINUTE, 'scheduled',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    @yesterday + INTERVAL '18:05' HOUR_MINUTE - INTERVAL @tz MINUTE),
(6, 6, 6, @d0 + INTERVAL '18:30' HOUR_MINUTE, @d0 + INTERVAL '19:00' HOUR_MINUTE, 'scheduled',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    @yesterday + INTERVAL '18:10' HOUR_MINUTE - INTERVAL @tz MINUTE),
(7, 7, 3, @d0 + INTERVAL '19:00' HOUR_MINUTE, @d0 + INTERVAL '19:30' HOUR_MINUTE, 'scheduled',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    @yesterday + INTERVAL '18:20' HOUR_MINUTE - INTERVAL @tz MINUTE),
(8, 14, 9, @d1 + INTERVAL '11:30' HOUR_MINUTE, @d1 + INTERVAL '12:00' HOUR_MINUTE, 'scheduled',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    @yesterday + INTERVAL '18:40' HOUR_MINUTE - INTERVAL @tz MINUTE),
(9, 9, 6, @p1 + INTERVAL '16:00' HOUR_MINUTE, @p1 + INTERVAL '16:30' HOUR_MINUTE, 'cancelled',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    @p1 - INTERVAL 1 DAY + INTERVAL '17:45' HOUR_MINUTE - INTERVAL @tz MINUTE);

-- ── Pickup slots: 24 half-hour slots a day for the next 7 days ──
-- (08:00 to 19:30). Weekends are skipped unless weekend pickups are on.

INSERT INTO pickup_slots (pickup_start, capacity)
SELECT @today + INTERVAL d.n DAY + INTERVAL (480 + s.n * 30) MINUTE, 3
FROM (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) AS d
CROSS JOIN (
    SELECT a.n + b.n * 6 AS n
    FROM (
        SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2
        UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
    ) AS a
    CROSS JOIN (
        SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    ) AS b
) AS s
WHERE @wk = 1 OR WEEKDAY(@today + INTERVAL d.n DAY) < 5;

-- ── Audit trail, matching what the API writes for each step ──

-- Registered at the desk.
INSERT INTO package_audit_log (package_id, changed_by, action, old_values, new_values, changed_at)
SELECT id, registered_by, 'created', NULL,
       JSON_OBJECT('carrier_name', carrier_name, 'tracking_code', tracking_code,
                   'location_code', location_code, 'status', 'received'),
       arrived_at
FROM packages
ORDER BY id;

-- Released for pickup.
INSERT INTO package_audit_log (package_id, changed_by, action, old_values, new_values, changed_at)
SELECT id, registered_by, 'status_changed',
       JSON_OBJECT('status', 'received'), JSON_OBJECT('status', 'available'),
       arrived_at + INTERVAL 25 MINUTE
FROM packages
WHERE status <> 'received'
ORDER BY id;

-- Booked by the resident.
INSERT INTO package_audit_log (package_id, changed_by, action, old_values, new_values, changed_at)
SELECT package_id, resident_id, 'status_changed',
       JSON_OBJECT('status', 'available'),
       JSON_OBJECT('status', 'scheduled', 'appointment_id', id),
       created_at
FROM pickup_appointments
ORDER BY id;

-- Cancelled by the resident (appointment 9).
INSERT INTO package_audit_log (package_id, changed_by, action, old_values, new_values, changed_at)
SELECT package_id, resident_id, 'status_changed',
       JSON_OBJECT('status', 'scheduled'),
       JSON_OBJECT('status', 'available', 'cancelled_appointment_id', id),
       pickup_start - INTERVAL 7 HOUR - INTERVAL @tz MINUTE
FROM pickup_appointments
WHERE status = 'cancelled'
ORDER BY id;

-- Pulled and staged by staff: 25 minutes before a completed pickup,
-- the evening before for the two that are waiting today.
INSERT INTO package_audit_log (package_id, changed_by, action, old_values, new_values, changed_at)
SELECT a.package_id, p.registered_by, 'status_changed',
       JSON_OBJECT('status', 'scheduled'), JSON_OBJECT('status', 'prepared'),
       IF(a.status = 'completed',
          a.pickup_start - INTERVAL 25 MINUTE - INTERVAL @tz MINUTE,
          @yesterday + INTERVAL '19:30' HOUR_MINUTE - INTERVAL @tz MINUTE)
FROM pickup_appointments AS a
JOIN packages AS p ON p.id = a.package_id
WHERE p.status IN ('prepared', 'picked_up') AND a.status IN ('scheduled', 'completed')
ORDER BY a.id;

-- Verified handoff: check-in, identity, sign-off, completion.
INSERT INTO package_audit_log (package_id, changed_by, action, old_values, new_values, changed_at)
SELECT package_id, resident_id, 'updated',
       JSON_OBJECT('checked_in_at', NULL),
       JSON_OBJECT('checked_in_at', DATE_FORMAT(checked_in_at, '%Y-%m-%dT%H:%i:%s')),
       checked_in_at - INTERVAL @tz MINUTE
FROM pickup_appointments
WHERE status = 'completed'
ORDER BY id;

INSERT INTO package_audit_log (package_id, changed_by, action, old_values, new_values, changed_at)
SELECT package_id, identity_verified_by, 'updated',
       JSON_OBJECT('identity_verified_at', NULL),
       JSON_OBJECT('identity_verified_at', DATE_FORMAT(identity_verified_at, '%Y-%m-%dT%H:%i:%s'),
                   'identity_verified_by', identity_verified_by),
       identity_verified_at - INTERVAL @tz MINUTE
FROM pickup_appointments
WHERE status = 'completed'
ORDER BY id;

INSERT INTO package_audit_log (package_id, changed_by, action, old_values, new_values, changed_at)
SELECT package_id, signed_off_by, 'signed_off', NULL,
       JSON_OBJECT('appointment_id', id, 'recipient_name', recipient_name,
                   'acknowledged_at', DATE_FORMAT(acknowledged_at, '%Y-%m-%dT%H:%i:%s'),
                   'recorded_by_staff', signed_off_by),
       acknowledged_at - INTERVAL @tz MINUTE
FROM pickup_appointments
WHERE status = 'completed'
ORDER BY id;

INSERT INTO package_audit_log (package_id, changed_by, action, old_values, new_values, changed_at)
SELECT package_id, signed_off_by, 'status_changed',
       JSON_OBJECT('status', 'prepared'),
       JSON_OBJECT('status', 'picked_up', 'appointment_id', id,
                   'handed_off_at', DATE_FORMAT(handed_off_at, '%Y-%m-%dT%H:%i:%s')),
       handed_off_at - INTERVAL @tz MINUTE
FROM pickup_appointments
WHERE status = 'completed'
ORDER BY id;
