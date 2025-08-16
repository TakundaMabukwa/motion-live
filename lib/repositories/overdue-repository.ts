/**
 * Repository for interacting with overdue payment data in the database
 */
export class OverdueRepository {
  /**
   * Get all vehicle invoices with monthly subscription data
   * @returns Array of vehicle invoices
   */
  async getMonthlySubscriptionInvoices(): Promise<any[]> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('vehicle_invoices')
      .select('*')
      .eq('stock_code', 'MONLTHY SUBSCRIPTION');
      
    if (error) {
      throw error;
    }
    
    return data || [];
  }
}
