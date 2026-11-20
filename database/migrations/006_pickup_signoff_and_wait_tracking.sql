-- RED-E-NOW
-- Migration 006: Pickup handoff signoff and resident wait-time tracking

ALTER TABLE pickup_appointments
    ADD COLUMN checked_in_at DATETIME NULL AFTER status,
    ADD COLUMN handed_off_at DATETIME NULL AFTER checked_in_at,
    ADD COLUMN signed_off_by INT NULL AFTER handed_off_at,
    ADD COLUMN signoff_note VARCHAR(255) NULL AFTER signed_off_by,
    ADD CONSTRAINT fk_pickup_signed_off_by
        FOREIGN KEY (signed_off_by) REFERENCES users(id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT chk_pickup_wait_order
        CHECK (
            handed_off_at IS NULL
            OR checked_in_at IS NULL
            OR handed_off_at >= checked_in_at
        );

CREATE INDEX idx_pickup_handoff_metrics
    ON pickup_appointments(status, checked_in_at, handed_off_at);
