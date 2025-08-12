-- Create vehicle_logs table
CREATE TABLE IF NOT EXISTS vehicle_logs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    status TEXT,
    vehicle_registration TEXT,
    cost_center TEXT,
    driver_name TEXT
);

-- Add RLS (Row Level Security) if needed
ALTER TABLE vehicle_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Users can view vehicle_logs" ON vehicle_logs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert vehicle_logs" ON vehicle_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update vehicle_logs" ON vehicle_logs
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_registration ON vehicle_logs(vehicle_registration);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_created_at ON vehicle_logs(created_at);
