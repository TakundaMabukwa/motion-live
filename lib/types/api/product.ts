import { z } from 'zod';

/**
 * Schema for getting product items with filtering
 */
export const GetProductItemsRequestSchema = z.object({
  type: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional()
});

/**
 * Request type for getting product items with filtering
 */
export type GetProductItemsRequest = z.infer<typeof GetProductItemsRequestSchema>;

/**
 * Response type for getting product items
 */
export interface GetProductItemsResponse {
  products: ProductItemDTO[];
}

/**
 * Product item DTO for API responses
 */
export interface ProductItemDTO {
  id: string;
  product: string;
  description?: string;
  type: string;
  category: string;
  cost_price: number;
  selling_price: number;
  stock_level: number;
  reorder_point?: number;
  supplier_id?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  sku?: string;
  barcode?: string;
  location?: string;
  unit?: string;
  notes?: string;
}

/**
 * Schema for creating a product item
 */
export const CreateProductItemSchema = z.object({
  product: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  type: z.string().min(1, 'Product type is required'),
  category: z.string().min(1, 'Category is required'),
  cost_price: z.coerce.number().min(0, 'Cost price must be 0 or greater'),
  selling_price: z.coerce.number().min(0, 'Selling price must be 0 or greater'),
  stock_level: z.coerce.number().default(0),
  reorder_point: z.coerce.number().optional(),
  supplier_id: z.string().optional(),
  is_active: z.boolean().default(true),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  location: z.string().optional(),
  unit: z.string().optional(),
  notes: z.string().optional()
});

/**
 * Request type for creating a product item
 */
export type CreateProductItemRequest = z.infer<typeof CreateProductItemSchema>;

/**
 * Schema for updating a product item
 */
export const UpdateProductItemSchema = CreateProductItemSchema.partial();

/**
 * Request type for updating a product item
 */
export type UpdateProductItemRequest = z.infer<typeof UpdateProductItemSchema>;

/**
 * Response type for product item operations (create/update)
 */
export interface ProductItemResponse {
  success: boolean;
  message: string;
  product: ProductItemDTO;
}
