-- Create job_photos table for storing job-related photos
CREATE TABLE IF NOT EXISTS job_photos (
    id SERIAL PRIMARY KEY,
    job_number VARCHAR(255) NOT NULL,
    vehicle_registration VARCHAR(255),
    vehicle_id INTEGER REFERENCES vehicles_ip(id),
    photo_url TEXT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    description TEXT,
    photo_type VARCHAR(50) NOT NULL CHECK (photo_type IN ('before', 'after')),
    captured_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_photos_job_number ON job_photos(job_number);
CREATE INDEX IF NOT EXISTS idx_job_photos_vehicle_registration ON job_photos(vehicle_registration);
CREATE INDEX IF NOT EXISTS idx_job_photos_photo_type ON job_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_job_photos_created_at ON job_photos(created_at);

-- Add comments for documentation
COMMENT ON TABLE job_photos IS 'Stores photos related to jobs (before/after photos)';
COMMENT ON COLUMN job_photos.job_number IS 'Reference to the job card';
COMMENT ON COLUMN job_photos.vehicle_registration IS 'Vehicle registration number';
COMMENT ON COLUMN job_photos.vehicle_id IS 'Reference to vehicles_ip table';
COMMENT ON COLUMN job_photos.photo_url IS 'URL or path to the photo file';
COMMENT ON COLUMN job_photos.filename IS 'Original filename of the photo';
COMMENT ON COLUMN job_photos.description IS 'Description of what the photo shows';
COMMENT ON COLUMN job_photos.photo_type IS 'Type of photo: before or after';
COMMENT ON COLUMN job_photos.captured_at IS 'When the photo was captured';
COMMENT ON COLUMN job_photos.created_at IS 'When the record was created';
COMMENT ON COLUMN job_photos.updated_at IS 'When the record was last updated';

-- Add columns to job_cards table if they don't exist
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS before_photos_count INTEGER DEFAULT 0;
ALTER TABLE job_cards ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles_ip(id);

-- Add comments for new columns
COMMENT ON COLUMN job_cards.before_photos_count IS 'Number of before photos taken for this job';
COMMENT ON COLUMN job_cards.vehicle_id IS 'Reference to the vehicle in vehicles_ip table';
