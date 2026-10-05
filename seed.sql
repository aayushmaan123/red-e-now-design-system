INSERT INTO users (id, name, email, password_hash, role) VALUES
(1, 'John Resident', 'resident@example.com', 'scrypt:32768:8:1$RTV7JGWLqGTVpCCS$5343321e23e4e4dab0daacc57582fecd03293af1c665ddabad516db287ac3b73eddd3fd9b45118c011eb12708fa17e89eaf98f128aebe8e4137ffb9870c6cf87', 'resident'),
(2, 'Sarah Staff', 'staff@example.com', 'scrypt:32768:8:1$RTV7JGWLqGTVpCCS$5343321e23e4e4dab0daacc57582fecd03293af1c665ddabad516db287ac3b73eddd3fd9b45118c011eb12708fa17e89eaf98f128aebe8e4137ffb9870c6cf87', 'staff');

INSERT INTO buildings (id, name, address) VALUES 
(1, 'Skyline Towers', '123 Main St, Newark, NJ');

INSERT INTO units (id, building_id, unit_number) VALUES 
(1, 1, '4B');

INSERT INTO residents (id, user_id, unit_id, phone) VALUES 
(1, 1, 1, '555-0199');

INSERT INTO staff (id, user_id, employee_code) VALUES 
(1, 2, 'EMP-101');

INSERT INTO packages (tracking_number, resident_id, carrier, status) VALUES
('1Z9999999999999999', 1, 'UPS', 'Received'),
('940010000000000000', 1, 'USPS', 'Received');
