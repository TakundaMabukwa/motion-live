-- Function to check technician availability
CREATE OR REPLACE FUNCTION check_technician_availability(
  p_technician_name VARCHAR,
  p_job_date TIMESTAMP WITH TIME ZONE,
  p_hours_buffer INTEGER DEFAULT 3
) 
RETURNS TABLE (
  id UUID,
  job_number VARCHAR,
  job_date TIMESTAMP WITH TIME ZONE,
  start_time TIMESTAMP WITH TIME ZONE,
  technician_name VARCHAR,
  customer_name VARCHAR,
  job_description TEXT,
  has_conflict BOOLEAN
) AS $$
BEGIN
  -- Calculate time window (default 3 hours before and after)
  RETURN QUERY
  SELECT 
    jc.id,
    jc.job_number,
    jc.job_date,
    jc.start_time,
    jc.technician_name,
    jc.customer_name,
    jc.job_description,
    TRUE AS has_conflict
  FROM 
    public.job_cards jc
  WHERE 
    jc.technician_name = p_technician_name
    AND jc.status NOT IN ('cancelled', 'completed')
    AND (
      -- Check if the job's date/time falls within the buffer window
      (jc.job_date IS NOT NULL AND 
       jc.job_date BETWEEN (p_job_date - (p_hours_buffer || ' hours')::INTERVAL) 
                    AND (p_job_date + (p_hours_buffer || ' hours')::INTERVAL))
      OR 
      -- If start_time is set, use that for more precise checking
      (jc.start_time IS NOT NULL AND 
       jc.start_time BETWEEN (p_job_date - (p_hours_buffer || ' hours')::INTERVAL) 
                     AND (p_job_date + (p_hours_buffer || ' hours')::INTERVAL))
    );
END;
$$ LANGUAGE plpgsql;

-- API to check technician availability
COMMENT ON FUNCTION check_technician_availability IS 
'Checks for scheduling conflicts for a technician within a specified time window.
Parameters:
- p_technician_name: The name of the technician to check
- p_job_date: The proposed job date/time 
- p_hours_buffer: Hours before and after to check (defaults to 3)

Returns conflicting jobs if any exist within the time window.';

-- Example usage:
/*
SELECT * FROM check_technician_availability(
  'John Doe',                            -- technician name
  '2025-10-09T14:00:00+00:00'::TIMESTAMP WITH TIME ZONE,  -- proposed job date/time
  3                                      -- 3-hour buffer (optional, default is 3)
);
*/

-- Create REST API endpoint
CREATE OR REPLACE FUNCTION api_check_technician_availability(
  technician_name TEXT,
  job_date TEXT,
  hours_buffer INTEGER DEFAULT 3
) RETURNS JSONB AS $$
DECLARE
  parsed_date TIMESTAMP WITH TIME ZONE;
  result_json JSONB;
BEGIN
  -- Parse the date string
  BEGIN
    parsed_date := job_date::TIMESTAMP WITH TIME ZONE;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Invalid date format. Please provide ISO8601 format (YYYY-MM-DDTHH:MM:SS+00:00)'
    );
  END;

  -- Get conflicts
  SELECT jsonb_build_object(
    'success', TRUE,
    'isAvailable', CASE WHEN COUNT(*) = 0 THEN TRUE ELSE FALSE END,
    'conflictCount', COUNT(*),
    'conflictingJobs', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'job_number', job_number,
        'job_date', job_date,
        'start_time', start_time,
        'technician_name', technician_name,
        'customer_name', customer_name,
        'job_description', job_description
      )
    ) FILTER (WHERE id IS NOT NULL), '[]'::JSONB)
  ) INTO result_json
  FROM check_technician_availability(technician_name, parsed_date, hours_buffer);
  
  RETURN result_json;
END;
$$ LANGUAGE plpgsql;

-- Enable the API endpoint (if using PostgREST or similar)
COMMENT ON FUNCTION api_check_technician_availability IS 
'API endpoint to check technician availability given a technician name and job date.
Returns a JSON object with availability status and any conflicting jobs.';