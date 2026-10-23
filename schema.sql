USE rede_now;

DROP TABLE IF EXISTS packages;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('resident', 'staff') NOT NULL,
    unit VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    carrier_name VARCHAR(50) NOT NULL,
    tracking_code VARCHAR(100) NOT NULL,
    resident_id INT NOT NULL,
    description TEXT DEFAULT NULL,
    status ENUM('received', 'available', 'scheduled', 'prepared', 'picked_up') NOT NULL DEFAULT 'received',
    arrived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registered_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
