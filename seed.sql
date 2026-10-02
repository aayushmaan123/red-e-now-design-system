USE redenow_db;

INSERT INTO users (full_name, email, password_hash, phone, role) VALUES
('Zeyad Mahmoud', 'ztm5@njit.edu', '$2b$10$hashpass123', '555-0192', 'customer'),
('John Driver', 'driver@redenow.com', '$2b$10$hashpass123', '555-0193', 'driver'),
('Admin User', 'admin@redenow.com', '$2b$10$hashpass123', '555-0194', 'admin');

INSERT INTO user_addresses (user_id, street_address, city, state, zip_code) VALUES
(1, '123 University Ave', 'Newark', 'NJ', '07102');

INSERT INTO categories (category_name, description) VALUES
('Beverages', 'Cold and hot drinks'),
('Entrees', 'Main course meals');

INSERT INTO products (category_id, name, description, price) VALUES
(1, 'Iced Coffee', 'Fresh cold brew', 4.50),
(2, 'Burger & Fries', 'Classic beef burger', 12.99);

INSERT INTO orders (user_id, address_id, total_amount, order_status) VALUES
(1, 1, 17.49, 'in_transit');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 4.50),
(1, 2, 1, 12.99);

INSERT INTO payments (order_id, payment_method, payment_status, transaction_id, paid_at) VALUES
(1, 'card', 'completed', 'TXN-987654321', NOW());

INSERT INTO deliveries (order_id, driver_id, delivery_status) VALUES
(1, 2, 'picked_up');

INSERT INTO reviews (user_id, product_id, rating, comment) VALUES
(1, 2, 5, 'Great burger!');
