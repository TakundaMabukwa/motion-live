import { ProductRepository } from '@/lib/repositories/product-repository';
import { ProductItem } from '@/lib/types/database/product';
import { 
  GetProductItemsRequest,
  CreateProductItemRequest,
  UpdateProductItemRequest,
  ProductItemDTO
} from '@/lib/types/api/product';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { MemoryCache } from '@/lib/cache/memory-cache';

/**
 * Service for product-related business logic
 */
export class ProductService {
  private repository: ProductRepository;
  private logger: Logger;
  private cache: MemoryCache;
  
  constructor() {
    this.repository = new ProductRepository();
    this.logger = new Logger('ProductService');
    this.cache = MemoryCache.getInstance();
  }
  
  /**
   * Get all product items with optional filtering
   * @param params Filter parameters
   * @returns Array of product items
   */
  async getAllProducts(params: GetProductItemsRequest = {}): Promise<ProductItemDTO[]> {
    // Create cache key based on filter parameters
    const cacheKey = `products:${params.type || ''}:${params.category || ''}:${params.search || ''}`;
    
    // Try to get from cache first
    const cachedProducts = this.cache.get<ProductItemDTO[]>(cacheKey);
    
    if (cachedProducts) {
      this.logger.debug('Retrieved products from cache', { 
        type: params.type,
        category: params.category,
        search: params.search 
      });
      return cachedProducts;
    }
    
    try {
      this.logger.info('Fetching products from database', {
        type: params.type,
        category: params.category,
        search: params.search
      });
      
      const products = await this.repository.findAll(params);
      
      // Cache the result for 5 minutes
      this.cache.set(cacheKey, products, 300);
      
      return products;
    } catch (error) {
      this.logger.error('Error fetching products', error as Error);
      throw error;
    }
  }
  
  /**
   * Get a product item by ID
   * @param id Product item ID
   * @returns The product item
   * @throws NotFoundError if product not found
   */
  async getProductById(id: string): Promise<ProductItem> {
    const cacheKey = `product:id=${id}`;
    
    // Try to get from cache first
    const cachedProduct = this.cache.get<ProductItem>(cacheKey);
    
    if (cachedProduct) {
      this.logger.debug('Retrieved product from cache', { id });
      return cachedProduct;
    }
    
    try {
      this.logger.info('Fetching product from database', { id });
      const product = await this.repository.findById(id);
      
      if (!product) {
        throw new NotFoundError(`Product with ID ${id} not found`);
      }
      
      // Cache the result for 5 minutes
      this.cache.set(cacheKey, product, 300);
      
      return product;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      this.logger.error(`Error fetching product with ID ${id}`, error as Error);
      throw error;
    }
  }
  
  /**
   * Create a new product item
   * @param data Product item data
   * @returns Created product item
   */
  async createProduct(data: CreateProductItemRequest): Promise<ProductItem> {
    try {
      this.logger.info('Creating new product', { product: data.product });
      
      // Prepare product data
      const productData: Partial<ProductItem> = {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Create the product
      const createdProduct = await this.repository.create(productData);
      
      // Invalidate cache for product lists
      this.cache.invalidateByPrefix('products:');
      
      this.logger.info('Product created successfully', { id: createdProduct.id });
      
      return createdProduct;
    } catch (error) {
      this.logger.error('Error creating product', error as Error);
      throw error;
    }
  }
  
  /**
   * Update a product item
   * @param id Product item ID
   * @param data Updated product item data
   * @returns Updated product item
   */
  async updateProduct(id: string, data: UpdateProductItemRequest): Promise<ProductItem> {
    try {
      this.logger.info('Updating product', { id });
      
      // Check if product exists
      const existingProduct = await this.repository.findById(id);
      
      if (!existingProduct) {
        throw new NotFoundError(`Product with ID ${id} not found`);
      }
      
      // Prepare update data
      const updateData: Partial<ProductItem> = {
        ...data,
        updated_at: new Date().toISOString()
      };
      
      // Update product
      const updatedProduct = await this.repository.update(id, updateData);
      
      // Invalidate cache
      this.cache.delete(`product:id=${id}`);
      this.cache.invalidateByPrefix('products:');
      
      this.logger.info('Product updated successfully', { id });
      
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Error updating product with ID ${id}`, error as Error);
      throw error;
    }
  }
  
  /**
   * Delete a product item
   * @param id Product item ID
   * @returns Boolean indicating success
   */
  async deleteProduct(id: string): Promise<boolean> {
    try {
      this.logger.info('Deleting product', { id });
      
      // Check if product exists
      const existingProduct = await this.repository.findById(id);
      
      if (!existingProduct) {
        throw new NotFoundError(`Product with ID ${id} not found`);
      }
      
      // Delete product
      await this.repository.delete(id);
      
      // Invalidate cache
      this.cache.delete(`product:id=${id}`);
      this.cache.invalidateByPrefix('products:');
      
      this.logger.info('Product deleted successfully', { id });
      
      return true;
    } catch (error) {
      this.logger.error(`Error deleting product with ID ${id}`, error as Error);
      throw error;
    }
  }
  
  /**
   * Update stock level for a product
   * @param id Product item ID
   * @param quantity Quantity to add (positive) or subtract (negative)
   * @returns Updated product item
   */
  async updateProductStock(id: string, quantity: number): Promise<ProductItem> {
    try {
      this.logger.info('Updating product stock', { id, quantity });
      
      // Check if product exists
      const existingProduct = await this.repository.findById(id);
      
      if (!existingProduct) {
        throw new NotFoundError(`Product with ID ${id} not found`);
      }
      
      // Calculate new stock level
      const newStockLevel = existingProduct.stock_level + quantity;
      
      // Validate new stock level
      if (newStockLevel < 0) {
        throw new BadRequestError(`Cannot reduce stock below zero. Current stock: ${existingProduct.stock_level}, Requested reduction: ${Math.abs(quantity)}`);
      }
      
      // Update stock level
      const updatedProduct = await this.repository.updateStock(id, quantity);
      
      // Invalidate cache
      this.cache.delete(`product:id=${id}`);
      this.cache.invalidateByPrefix('products:');
      
      this.logger.info('Product stock updated successfully', { 
        id, 
        previousStock: existingProduct.stock_level,
        newStock: updatedProduct.stock_level
      });
      
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Error updating stock for product with ID ${id}`, error as Error);
      throw error;
    }
  }
  
  /**
   * Search for products by term
   * @param searchTerm Search term
   * @returns Array of matching products
   */
  async searchProducts(searchTerm: string): Promise<ProductItem[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return this.getAllProducts();
    }
    
    const cacheKey = `products:search=${searchTerm}`;
    
    // Try to get from cache first
    const cachedResults = this.cache.get<ProductItem[]>(cacheKey);
    
    if (cachedResults) {
      this.logger.debug('Retrieved search results from cache', { searchTerm });
      return cachedResults;
    }
    
    try {
      this.logger.info('Searching products', { searchTerm });
      
      const results = await this.repository.search(searchTerm);
      
      // Cache the result for 5 minutes
      this.cache.set(cacheKey, results, 300);
      
      return results;
    } catch (error) {
      this.logger.error(`Error searching products with term '${searchTerm}'`, error as Error);
      throw error;
    }
  }
}
