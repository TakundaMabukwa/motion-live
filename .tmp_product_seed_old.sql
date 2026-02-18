-- Create product_items table with pricing data
CREATE TABLE IF NOT EXISTS product_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    product VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    discount DECIMAL(5,2) NOT NULL DEFAULT 0,
    rental DECIMAL(10,2) NOT NULL DEFAULT 0,
    installation DECIMAL(10,2) NOT NULL DEFAULT 0,
    subscription DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert product data
INSERT INTO product_items (id, type, product, description, category, price, quantity, discount, rental, installation, subscription) VALUES
('8a11682e-5958-4b9b-aed5-5aa49ff2e0e4', 'FMS', 'Skylink Pro', 'Telematics Unit with Accelerometer and 4x inputs', 'HARDWARE', 4270, 1, 0, 168, 550, 349),
('d52e3106-3f3d-4762-8dfa-9da37e87478d', 'FMS', 'Skylink Asset (Trailer)', 'Telematics Unit with Accelerometer and 4x inputs for Trailers', 'HARDWARE', 4649, 1, 0, 182, 550, 299),
('ef165063-5640-4279-8054-a7754f8782a5', 'FMS', 'Skylink Scout 12V', 'Telematics Unit with Accelerometer and 1x input', 'HARDWARE', 3032, 1, 0, 119, 450, 299),
('4419ad01-0866-47d9-9363-337fc32bc693', 'FMS', 'Skylink Scout 24V', 'Telematics Unit with Accelerometer and 1x input', 'HARDWARE', 3032, 1, 0, 119, 450, 299),
('deccb2a4-5406-4151-8bb9-fff13f97b7c4', 'FMS', 'Skylink OBD', 'Telematics unit with accelerometer and no inputs', 'HARDWARE', 3184, 1, 0, 125, 250, 299),
('20c5c564-bf65-4377-be3c-8b5c1be165df', 'FMS', 'Skylink Motorbike', 'Telematics Unit with Accelerometer and 4x inputs for Motorcycles', 'HARDWARE', 2708, 1, 0, 106, 350, 299),
('24cd3dfe-9e9a-4837-a136-b325feb401f5', 'BACKUP', 'Beame Backup Unit', 'Wireless recovery unit only', 'HARDWARE', 595, 1, 0, 23, 250, 89),
('d9d9957d-caa3-41fb-a7e5-e675dc79aa0f', 'MODULE', 'Sky-Safety', '3 axis accelerometer - Driver Behavior/Accident', 'MODULES', 1294, 1, 0, 51, 0, 0),
('c1180e2f-171a-4a4b-9855-4749a3465070', 'MODULE', 'Sky-Can', 'Canbus integration', 'MODULES', 1011, 1, 0, 40, 0, NULL),
('0c94ec0e-5165-4d15-9aeb-eaa5c3f6a7df', 'MODULE', 'Driver ID Keypad', 'Keypad Driver ID works with Skylink Pro only', 'MODULES', 687, 1, 0, 27, NULL, 0),
('5de91661-874c-4efd-998a-d7bd2967f061', 'MODULE', 'Driver ID Dallas Tag', 'Tag for Driver ID works with Skylink Pro only', 'MODULES', 595, 1, 0, 23, 150, 0),
('ea6a7577-6421-4946-bab0-5a170bb52d7e', 'MODULE', 'Starter Cut Relay', 'Starter cut', 'MODULES', 195, 1, 0, 8, NULL, 0),
('3542df1c-0c73-4e93-8e46-e6c854105f5d', 'MODULE', 'Sky GPS', 'External GPS', 'MODULES', 808, 1, 0, 32, 0, 0),
('a4c18f5d-e6ef-45fd-8731-3b4437eb4736', 'MODULE', 'Sky Temp', 'Temperature Probe', 'MODULES', 1011, 1, 0, 40, 650, 22),
('364a5956-64d3-4c02-afd9-c89a8caae9ba', 'MODULE', 'Sky Doorlock', 'Remote Automatic Secure Doorlock', 'MODULES', 6995, 1, 0, 274, 650, 12),
('3ed69f4d-8e72-4c96-8681-f5eb3e35ffa0', 'MODULE', 'Sky Door Switches', 'Magnetic Door Switch', 'MODULES', 355, 1, 0, 14, 650, 0),
('f83f7a8b-fb86-4f19-84b5-fe6255ce53c3', 'MODULE', 'Sky Panic', 'Panic Button', 'MODULES', 195, 1, 0, 8, NULL, 0),
('aa0988dc-6462-4767-a6ce-a9e2ef053206', 'MODULE', 'Fuel Probe Single Tank', 'Fuel Monitoring System works with Skylink Pro only', 'MODULES', 6259, 1, 0, 246, 650, 22),
('044258a0-58dd-4a9d-b9a1-06ec3cac4303', 'MODULE', 'Fuel Probe Dual Tank', 'Fuel Monitoring System works with Skylink Pro only', 'MODULES', 11695, 1, 0, 459, 1100, 22),
('d842ef41-7f77-4a23-a306-018578537801', 'MODULE', 'Fuel T-Connector', 'Requirement for Dual Probes', 'MODULES', 606, 1, 0, 24, 0, 0),
('64104377-1ece-497b-ad83-2f7e3f8b1f11', 'MODULE', '7M Fuel Harness', '7M Fuel Harness', 'MODULES', 643, 1, 0, 25, NULL, 0),
('c2d0176c-5223-4dcb-888d-7fb500dcb415', 'MODULE', '3M Fuel Harness', '3M Fuel Harness', 'MODULES', 586, 1, 0, 23, 0, 0),
('eb74fd62-1046-4215-9592-f738c8e947e2', 'MODULE', '1M Fuel Harness', 'Probe Harness', 'MODULES', 405, 1, 0, 16, 0, 0),
('f9a71b75-35c1-418f-bec1-be7229a77ba5', 'INPUT', 'PTO Switch', 'PTO Integration', 'INPUTS', 195, 1, 0, 8, 150, 0),
('8aabd330-51f2-40b1-aedc-4cbb3275786a', 'INPUT', 'Dash Tamper', 'Dash Tamper Switch', 'INPUTS', 195, 1, 0, 8, 150, 0),
('dca3cc7a-7722-432a-b4cc-76718a4487a9', 'INPUT', 'Limp Mode', 'Limp Mode', 'INPUTS', 195, 1, 0, 8, 150, 0),
('a34af4fc-7bfe-4a3d-add2-d00847c992e2', 'INPUT', 'Panic Flush/Industrial', 'Panic Button', 'INPUTS', 345, 1, 0, 14, 150, 0),
('3a591456-af87-4d7c-a34d-23ad12350d31', 'PFK CAMERA', 'Video Main Unit', NULL, 'CAMERA EQUIPMENT', 10500, 1, 0, 558, 1100, 295),
('ee9460ca-c9ce-4a28-9c8f-e6c2ddec6d74', 'PFK CAMERA', 'INFRARED CAMERA', NULL, 'CAMERA EQUIPMENT', 600, 1, 0, 24, 0, 0),
('9469eef4-0b62-43e6-8a50-9cfd440e0c6e', 'PFK CAMERA', 'NON-IR CAMERA', NULL, 'CAMERA EQUIPMENT', 600, 1, 0, 24, 0, 0),
('4ade10db-9a1d-4507-8053-cd324ac81e21', 'PFK CAMERA', 'OUTSIDE IR CAMERA', NULL, 'CAMERA EQUIPMENT', 640, 1, 0, 25, 0, 0),
('d0cb622c-7b43-4cd3-9e2b-3c72d20c9c77', 'PFK CAMERA', 'EXTENSION CABLE 3M', NULL, 'CAMERA EQUIPMENT', 100, 1, 0, 4, 0, 0),
('0d4be23b-edae-404a-a8d9-b6a149dbc4d8', 'PFK CAMERA', 'EXTENSION CABLE 5M', NULL, 'CAMERA EQUIPMENT', 190, 1, 0, 7, 0, 0),
('703f0ec4-09bc-4140-b149-4711e22b7ae5', 'PFK CAMERA', 'EXTENSION CABLE 10M', NULL, 'CAMERA EQUIPMENT', 360, 1, 0, 14, 0, 0),
('906519f2-5ef5-4843-b3b7-d59ac9c71a36', 'PFK CAMERA', 'EXTENSION CABLE 15M', NULL, 'CAMERA EQUIPMENT', 440, 1, 0, 17, 0, 0),
('03e98975-aa9f-4af3-b184-7e48cec2b092', 'PFK CAMERA', 'PANIC', NULL, 'CAMERA EQUIPMENT', 63, 1, 0, 2, 0, 0),
('18b15f2b-2cfd-46f3-aa9a-ec596d9d2da0', 'PFK CAMERA', 'MIC & SPEAKER', NULL, 'CAMERA EQUIPMENT', 610, 1, 0, 24, 0, 0),
('0688b7ca-05aa-477a-bcb0-93c5f3c64926', 'PFK CAMERA', 'BRACKET', NULL, 'CAMERA EQUIPMENT', 576, 1, 0, 23, 0, 0),
('42b87e7b-027f-4350-bce4-edacb21e671b', 'PFK CAMERA', 'BREATHALOK', NULL, 'CAMERA EQUIPMENT', 11000, 1, 0, 432, 450, 0),
('9b31209a-ac6f-4d76-89e0-704310186330', 'PFK CAMERA', 'BREATHALOK OVERRIDE SWITCH', NULL, 'CAMERA EQUIPMENT', 200, 1, 0, 8, 0, NULL),
('dd664f5a-4793-460e-817a-58ff2a5e8b62', 'DASHCAM', 'LED Alarm', 'Audible and Visual LED Alarm', 'AI MOVEMENT DETECTION', 2370, 1, 0, 93, 750, 295),
('701686b7-e764-48e8-a7e7-dfc4f3e9d3c7', 'DASHCAM', 'PDC Camera', 'Pedestrian Detection Camera', 'AI MOVEMENT DETECTION', 2222, 2, 0, 87, 0, NULL),
('ed4c446f-277f-4ca4-b45b-777fb67afa6a', 'PTT', 'Sky Talk Portable', 'Portable PTT Radio Entry Level', 'PTT RADIOS', 2973, 1, 0, 117, 0, 225),
('45b3f8f7-e24c-4e83-bdc9-d5bebe67ecec', 'PTT', 'Sky Talk Portable with Keypad', 'Portable PTT Radio with Keypad - non stock', 'PTT RADIOS', 3683, 1, 0, 144, 0, 225),
('ad17a2c4-ca59-4208-8185-ffa3a4169eba', 'PTT', 'Sky Talk Mobile', 'Mobile PTT Radio for Vehicles', 'PTT RADIOS', 3461, 1, 0, 136, 550, 225),
('dc331b5e-2acc-41b1-97b7-13f1e448a4be', 'PTT', 'Sky Talk Portable with NFC', 'Portable PTT Radio with NFC Tagging', 'PTT RADIOS', 3239, 1, 0, 127, 0, 225),
('351876b9-b312-48d5-9039-571e73dc31da', 'PTT', 'Despatcher - Per User', 'Dispatcher Cost per User', 'PTT RADIOS', 0, 1, 0, 0, 0, 225),
('cde12b2b-58de-4152-9960-5baf5f0b4707', 'PTT', 'Set Up and Training', 'Set Up and Training', 'PTT RADIOS', 0, 1, 0, 0, 1500, 0),
('33c6a892-468b-4fab-a298-1bc15ea997e9', 'PTT', 'NFC Tags', 'Round Type Tag', 'PTT RADIOS', 133, 1, 0, 5, 0, 0),
('6de10b1f-89d7-45d3-8262-f0940bd75a95', 'DVR CAMERA', '4 Channel DVR', '4 Channel DVR Hardrive', 'CAMERA EQUIPMENT', 10272, 1, 1540, 403, 1100, 295),
('96e241aa-f62c-4e6a-bd6b-2713b4d8074f', 'DVR CAMERA', '4 Channel DVR - Compact', '4 Channel DVR Hardrive - Compact', 'CAMERA EQUIPMENT', 7161, 1, 1074, 281, 1100, 295),
('165af7a3-300c-42fe-9148-bd0af4c4e0bc', 'DVR CAMERA', '8 Channel DVR', '8 Channel DVR Hardrive', 'CAMERA EQUIPMENT', 10865, 1, 1629, 426, 1100, 295),
('f258789b-6a34-4365-b53a-34914efec19f', 'DVR CAMERA', 'Dual Lense and Camera', 'Road Facing and In-Cab Camera', 'CAMERA EQUIPMENT', 2815, 1, 422, 110, 0, 0),
('5b4fa678-7b14-4987-bc9e-98f08c4d9879', 'DVR CAMERA', 'Driver Facing Camera only', 'Driver Facing Camera only', 'CAMERA EQUIPMENT', 938, 1, 140, 37, 0, 0),
('7326a840-a34e-4826-8c63-efe00756cdf7', 'DVR CAMERA', 'Road Facing Camera only', 'Road Facing Camera only', 'CAMERA EQUIPMENT', 1037, 1, 155, 41, 0, 0),
('29c825e3-1211-47de-9392-f85cdcd16bd3', 'DVR CAMERA', 'Outside IR cameras', 'Outside Infrared Cameras', 'CAMERA EQUIPMENT', 938, 2, 281, 37, 0, 0),
('ba14eda7-ad85-411d-9b7b-ef488f0a85d1', 'DVR CAMERA', '4 Pin Cable 3M', 'Cabling', 'CAMERA EQUIPMENT', 74, 2, 22, 3, 0, 0),
('64fbb046-716c-4616-bebf-883d00c84559', 'DVR CAMERA', '4 Pin Cable 5M', 'Cabling', 'CAMERA EQUIPMENT', 148, 2, 44, 6, 0, 0),
('49d824e6-b45e-4f76-97ca-8cad8e247042', 'DVR CAMERA', '4 Pin Cable 10M', 'Cabling', 'CAMERA EQUIPMENT', 247, 2, 74, 10, 0, 0),
('4d5a3f9e-10c3-416c-bff8-369d7bc6f51c', 'DVR CAMERA', '1TB HD Memory Card', '1TB HD Memory Card', 'CAMERA EQUIPMENT', 2420, 1, 363, 95, 0, 0),
('f18fae87-37dd-4e43-9705-f8661194c752', 'DVR CAMERA', '2TB HD Memory Card', '2TB HD Memory Card', 'CAMERA EQUIPMENT', 3210, 1, 481, 126, 0, 0),
('e36f18b2-c8d9-4323-9adc-41bfdf0039d9', 'DVR CAMERA', '2.5" SD 256GB', '256GB SD Memory Card', 'CAMERA EQUIPMENT', 1803, 1, 270, 71, 0, 0),
('3b1ef2c1-f1ec-4e00-ace6-97ff02295262', 'DVR CAMERA', '2.5" SSD 480GB', '480GB SD Memory Card', 'CAMERA EQUIPMENT', 3358, 1, 503, 132, 0, 0);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_items_type ON product_items(type);
CREATE INDEX IF NOT EXISTS idx_product_items_category ON product_items(category);

-- Enable Row Level Security
ALTER TABLE product_items ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to read product_items" ON product_items
    FOR SELECT USING (auth.role() = 'authenticated'); 
