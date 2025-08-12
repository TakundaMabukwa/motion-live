-- Create schedule table for job scheduling
CREATE TABLE IF NOT EXISTS schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_card_id UUID REFERENCES job_cards(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES technicians(id) ON DELETE SET NULL,
    technician_name VARCHAR(255),
    technician_email VARCHAR(255),
    job_number VARCHAR(255) NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    job_description TEXT,
    customer_name VARCHAR(255),
    vehicle_registration VARCHAR(100),
    job_location VARCHAR(255),
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    estimated_duration_hours INTEGER DEFAULT 2,
    status VARCHAR(50) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_technician_id ON schedule(technician_id);
CREATE INDEX IF NOT EXISTS idx_schedule_scheduled_date ON schedule(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_schedule_status ON schedule(status);
CREATE INDEX IF NOT EXISTS idx_schedule_job_card_id ON schedule(job_card_id);

-- Enable RLS
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users" ON schedule
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON schedule
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON schedule
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON schedule
    FOR DELETE USING (true);









