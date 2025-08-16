import { Invoice } from '@/lib/types/database/invoice';
import { DatabaseError } from '@/lib/errors';

/**
 * Repository for invoice-related operations
 */
export class InvoiceRepository {
  /**
   * Find invoices with optional status filter and pagination
   * @param status Optional status filter
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @returns Array of invoices
   */
  async findInvoices(status?: string, limit: number = 100, offset: number = 0): Promise<Invoice[]> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Build the query - only fetch approved orders
    let query = supabase
      .from('stock_orders')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    // Apply status filter if provided
    if (status === 'pending') {
      query = query.eq('status', 'pending');
    } else if (status === 'approved') {
      query = query.eq('status', 'approved');
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    
    if (error) {
      throw new DatabaseError('Failed to fetch invoices', error);
    }
    
    return data as Invoice[];
  }
  
  /**
   * Count invoices with optional status filter
   * @param status Optional status filter
   * @returns Count of matching invoices
   */
  async countInvoices(status?: string): Promise<number> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Build the query - only count approved orders
    let query = supabase
      .from('stock_orders')
      .select('*', { count: 'exact', head: true })
      .eq('approved', true);

    // Apply status filter if provided
    if (status === 'pending') {
      query = query.eq('status', 'pending');
    } else if (status === 'approved') {
      query = query.eq('status', 'approved');
    }

    const { count, error } = await query;
    
    if (error) {
      throw new DatabaseError('Failed to count invoices', error);
    }
    
    return count || 0;
  }
  
  /**
   * Update invoice status
   * @param orderId ID of the stock order
   * @param status New status value
   * @returns Updated invoice
   */
  async updateStatus(orderId: string, status: string): Promise<Invoice> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Update the status
    const { data, error } = await supabase
      .from('stock_orders')
      .update({ status })
      .eq('id', orderId)
      .select('*')
      .single();
    
    if (error) {
      throw new DatabaseError(`Failed to update invoice status for ID ${orderId}`, error);
    }
    
    return data as Invoice;
  }
}
