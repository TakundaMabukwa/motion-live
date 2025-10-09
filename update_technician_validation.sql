-- Function to check for technician availability with improved date comparison
-- This function checks if a technician is booked for another job within a 3-hour window
-- on the SAME DAY as the requested booking time.

CREATE OR REPLACE FUNCTION check_technician_availability(
  p_technician_name TEXT, 
  p_job_date TIMESTAMP WITH TIME ZONE,
  p_hours_buffer INT DEFAULT 3,
  p_job_id UUID DEFAULT NULL
)
RETURNS TABLE (
  job_id UUID,
  job_number TEXT,
  job_date TIMESTAMP WITH TIME ZONE,
  start_time TIMESTAMP WITH TIME ZONE,
  technician_name TEXT,
  customer_name TEXT,
  job_description TEXT,
  status TEXT
) AS $$
DECLARE
  target_date DATE;
  target_hour INT;
BEGIN
  -- Extract the date and hour from the input timestamp
  target_date := DATE(p_job_date);
  target_hour := EXTRACT(HOUR FROM p_job_date);
  
  -- Find jobs for this technician that are not cancelled or completed
  RETURN QUERY
  SELECT 
    jc.id AS job_id,
    jc.job_number,
    jc.job_date,
    jc.start_time,
    jc.technician_name,
    jc.customer_name,
    jc.job_description,
    jc.status
  FROM job_cards jc
  WHERE 
    jc.technician_name = p_technician_name
    AND jc.status NOT IN ('cancelled', 'completed')
    -- If job_id is provided, exclude it from results (for updates)
    AND (p_job_id IS NULL OR jc.id != p_job_id)
    -- Check if job is on the same date
    AND DATE(COALESCE(jc.start_time, jc.job_date)) = target_date
    -- Check if job is within the time buffer
    AND (
      -- For jobs with specific start times
      (jc.start_time IS NOT NULL AND 
       ABS(EXTRACT(HOUR FROM jc.start_time) - target_hour) <= p_hours_buffer)
      
      -- For jobs with only dates (default to 9:00 AM)
      OR (jc.start_time IS NULL AND
          ABS(9 - target_hour) <= p_hours_buffer)
    );
END;
$$ LANGUAGE plpgsql;