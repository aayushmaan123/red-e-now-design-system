-- Sprint 3: scheduling configuration for the current building.
-- Additive migration; preserves existing packages and appointments.

CREATE TABLE IF NOT EXISTS buildings (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

INSERT INTO buildings (id, name)
VALUES (1, 'Main Building')
ON DUPLICATE KEY UPDATE name = name;

INSERT INTO scheduling_settings (
    building_id,
    open_time,
    close_time,
    slot_minutes,
    default_capacity,
    cancellation_cutoff_minutes
)
VALUES (
    1,
    '09:00:00',
    '17:00:00',
    30,
    3,
    0
)
ON DUPLICATE KEY UPDATE building_id = building_id;
