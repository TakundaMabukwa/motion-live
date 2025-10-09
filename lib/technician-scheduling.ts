import { createClient } from '@/lib/supabase/client';

interface ConflictingJob {
  id: string;
  job_number: string;
  job_date: string;
  start_time?: string;
  technician_name?: string;
  customer_name?: string;
  job_description?: string;
  status?: string;
}

interface AvailabilityResult {
  isAvailable: boolean;
  conflictingJobs: ConflictingJob[];
  error?: string;
}

/**
 * Check if a technician is available at a specific date and time
 * 
 * @param technicianName - The name of the technician to check
 * @param date - The date string (YYYY-MM-DD)
 * @param time - The time string (HH:MM) 
 * @param hoursBuffer - Hours before and after to check for conflicts (default: 3)
 * @param useAPI - Whether to use the API endpoint or direct DB query (default: true)
 * @returns Promise with availability results
 */
export async function checkTechnicianAvailability(
  technicianName: string, 
  date: string, 
  time: string = '09:00',
  hoursBuffer: number = 3,
  useAPI: boolean = true
): Promise<AvailabilityResult> {
  try {
    console.log('Checking availability for:', technicianName, 'on', date, 'at', time);
    
    if (useAPI) {
      // Use the API endpoint
      const response = await fetch(
        `/api/technicians/availability?` +
        `technician=${encodeURIComponent(technicianName)}` + 
        `&date=${encodeURIComponent(date)}` + 
        `&time=${encodeURIComponent(time)}` + 
        `&buffer=${hoursBuffer}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error checking technician availability:', errorData);
        return { 
          isAvailable: true, 
          conflictingJobs: [],
          error: errorData.error || 'API error'
        };
      }
      
      const data = await response.json();
      return {
        isAvailable: data.isAvailable,
        conflictingJobs: data.conflictingJobs || []
      };
    } else {
      // Use direct database query as fallback
      const supabase = createClient();
      
      // Convert the selected time to a Date object
      const selectedDateTime = new Date(`${date}T${time}:00`);
      
      // First try to use the SQL function
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'check_technician_availability',
          {
            p_technician_name: technicianName,
            p_job_date: selectedDateTime.toISOString()
          }
        );
        
        if (!rpcError) {
          console.log('Found conflicts using SQL function:', rpcData);
          return {
            isAvailable: (rpcData || []).length === 0,
            conflictingJobs: (rpcData || []).map((job: any) => ({
              id: job.job_id || job.id,
              job_number: job.job_number,
              job_date: job.conflicting_date || job.job_date,
              customer_name: job.customer_name
            }))
          };
        }
        
        console.warn('SQL function failed, falling back to manual check:', rpcError);
      } catch (rpcError) {
        console.warn('Error using SQL function:', rpcError);
      }
      
      // Extract date parts for improved comparison
      const targetDate = new Date(selectedDateTime.getFullYear(), selectedDateTime.getMonth(), selectedDateTime.getDate());
      const targetHour = selectedDateTime.getHours();
      const targetMinute = selectedDateTime.getMinutes();
      
      // Query all jobs for this technician
      const { data, error } = await supabase
        .from('job_cards')
        .select('id, job_number, job_date, start_time, technician_name, customer_name, job_description, status')
        .eq('technician_name', technicianName)
        .neq('status', 'cancelled')
        .neq('status', 'completed');
      
      if (error) {
        console.error('Error checking technician availability:', error);
        return { 
          isAvailable: true, 
          conflictingJobs: [],
          error: error.message
        };
      }
      
      console.log('Found jobs for technician:', data);
      
      // Filter for conflicts on the same day and within time window
      const filteredData = (data || []).filter(job => {
        // Get the job datetime (prefer start_time if available)
        const jobDateTime = job.start_time ? new Date(job.start_time) : new Date(job.job_date || '');
        
        // Skip if invalid date
        if (isNaN(jobDateTime.getTime())) return false;
        
        // Only consider same day jobs by comparing date parts - creating a date object without time
        const jobDate = new Date(
          jobDateTime.getFullYear(),
          jobDateTime.getMonth(), 
          jobDateTime.getDate()
        );
        
        if (jobDate.getTime() !== targetDate.getTime()) {
          console.log('Skipping job on different date:', job.job_number);
          return false;
        }
        
        // For jobs with just a date and no time, use default time (9:00 AM)
        let jobHour = jobDateTime.getHours();
        if (jobDateTime.getHours() === 0 && jobDateTime.getMinutes() === 0 && !job.start_time) {
          jobHour = 9; // Default to 9:00 AM
        }
        
        // Check if within time window (e.g., 3 hours before/after)
        const hourDiff = Math.abs(jobHour - targetHour);
        const isConflict = hourDiff <= hoursBuffer;
        if (isConflict) {
          console.log('Found conflict:', job.job_number, 'at', jobHour, 'vs', targetHour);
        }
        return isConflict;
      });
      
      console.log('Found conflicts after filtering by date/time:', filteredData);
      
      if (filteredData.length > 0) {
        return {
          isAvailable: false,
          conflictingJobs: filteredData.map((job) => ({
            id: job.id,
            job_number: job.job_number,
            job_date: job.job_date,
            start_time: job.start_time,
            technician_name: job.technician_name,
            customer_name: job.customer_name,
            job_description: job.job_description || 'No description',
            status: job.status
          }))
        };
      }
      
      return { isAvailable: true, conflictingJobs: [] };
    }
  } catch (error) {
    console.error('Error in checking technician availability:', error);
    return { 
      isAvailable: true, 
      conflictingJobs: [],
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}