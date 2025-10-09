import { useState } from 'react';

export interface TechnicianConflict {
  id: string;
  job_number: string;
  job_date: string;
  start_time?: string;
  customer_name?: string;
  job_description?: string;
}

export interface AvailabilityCheckResult {
  isAvailable: boolean;
  conflicts: TechnicianConflict[];
  isLoading: boolean;
  error: string | null;
}

/**
 * React hook for checking technician availability
 * @returns An object with functions to check availability and state variables
 */
export function useTechnicianAvailability() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<TechnicianConflict[]>([]);

  /**
   * Check if a technician is available at a specific date and time
   * 
   * @param technicianName - The name of the technician to check
   * @param date - The date string (YYYY-MM-DD)
   * @param time - The time string (HH:MM)
   * @param hoursBuffer - Hours before and after to check for conflicts (default: 3)
   * @returns Promise with availability results
   */
  const checkAvailability = async (
    technicianName: string, 
    date: string, 
    time: string = '09:00',
    hoursBuffer: number = 3
  ): Promise<AvailabilityCheckResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/technicians/availability?` +
        `technician=${encodeURIComponent(technicianName)}` + 
        `&date=${encodeURIComponent(date)}` + 
        `&time=${encodeURIComponent(time)}` + 
        `&buffer=${hoursBuffer}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API error');
      }
      
      const data = await response.json();
      const conflicts = data.conflictingJobs || [];
      setConflicts(conflicts);
      
      return {
        isAvailable: conflicts.length === 0,
        conflicts,
        isLoading: false,
        error: null
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error checking technician availability:', err);
      
      return {
        isAvailable: true, // Default to available on error
        conflicts: [],
        isLoading: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Assign a technician to a job with conflict validation
   * 
   * @param jobId - ID of the job to assign
   * @param technicianName - Name of the technician to assign
   * @param date - Date string (YYYY-MM-DD)
   * @param time - Time string (HH:MM)
   * @param override - Whether to override scheduling conflicts
   * @returns Result of the assignment operation
   */
  const assignTechnician = async (
    jobId: string,
    technicianName: string,
    date: string,
    time: string = '09:00',
    override: boolean = false
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/technicians/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          technicianName,
          jobDate: date,
          startTime: time,
          override
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to assign technician');
        if (data.conflicts) {
          setConflicts(data.conflicts);
        }
        return { success: false, ...data };
      }
      
      setConflicts(data.conflicts || []);
      return { success: true, ...data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error assigning technician:', err);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    checkAvailability,
    assignTechnician,
    conflicts,
    isLoading,
    error,
    hasConflicts: conflicts.length > 0,
    isAvailable: conflicts.length === 0
  };
}