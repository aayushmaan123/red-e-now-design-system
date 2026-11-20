-- RED-E-NOW
-- Migration 005: Package exception flags and resolution tracking

ALTER TABLE packages
    ADD COLUMN has_exception TINYINT(1) NOT NULL DEFAULT 0
    AFTER location_code;

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
        FOREIGN KEY (package_id) REFERENCES packages(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_exception_reporter
        FOREIGN KEY (reported_by) REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_exception_resolver
        FOREIGN KEY (resolved_by) REFERENCES users(id)
        ON DELETE RESTRICT,

    INDEX idx_exceptions_package_status (package_id, status),
    INDEX idx_exceptions_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE package_audit_log
    MODIFY COLUMN action ENUM(
        'created',
        'updated',
        'status_changed',
        'exception_flagged',
        'exception_resolved',
        'signed_off'
    ) NOT NULL;

CREATE INDEX idx_packages_has_exception
    ON packages(has_exception, status);
