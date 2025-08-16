import { z } from 'zod';
import { StockItem, StockOrder, StockTakeLog } from '@/lib/types/database/stock';

/**
 * GET /api/stock request parameters
 */
export interface GetStockRequest {
  search?: string;
  supplier?: string;
  stock_type?: string;
}

/**
 * GET /api/stock response
 */
export interface GetStockResponse {
  stock: StockItem[];
}

/**
 * Schema for validating stock take requests
 */
export const StockTakeSchema = z.object({
  stock_updates: z.array(
    z.object({
      id: z.string().uuid(),
      current_quantity: z.number().min(0),
      new_quantity: z.number().min(0),
      difference: z.number()
    })
  ),
  stock_take_date: z.string().datetime().optional().default(() => new Date().toISOString()),
  notes: z.string().optional()
});

/**
 * Type for the stock take request data
 */
export type StockTakeRequest = z.infer<typeof StockTakeSchema>;

/**
 * Response for stock take operations
 */
export interface StockTakeResponse {
  success: boolean;
  updated_count: number;
  total_items: number;
  errors?: string[];
}

/**
 * GET /api/stock-orders/approved request parameters
 */
export interface GetApprovedStockOrdersRequest {
  limit?: number;
  offset?: number;
  search?: string;
}

/**
 * GET /api/stock-orders/approved response
 */
export interface GetApprovedStockOrdersResponse {
  orders: TransformedStockOrder[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Transformed stock order for API response
 */
export interface TransformedStockOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  totalAmount: number;
  totalAmountUSD?: string;
  orderDate: string;
  approved: boolean;
  status: string;
  notes: string;
  createdBy: string;
  invoiceLink?: string;
  orderItems: any[]; // Array of order items
  createdAt: string;
  updatedAt?: string;
}
