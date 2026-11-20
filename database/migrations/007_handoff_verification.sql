-- Sprint 4: identity verification and resident acknowledgement.
-- Apply once, after migrations 005 and 006.

ALTER TABLE pickup_appointments
    ADD COLUMN identity_verified_at DATETIME NULL
        AFTER checked_in_at,
    ADD COLUMN identity_verified_by INT NULL
        AFTER identity_verified_at,
    ADD COLUMN recipient_name VARCHAR(150) NULL
        AFTER identity_verified_by,
    ADD COLUMN acknowledged_at DATETIME NULL
        AFTER recipient_name,
    ADD CONSTRAINT fk_pickup_identity_verified_by
        FOREIGN KEY (identity_verified_by)
        REFERENCES users(id);
