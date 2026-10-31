-- Sprint 3: Resident package pickup scheduling.
-- Safe to run on the existing database; does not delete existing data.

CREATE TABLE IF NOT EXISTS pickup_appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    resident_id INT NOT NULL,
    pickup_start DATETIME NOT NULL,
    pickup_end DATETIME NOT NULL,
    status ENUM('scheduled', 'cancelled', 'completed')
        NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_pickup_package
        FOREIGN KEY (package_id) REFERENCES packages(id),

    CONSTRAINT fk_pickup_resident
        FOREIGN KEY (resident_id) REFERENCES users(id),

    CONSTRAINT chk_pickup_time
        CHECK (pickup_end > pickup_start),

    INDEX idx_pickup_resident (resident_id, status),
    INDEX idx_pickup_start (pickup_start, status),
    INDEX idx_pickup_package (package_id, status)
);
