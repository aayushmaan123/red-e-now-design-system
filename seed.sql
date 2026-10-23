USE rede_now;

TRUNCATE TABLE packages;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users (id, name, email, password_hash, role, unit) VALUES
(1, 'Front Desk Staff', 'staff@redenow.com', 'pbkdf2:sha256:600000$uG3I1Wp8zL$1d39d3ed8dfd577180d1e57c6b758fa4d9b2db95a9cb84f67d4f954fcae13f99', 'staff', NULL),
(2, 'Jane Doe', 'jane@redenow.com', 'pbkdf2:sha256:600000$uG3I1Wp8zL$1d39d3ed8dfd577180d1e57c6b758fa4d9b2db95a9cb84f67d4f954fcae13f99', 'resident', '4B'),
(3, 'John Smith', 'john@redenow.com', 'pbkdf2:sha256:600000$uG3I1Wp8zL$1d39d3ed8dfd577180d1e57c6b758fa4d9b2db95a9cb84f67d4f954fcae13f99', 'resident', '2A');

INSERT INTO packages (carrier_name, tracking_code, resident_id, description, status, registered_by) VALUES
('Amazon', 'TBA304958201', 2, 'Medium Amazon Prime Box', 'received', 1),
('FedEx', 'FX9482019382', 2, 'Padded Envelope', 'available', 1),
('UPS', '1Z9999999999999999', 3, 'Large Heavy Box', 'scheduled', 1),
('USPS', '9400100000000000000000', 3, 'Small Letter Envelope', 'prepared', 1);
