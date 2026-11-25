-- Red-E Now: full schema in one file.
--
-- This is schema.sql plus migrations 001-009, written as the final shape of
-- every table. It is idempotent: every statement is CREATE TABLE IF NOT EXISTS
-- or an insert that leaves existing rows alone, so running it twice is safe.
--
-- Apply it with:   python scripts/db_bootstrap.py           (schema only)
--                  python scripts/db_bootstrap.py --seed    (schema + demo data)
--                  python scripts/db_bootstrap.py --reset   (wipe, schema, demo data)
--
-- Target: an empty database, or one already at this schema. It does not
-- upgrade a half-migrated database; use --reset for that.
-- There is no USE statement: the script connects to DB_NAME.
--
-- Works on MySQL 8 and on TiDB Cloud. The /*T![...] */ comments are TiDB
-- options that MySQL reads as plain comments; they keep ids sequential.
--
-- Time columns: DATETIME = wall-clock time at the building,
-- TIMESTAMP = an instant, read and written in UTC (see backend/utils/clock.py).

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('resident', 'staff') NOT NULL,
    unit VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 /*T![auto_id_cache] AUTO_ID_CACHE=1 */;

CREATE TABLE IF NOT EXISTS buildings (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    registration_code VARCHAR(20) NOT NULL DEFAULT 'REDENOW',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 /*T![auto_id_cache] AUTO_ID_CACHE=1 */;

CREATE TABLE IF NOT EXISTS scheduling_settings (
    building_id INT NOT NULL,
    open_time TIME NOT NULL DEFAULT '09:00:00',
    close_time TIME NOT NULL DEFAULT '17:00:00',
    slot_minutes INT NOT NULL DEFAULT 30,
    default_capacity INT NOT NULL DEFAULT 3,
    cancellation_cutoff_minutes INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (building_id),
    CONSTRAINT fk_scheduling_building
        FOREIGN KEY (building_id) REFERENCES buildings(id),
    CONSTRAINT chk_scheduling_slot_minutes
        CHECK (slot_minutes IN (15, 30, 60)),
    CONSTRAINT chk_scheduling_capacity
        CHECK (default_capacity > 0),
    CONSTRAINT chk_scheduling_cutoff
        CHECK (cancellation_cutoff_minutes >= 0),
    CONSTRAINT chk_scheduling_hours
        CHECK (close_time > open_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    carrier_name VARCHAR(50) NOT NULL,
    tracking_code VARCHAR(100) NOT NULL,
    resident_id INT NOT NULL,
    description TEXT DEFAULT NULL,
    location_code VARCHAR(50) NULL,
    has_exception TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('received', 'available', 'scheduled', 'prepared', 'picked_up')
        NOT NULL DEFAULT 'received',
    arrived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registered_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_packages_resident
        FOREIGN KEY (resident_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_packages_registered_by
        FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_packages_location_code (location_code),
    INDEX idx_packages_status_arrived (status, arrived_at),
    INDEX idx_packages_has_exception (has_exception, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 /*T![auto_id_cache] AUTO_ID_CACHE=1 */;

CREATE TABLE IF NOT EXISTS package_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    changed_by INT NOT NULL,
    action ENUM(
        'created',
        'updated',
        'status_changed',
        'exception_flagged',
        'exception_resolved',
        'signed_off'
    ) NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_package_audit_package
        FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT,
    CONSTRAINT fk_package_audit_user
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_package_audit_package_time (package_id, changed_at),
    INDEX idx_package_audit_user (changed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 /*T![auto_id_cache] AUTO_ID_CACHE=1 */;

CREATE TABLE IF NOT EXISTS pickup_appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    resident_id INT NOT NULL,
    pickup_start DATETIME NOT NULL,
    pickup_end DATETIME NOT NULL,
    status ENUM('scheduled', 'cancelled', 'completed')
        NOT NULL DEFAULT 'scheduled',
    checked_in_at DATETIME NULL,
    identity_verified_at DATETIME NULL,
    identity_verified_by INT NULL,
    recipient_name VARCHAR(150) NULL,
    acknowledged_at DATETIME NULL,
    handed_off_at DATETIME NULL,
    signed_off_by INT NULL,
    signoff_note VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pickup_package
        FOREIGN KEY (package_id) REFERENCES packages(id),
    CONSTRAINT fk_pickup_resident
        FOREIGN KEY (resident_id) REFERENCES users(id),
    CONSTRAINT fk_pickup_identity_verified_by
        FOREIGN KEY (identity_verified_by) REFERENCES users(id),
    CONSTRAINT fk_pickup_signed_off_by
        FOREIGN KEY (signed_off_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_pickup_time
        CHECK (pickup_end > pickup_start),
    CONSTRAINT chk_pickup_wait_order
        CHECK (
            handed_off_at IS NULL
            OR checked_in_at IS NULL
            OR handed_off_at >= checked_in_at
        ),
    INDEX idx_pickup_resident (resident_id, status),
    INDEX idx_pickup_start (pickup_start, status),
    INDEX idx_pickup_package (package_id, status),
    INDEX idx_pickup_handoff_metrics (status, checked_in_at, handed_off_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 /*T![auto_id_cache] AUTO_ID_CACHE=1 */;

CREATE TABLE IF NOT EXISTS pickup_slots (
    pickup_start DATETIME PRIMARY KEY,
    capacity INT NOT NULL DEFAULT 3,
    CONSTRAINT chk_slot_capacity CHECK (capacity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS package_exceptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    reported_by INT NOT NULL,
    exception_type ENUM('damaged', 'missing', 'wrong_recipient', 'unlabeled', 'other') NOT NULL,
    notes VARCHAR(500) NULL,
    status ENUM('open', 'resolved') NOT NULL DEFAULT 'open',
    resolved_by INT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_exception_package
        FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE RESTRICT,
    CONSTRAINT fk_exception_reporter
        FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_exception_resolver
        FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_exceptions_package_status (package_id, status),
    INDEX idx_exceptions_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 /*T![auto_id_cache] AUTO_ID_CACHE=1 */;

CREATE TABLE IF NOT EXISTS account_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    changed_by INT NOT NULL,
    action ENUM('password_reset') NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_account_audit_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_account_audit_actor
        FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_account_audit_user_time (user_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 /*T![auto_id_cache] AUTO_ID_CACHE=1 */;

-- The API serves one building (id 1) and needs its settings row to exist.
-- Existing rows are left untouched.
INSERT INTO buildings (id, name, registration_code)
VALUES (1, 'Main Building', 'REDENOW')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO scheduling_settings (
    building_id, open_time, close_time,
    slot_minutes, default_capacity, cancellation_cutoff_minutes
)
VALUES (1, '09:00:00', '17:00:00', 30, 3, 0)
ON DUPLICATE KEY UPDATE building_id = building_id;
