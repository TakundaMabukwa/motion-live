import { Technician } from '@/lib/types/database/technician';

/**
 * Repository for interacting with technician data in the database
 */
export class TechnicianRepository {
  /**
   * Get all technicians
   * @returns Array of technicians
   */
  async findAll(): Promise<Technician[]> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('technicians')
      .select('*')
      .order('name');
      
    if (error) {
      throw error;
    }
    
    return data as Technician[];
  }
  
  /**
   * Find a technician by ID
   * @param id The technician ID
   * @returns The technician or null if not found
   */
  async findById(id: string): Promise<Technician | null> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('technicians')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data as Technician;
  }
  
  /**
   * Find a technician by user ID
   * @param userId The user ID
   * @returns The technician or null if not found
   */
  async findByUserId(userId: string): Promise<Technician | null> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('technicians')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data as Technician;
  }
  
  /**
   * Get jobs for a specific technician
   * @param technicianId The technician ID
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @param status Optional status filter
   * @returns Array of jobs and count
   */
  async getJobs(
    technicianId: string,
    startDate?: string,
    endDate?: string,
    status?: string
  ): Promise<{ jobs: any[]; count: number }> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient();
    
    let query = supabase
      .from('job_cards')
      .select('*')
      .eq('technician_id', technicianId);
      
    if (startDate) {
      query = query.gte('job_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('job_date', endDate);
    }
    
    if (status) {
      query = query.eq('job_status', status);
    }
    
    const { data, error, count } = await query.order('job_date', { ascending: false });
      
    if (error) {
      throw error;
    }
    
    return { jobs: data, count: count || 0 };
  }
}
