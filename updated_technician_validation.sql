-- Updated function to check if a technician is already booked within a 3-hour window
-- Only considers conflicts on the same day
CREATE OR REPLACE FUNCTION check_technician_availability(
  p_technician_name VARCHAR, 
  p_job_date TIMESTAMP WITH TIME ZONE
) 
RETURNS TABLE (
  job_id UUID,
  job_number VARCHAR,
  conflicting_date TIMESTAMP WITH TIME ZONE,
  customer_name VARCHAR
) AS $$
DECLARE
  target_date DATE;
  target_time TIME;
  three_hours_before TIME;
  three_hours_after TIME;
BEGIN
  -- Extract the date and time parts for accurate validation
  target_date := p_job_date::DATE;
  target_time := p_job_date::TIME;
  
  -- Calculate the 3-hour window for time comparison
  three_hours_before := target_time - INTERVAL '3 hours';
  three_hours_after := target_time + INTERVAL '3 hours';
  
  -- Return conflicting jobs - only on the same date with overlapping times
  RETURN QUERY
  SELECT 
    jc.id AS job_id,
    jc.job_number,
    COALESCE(jc.start_time, jc.job_date) AS conflicting_date,
    jc.customer_name
  FROM 
    public.job_cards jc
  WHERE 
    jc.technician_name = p_technician_name
    AND jc.status NOT IN ('cancelled', 'completed')
    AND (
      -- Only compare jobs scheduled for the same day
      COALESCE(jc.start_time, jc.job_date)::DATE = target_date
      AND
      (
        -- For jobs with specific start times, compare the times
        (
          jc.start_time IS NOT NULL 
          AND 
          jc.start_time::TIME BETWEEN three_hours_before AND three_hours_after
        )
        OR 
        -- For jobs with just a date (default time), compare with target time
        (
          jc.start_time IS NULL 
          AND 
          jc.job_date IS NOT NULL
          AND
          -- Use default time (09:00) if job_date has no time component or use its time component
          CASE 
            WHEN jc.job_date::TIME = '00:00:00'::TIME THEN '09:00:00'::TIME
            ELSE jc.job_date::TIME
          END BETWEEN three_hours_before AND three_hours_after
        )
      )
    );
END;
$$ LANGUAGE plpgsql;