import { CustomerQuote } from '@/lib/types/database/customer-quote';
import { CreateCustomerQuoteRequest } from '@/lib/types/api/customer-quote';

/**
 * Repository for interacting with customer quotes in the database
 */
export class CustomerQuoteRepository {
  /**
   * Create a new customer quote
   * @param quoteData The quote data to create
   * @param userId The ID of the user creating the quote
   * @returns The created customer quote
   */
  async createQuote(quoteData: any, userId: string): Promise<CustomerQuote> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('customer_quotes')
      .insert(quoteData)
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return data as CustomerQuote;
  }
  
  /**
   * Get customer quotes
   * @param status Optional status filter
   * @param limit Optional limit
   * @returns Array of customer quotes
   */
  async getQuotes(status?: string, limit?: number): Promise<CustomerQuote[]> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    let query = supabase
      .from('customer_quotes')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (status) {
      query = query.eq('quote_status', status);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
      
    if (error) {
      throw error;
    }
    
    return data as CustomerQuote[];
  }
}
