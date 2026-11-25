-- RED-E-NOW
-- Migration 009: Account audit log.
-- Records account-level actions taken by staff, starting with
-- staff-issued password resets (POST /api/residents/<id>/reset-password).
-- Additive and safe to rerun.

CREATE TABLE IF NOT EXISTS account_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    changed_by INT NOT NULL,
    action ENUM('password_reset') NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_account_audit_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_account_audit_actor
        FOREIGN KEY (changed_by) REFERENCES users(id)
        ON DELETE RESTRICT,

    INDEX idx_account_audit_user_time (user_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
