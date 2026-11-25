-- Migration 008: Add registration_code to buildings for self-service signup.
-- Residents enter this code during registration to verify they live in the building.

ALTER TABLE buildings
    ADD COLUMN registration_code VARCHAR(20) NOT NULL DEFAULT 'REDENOW' AFTER name;

-- Set a default code for the existing building.
UPDATE buildings SET registration_code = 'REDENOW' WHERE id = 1;
