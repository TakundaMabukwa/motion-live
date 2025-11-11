-- Insert sample inventory data based on your format

-- Insert categories
INSERT INTO public.inventory_categories (code, description, total_count, date_adjusted) VALUES
('VW-100IP', 'IP CAMERA DRIVER FACING', 43, '2024-10-29'),
('HS-SSD-WAVE(S)-1024G', 'HIKVISION 1TB SSD - LOCAL SUPPLIERS', 14, NULL);

-- Insert VW-100IP items
INSERT INTO public.inventory_items (category_code, serial_number, date_adjusted, container, direction, status) VALUES
('VW-100IP', '240812-P100-P2013', '2024-08-29', 'IN STOCK', NULL, 'IN STOCK'),
('VW-100IP', '240812-P100-P2014', '2024-08-29', 'IN STOCK', NULL, 'IN STOCK'),
('VW-100IP', '240812-P100-P2015', '2024-08-29', 'look for unit - 30.09.2025', NULL, 'LOOK FOR UNIT'),
('VW-100IP', '240812-P100-P2017', '2024-08-29', 'IN STOCK', NULL, 'IN STOCK'),
('VW-100IP', '240812-P100-P2018', '2024-08-29', 'IN STOCK', NULL, 'IN STOCK'),
('VW-100IP', '240812-P100-P2019', '2024-08-29', 'IN STOCK', NULL, 'IN STOCK'),
('VW-100IP', '240812-P100-P2032', '2024-08-29', 'IN STOCK', NULL, 'IN STOCK'),
('VW-100IP', '240812-P100-P2048', '2024-08-29', 'look for unit - 30.09.2025', NULL, 'LOOK FOR UNIT');

-- Insert 1TB HARDDRIVE items
INSERT INTO public.inventory_items (category_code, serial_number, date_adjusted, container, direction, status) VALUES
('HS-SSD-WAVE(S)-1024G', '30110509937', NULL, 'EPS - JC55594 - DE INSTALLED', NULL, 'INSTALLED'),
('HS-SSD-WAVE(S)-1024G', '30149923753', NULL, NULL, NULL, 'IN STOCK'),
('HS-SSD-WAVE(S)-1024G', '30149923756', NULL, NULL, NULL, 'IN STOCK'),
('HS-SSD-WAVE(S)-1024G', '30149925124', NULL, NULL, NULL, 'IN STOCK'),
('HS-SSD-WAVE(S)-1024G', '30149926375', NULL, NULL, NULL, 'IN STOCK');