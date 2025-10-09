-- Function to check if a technician is already booked within a 3-hour window
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
  three_hours_before TIMESTAMP WITH TIME ZONE;
  three_hours_after TIMESTAMP WITH TIME ZONE;
  target_date DATE;
BEGIN
  -- Calculate the 3-hour window
  three_hours_before := p_job_date - INTERVAL '3 hours';
  three_hours_after := p_job_date + INTERVAL '3 hours';
  
  -- Extract the date part for same-day validation
  target_date := DATE(p_job_date);
  
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
      -- Check if it's on the same date first
      (
        DATE(COALESCE(jc.start_time, jc.job_date)) = target_date
        AND
        (
          -- Then check time overlap within the same day
          (jc.start_time IS NOT NULL AND jc.start_time BETWEEN three_hours_before AND three_hours_after)
          OR
          (jc.start_time IS NULL AND jc.job_date IS NOT NULL AND jc.job_date BETWEEN three_hours_before AND three_hours_after)
        )
      )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to validate technician assignment and prevent double-booking
CREATE OR REPLACE FUNCTION validate_technician_booking() 
RETURNS TRIGGER AS $$
DECLARE
  conflicting_jobs RECORD;
  conflict_count INT := 0;
  booking_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Skip validation if technician wasn't changed or status is cancelled/completed
  IF (TG_OP = 'UPDATE' AND OLD.technician_name = NEW.technician_name) OR 
     NEW.status IN ('cancelled', 'completed') OR
     NEW.technician_name IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Determine the booking date (prefer start_time if available)
  IF NEW.start_time IS NOT NULL THEN
    booking_date := NEW.start_time;
  ELSE
    booking_date := NEW.job_date;
  END IF;
  
  -- Check for conflicts
  FOR conflicting_jobs IN 
    SELECT * FROM check_technician_availability(NEW.technician_name, booking_date)
    WHERE job_id != NEW.id  -- Exclude the current job when updating
  LOOP
    conflict_count := conflict_count + 1;
    EXIT WHEN conflict_count > 0;  -- We only need to know if there's at least one conflict
  END LOOP;
  
  -- If conflicts exist, raise an error
  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Technician % is already booked within 3 hours of % (Job #%)',
      NEW.technician_name, booking_date, conflicting_jobs.job_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the job_cards table
DROP TRIGGER IF EXISTS trigger_validate_technician_booking ON job_cards;

CREATE TRIGGER trigger_validate_technician_booking
BEFORE INSERT OR UPDATE ON job_cards
FOR EACH ROW
EXECUTE FUNCTION validate_technician_booking();

-- Add a function to bypass the validation for admin users when necessary
CREATE OR REPLACE FUNCTION assign_technician_with_override(
  p_job_id UUID,
  p_technician_name VARCHAR,
  p_job_date TIMESTAMP WITH TIME ZONE,
  p_override BOOLEAN DEFAULT FALSE
) 
RETURNS JSONB AS $$
DECLARE
  v_conflicts JSONB;
  v_result JSONB;
  v_job RECORD;
BEGIN
  -- Check for conflicts first
  SELECT jsonb_agg(jsonb_build_object(
    'job_id', job_id,
    'job_number', job_number,
    'conflicting_date', conflicting_date,
    'customer_name', customer_name
  )) INTO v_conflicts
  FROM check_technician_availability(p_technician_name, p_job_date)
  WHERE job_id != p_job_id;
  
  IF v_conflicts IS NULL THEN
    v_conflicts := '[]'::JSONB;
  END IF;
  
  -- If conflicts exist and override is false, return the conflicts without updating
  IF jsonb_array_length(v_conflicts) > 0 AND NOT p_override THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', 'Technician is already booked within 3 hours',
      'conflicts', v_conflicts
    );
  END IF;
  
  -- If no conflicts or override is true, update the job
  BEGIN
    -- Temporarily disable the trigger
    ALTER TABLE job_cards DISABLE TRIGGER trigger_validate_technician_booking;
    
    UPDATE job_cards 
    SET 
      technician_name = p_technician_name,
      job_date = p_job_date,
      updated_at = NOW()
    WHERE id = p_job_id
    RETURNING * INTO v_job;
    
    -- Re-enable the trigger
    ALTER TABLE job_cards ENABLE TRIGGER trigger_validate_technician_booking;
    
    IF v_job.id IS NULL THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'message', 'Job not found'
      );
    END IF;
    
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Technician assigned successfully',
      'conflicts', v_conflicts,
      'override', p_override
    );
  EXCEPTION WHEN OTHERS THEN
    -- Make sure to re-enable the trigger even if there's an error
    ALTER TABLE job_cards ENABLE TRIGGER trigger_validate_technician_booking;
    
    RETURN jsonb_build_object(
      'success', FALSE,
      'message', SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql;