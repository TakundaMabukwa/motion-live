import { ProductItem } from '@/lib/types/database/product';
import { DatabaseError } from '@/lib/errors';

/**
 * Repository for product item operations
 */
export class ProductRepository {
  /**
   * Find all product items with optional filtering
   * @param filters Optional filters
   * @returns Array of product items
   */
  async findAll(filters: {
    type?: string;
    category?: string;
    search?: string;
  } = {}): Promise<ProductItem[]> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Start building the query
    let query = supabase
      .from('product_items')
      .select('*')
      .order('product', { ascending: true });
    
    // Apply filters if provided
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    
    if (filters.search) {
      query = query.or(`product.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      throw new DatabaseError('Failed to fetch product items', error);
    }
    
    return data as ProductItem[];
  }
  
  /**
   * Find a product item by ID
   * @param id Product item ID
   * @returns Product item or null if not found
   */
  async findById(id: string): Promise<ProductItem | null> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('product_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(`Failed to fetch product item with ID ${id}`, error);
    }
    
    return data as ProductItem;
  }
  
  /**
   * Create a new product item
   * @param productItem Product item data
   * @returns Created product item
   */
  async create(productItem: Partial<ProductItem>): Promise<ProductItem> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('product_items')
      .insert([productItem])
      .select('*')
      .single();
    
    if (error) {
      throw new DatabaseError('Failed to create product item', error);
    }
    
    return data as ProductItem;
  }
  
  /**
   * Update a product item
   * @param id Product item ID
   * @param productItem Updated product item data
   * @returns Updated product item
   */
  async update(id: string, productItem: Partial<ProductItem>): Promise<ProductItem> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('product_items')
      .update(productItem)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      throw new DatabaseError(`Failed to update product item with ID ${id}`, error);
    }
    
    return data as ProductItem;
  }
  
  /**
   * Delete a product item
   * @param id Product item ID
   * @returns Boolean indicating success
   */
  async delete(id: string): Promise<boolean> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('product_items')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw new DatabaseError(`Failed to delete product item with ID ${id}`, error);
    }
    
    return true;
  }
  
  /**
   * Search for product items
   * @param searchTerm Search term
   * @returns Array of matching product items
   */
  async search(searchTerm: string): Promise<ProductItem[]> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('product_items')
      .select('*')
      .or(`product.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,barcode.ilike.%${searchTerm}%`)
      .order('product', { ascending: true });
    
    if (error) {
      throw new DatabaseError(`Failed to search product items for '${searchTerm}'`, error);
    }
    
    return data as ProductItem[];
  }
  
  /**
   * Update stock level for a product
   * @param id Product item ID
   * @param quantity Quantity to add (positive) or subtract (negative)
   * @returns Updated product item
   */
  async updateStock(id: string, quantity: number): Promise<ProductItem> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    // Get current stock level
    const { data: product, error: fetchError } = await supabase
      .from('product_items')
      .select('stock_level')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      throw new DatabaseError(`Failed to fetch product item with ID ${id}`, fetchError);
    }
    
    // Calculate new stock level
    const newStockLevel = (product?.stock_level || 0) + quantity;
    
    // Update stock level
    const { data, error } = await supabase
      .from('product_items')
      .update({ 
        stock_level: newStockLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      throw new DatabaseError(`Failed to update stock level for product item with ID ${id}`, error);
    }
    
    return data as ProductItem;
  }
}
