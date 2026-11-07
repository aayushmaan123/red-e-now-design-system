
-- RED-E-NOW
-- Migration 001: Package locations and edit audit history
-- Apply once to the existing rede_now database.
-- Do not rerun schema.sql or seed.sql.

ALTER TABLE packages
    ADD COLUMN location_code VARCHAR(50) NULL
    AFTER description;

CREATE TABLE package_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    changed_by INT NOT NULL,
    action ENUM('created', 'updated', 'status_changed') NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_package_audit_package
        FOREIGN KEY (package_id)
        REFERENCES packages(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_package_audit_user
        FOREIGN KEY (changed_by)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    INDEX idx_package_audit_package_time (package_id, changed_at),
    INDEX idx_package_audit_user (changed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_packages_location_code
    ON packages(location_code);

CREATE INDEX idx_packages_status_arrived
    ON packages(status, arrived_at);
