import { VehicleInvoice } from '@/lib/types/database/vehicle-invoice';
import { DatabaseError } from '@/lib/errors';

/**
 * Repository for vehicle invoice operations
 */
export class VehicleInvoiceRepository {
  /**
   * Find vehicle invoices with optional search and pagination
   * @param search Optional search term
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @returns Array of vehicle invoices
   */
  async findVehicleInvoices(search?: string, limit: number = 20, offset: number = 0): Promise<VehicleInvoice[]> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Build the query
    let query = supabase
      .from('vehicle_invoices')
      .select('*');
      
    // Add search filter if provided
    if (search) {
      query = query.or(`company.ilike.%${search}%,new_account_number.ilike.%${search}%`);
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data, error } = await query;
    
    if (error) {
      throw new DatabaseError('Failed to fetch vehicle invoices', error);
    }
    
    return data as VehicleInvoice[];
  }
  
  /**
   * Count vehicle invoices with optional search
   * @param search Optional search term
   * @returns Count of matching invoices
   */
  async countVehicleInvoices(search?: string): Promise<number> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Build the query
    let query = supabase
      .from('vehicle_invoices')
      .select('*', { count: 'exact', head: true });
      
    // Add search filter if provided
    if (search) {
      query = query.or(`company.ilike.%${search}%,new_account_number.ilike.%${search}%`);
    }
    
    const { count, error } = await query;
    
    if (error) {
      throw new DatabaseError('Failed to count vehicle invoices', error);
    }
    
    return count || 0;
  }
  
  /**
   * Get a vehicle invoice by ID
   * @param id Vehicle invoice ID
   * @returns Vehicle invoice or null if not found
   */
  async findById(id: string): Promise<VehicleInvoice | null> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('vehicle_invoices')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(`Failed to fetch vehicle invoice with ID ${id}`, error);
    }
    
    return data as VehicleInvoice;
  }
  
  /**
   * Update a vehicle invoice
   * @param id Vehicle invoice ID
   * @param data Updated invoice data
   * @returns Updated vehicle invoice
   */
  async update(id: string, data: Partial<VehicleInvoice>): Promise<VehicleInvoice> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data: updatedData, error } = await supabase
      .from('vehicle_invoices')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      throw new DatabaseError(`Failed to update vehicle invoice with ID ${id}`, error);
    }
    
    return updatedData as VehicleInvoice;
  }
}
