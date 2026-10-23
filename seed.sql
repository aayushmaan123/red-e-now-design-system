USE rede_now;

TRUNCATE TABLE packages;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users (id, name, email, password_hash, role, unit) VALUES
(1, 'Front Desk Staff', 'staff@redenow.com', 'scrypt:32768:8:1$j0SREnJkAIApnYAo$f7f601aeb8aa912b029a73bcdb58088bc933252eacd2872b07d01c2660366939db77730361ad0d3c611019545c60a5684f740120e974d1a0266fdfb76a1dc5fe', 'staff', NULL),
(2, 'Jane Doe', 'jane@redenow.com', 'scrypt:32768:8:1$j0SREnJkAIApnYAo$f7f601aeb8aa912b029a73bcdb58088bc933252eacd2872b07d01c2660366939db77730361ad0d3c611019545c60a5684f740120e974d1a0266fdfb76a1dc5fe', 'resident', '4B'),
(3, 'John Smith', 'john@redenow.com', 'scrypt:32768:8:1$j0SREnJkAIApnYAo$f7f601aeb8aa912b029a73bcdb58088bc933252eacd2872b07d01c2660366939db77730361ad0d3c611019545c60a5684f740120e974d1a0266fdfb76a1dc5fe', 'resident', '2A');

INSERT INTO packages (carrier_name, tracking_code, resident_id, description, status, registered_by) VALUES
('Amazon', 'TBA304958201', 2, 'Medium Amazon Prime Box', 'received', 1),
('FedEx', 'FX9482019382', 2, 'Padded Envelope', 'available', 1),
('UPS', '1Z9999999999999999', 3, 'Large Heavy Box', 'scheduled', 1),
('USPS', '9400100000000000000000', 3, 'Small Letter Envelope', 'prepared', 1);
