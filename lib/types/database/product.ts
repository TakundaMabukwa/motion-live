/**
 * ProductItem database entity type
 * Represents a product item in the product_items table
 */
export interface ProductItem {
  id: string; // uuid
  product: string; // Name of the product
  description?: string;
  type: string; // Type of product (e.g., 'unit', 'service')
  category: string; // Product category
  cost_price: number;
  selling_price: number;
  stock_level: number;
  reorder_point?: number;
  supplier_id?: string; // uuid, references suppliers.id
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  is_active: boolean;
  sku?: string; // Stock keeping unit
  barcode?: string;
  location?: string; // Storage location
  unit?: string; // Unit of measurement
  notes?: string;
  created_by?: string; // uuid
  updated_by?: string; // uuid
}

/**
 * StockTakeLog database entity type
 * Represents a stock take log entry in the stock_take_log table
 */
export interface StockTakeLog {
  id: string; // uuid
  product_id: string; // uuid, references product_items.id
  previous_quantity: number;
  new_quantity: number;
  difference: number;
  reason?: string;
  performed_by: string; // uuid, references users.id
  performed_at: string; // ISO timestamp
}
