/**
 * Type definitions for stock-related database entities
 */

/**
 * Represents a stock item in the database
 */
export interface StockItem {
  id: string;
  code?: string;
  description: string;
  supplier?: string;
  stock_type?: string;
  quantity: string; // Stored as string in DB, converted to number for display
  unit?: string;
  cost_excl_vat_zar?: string;
  cost_incl_vat_zar?: string;
  cost_usd?: string;
  total_value?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Represents a stock take log entry in the database
 */
export interface StockTakeLog {
  id: string;
  stock_item_id: string;
  previous_quantity: number;
  new_quantity: number;
  difference: number;
  stock_take_date: string;
  notes?: string;
  performed_by: string;
  created_at: string;
}

/**
 * Represents a stock order in the database
 */
export interface StockOrder {
  id: string;
  order_number: string;
  supplier?: string;
  total_amount_ex_vat?: string;
  total_amount_usd?: string;
  order_date?: string;
  approved?: boolean;
  status?: string;
  notes?: string;
  created_by?: string;
  invoice_link?: string;
  order_items?: any[]; // Array of order items
  created_at: string;
  updated_at?: string;
}

/**
 * Represents a stock order item in the database
 */
export interface StockOrderItem {
  id: string;
  stock_order_id: string;
  stock_item_id?: string;
  description: string;
  quantity: number;
  unit_price_ex_vat: string;
  total_price_ex_vat: string;
  unit_price_usd?: string;
  total_price_usd?: string;
  created_at: string;
  updated_at?: string;
}
