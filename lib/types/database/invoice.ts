/**
 * Type definitions for invoice-related database entities
 */

/**
 * Represents a stock order as an invoice in the database
 * This uses the stock_orders table
 */
export interface Invoice {
  id: string;
  order_number: string;
  supplier?: string;
  total_amount_ex_vat?: string;
  total_amount_usd?: string;
  order_date?: string;
  approved?: boolean;
  status?: string;
  invoice_link?: string;
  order_items?: any[]; // Array of order items
  created_at: string;
  updated_at?: string;
}
