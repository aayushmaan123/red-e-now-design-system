-- Sprint 3: Shared pickup-slot capacity control.
-- Each slot can accommodate up to three appointments.

CREATE TABLE IF NOT EXISTS pickup_slots (
    pickup_start DATETIME PRIMARY KEY,
    capacity INT NOT NULL DEFAULT 3,
    CONSTRAINT chk_slot_capacity CHECK (capacity > 0)
);
