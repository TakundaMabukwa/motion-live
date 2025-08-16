import { StockItem, StockOrder, StockTakeLog } from '@/lib/types/database/stock';

/**
 * Repository for interacting with stock data in the database
 */
export class StockRepository {
  /**
   * Find stock items with optional filtering
   * @param search Optional search term for description, code, or supplier
   * @param supplier Optional supplier filter
   * @param stockType Optional stock type filter
   * @returns Array of stock items
   */
  async findStock(search?: string, supplier?: string, stockType?: string): Promise<StockItem[]> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Build the query
    let query = supabase
      .from('stock')
      .select('*')
      .order('description', { ascending: true });

    // Apply filters
    if (search) {
      query = query.or(`description.ilike.%${search}%,code.ilike.%${search}%,supplier.ilike.%${search}%`);
    }

    if (supplier) {
      query = query.eq('supplier', supplier);
    }

    if (stockType) {
      query = query.eq('stock_type', stockType);
    }

    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data as StockItem[];
  }
  
  /**
   * Update stock item quantity and total value
   * @param id Stock item ID
   * @param newQuantity New quantity value
   * @param newTotalValue New total value
   * @returns Updated stock item
   */
  async updateStockQuantity(id: string, newQuantity: number, newTotalValue: string): Promise<StockItem> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('stock')
      .update({ 
        quantity: newQuantity.toString(),
        total_value: newTotalValue,
        created_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return data as StockItem;
  }
  
  /**
   * Get a stock item by ID
   * @param id Stock item ID
   * @returns Stock item or null if not found
   */
  async findById(id: string): Promise<StockItem | null> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('stock')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data as StockItem;
  }
  
  /**
   * Create a stock take log entry
   * @param logEntry Stock take log entry data
   * @returns Created log entry
   */
  async createStockTakeLog(logEntry: Omit<StockTakeLog, 'id'>): Promise<StockTakeLog> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('stock_take_log')
      .insert(logEntry)
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return data as StockTakeLog;
  }
  
  /**
   * Find approved stock orders with pagination
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @param search Optional search term
   * @returns Array of stock orders
   */
  async findApprovedStockOrders(limit: number = 100, offset: number = 0, search?: string): Promise<StockOrder[]> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Build query for approved stock orders only
    let query = supabase
      .from('stock_orders')
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,supplier.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data as StockOrder[];
  }
  
  /**
   * Count approved stock orders
   * @param search Optional search term
   * @returns Count of matching orders
   */
  async countApprovedStockOrders(search?: string): Promise<number> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    let query = supabase
      .from('stock_orders')
      .select('*', { count: 'exact', head: true })
      .eq('approved', true);
      
    if (search) {
      query = query.or(`order_number.ilike.%${search}%,supplier.ilike.%${search}%,notes.ilike.%${search}%`);
    }
    
    const { count, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return count || 0;
  }
}
