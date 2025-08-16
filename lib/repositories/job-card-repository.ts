import { JobCard } from '@/lib/types/database/job-card';
import { DatabaseError } from '@/lib/errors';

/**
 * Repository for job card operations
 */
export class JobCardRepository {
  /**
   * Find all job cards with pagination
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns Array of job cards and total count
   */
  async findAll(page: number = 1, limit: number = 50): Promise<{ jobCards: JobCard[], count: number }> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const offset = (page - 1) * limit;
    
    // Query with pagination
    const query = supabase
      .from('job_cards')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    const { data, error } = await query;
    
    if (error) {
      throw new DatabaseError('Failed to fetch job cards', error);
    }
    
    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('job_cards')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      throw new DatabaseError('Failed to count job cards', countError);
    }
    
    return {
      jobCards: data as JobCard[],
      count: count || 0
    };
  }
  
  /**
   * Find a job card by ID
   * @param id Job card ID
   * @returns Job card or null if not found
   */
  async findById(id: string): Promise<JobCard | null> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('job_cards')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(`Failed to fetch job card with ID ${id}`, error);
    }
    
    return data as JobCard;
  }
  
  /**
   * Find job cards by vehicle ID
   * @param vehicleId Vehicle ID
   * @returns Array of job cards
   */
  async findByVehicleId(vehicleId: string): Promise<JobCard[]> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('job_cards')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
      
    if (error) {
      throw new DatabaseError(`Failed to fetch job cards for vehicle ${vehicleId}`, error);
    }
    
    return data as JobCard[];
  }
  
  /**
   * Create a new job card
   * @param jobCard Job card data
   * @returns Created job card
   */
  async create(jobCard: Partial<JobCard>): Promise<JobCard> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('job_cards')
      .insert([jobCard])
      .select('id, job_number, customer_name, job_type, status, created_at')
      .single();
      
    if (error) {
      throw new DatabaseError('Failed to create job card', error);
    }
    
    return data as JobCard;
  }
  
  /**
   * Update a job card
   * @param id Job card ID
   * @param jobCard Updated job card data
   * @returns Updated job card
   */
  async update(id: string, jobCard: Partial<JobCard>): Promise<JobCard> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('job_cards')
      .update(jobCard)
      .eq('id', id)
      .select('*')
      .single();
      
    if (error) {
      throw new DatabaseError(`Failed to update job card with ID ${id}`, error);
    }
    
    return data as JobCard;
  }
  
  /**
   * Delete a job card
   * @param id Job card ID
   * @returns Boolean indicating success
   */
  async delete(id: string): Promise<boolean> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('job_cards')
      .delete()
      .eq('id', id);
      
    if (error) {
      throw new DatabaseError(`Failed to delete job card with ID ${id}`, error);
    }
    
    return true;
  }
}
