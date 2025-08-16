import { StockRepository } from '@/lib/repositories/stock-repository';
import { StockItem, StockOrder, StockTakeLog } from '@/lib/types/database/stock';
import { StockTakeRequest, TransformedStockOrder } from '@/lib/types/api/stock';
import { BadRequestError } from '@/lib/errors';
import { Cache } from '@/lib/cache/memory-cache';
import { Logger } from '@/lib/logger';
import { safeValidate } from '@/lib/api/validation';
import { StockTakeSchema } from '@/lib/types/api/stock';

/**
 * Service for stock-related business logic
 */
export class StockService {
  private repository: StockRepository;
  private cache: Cache;
  private logger: Logger;
  
  constructor() {
    this.repository = new StockRepository();
    this.cache = Cache.getInstance();
    this.logger = new Logger('StockService');
  }
  
  /**
   * Get stock items with optional filtering
   * @param search Optional search term
   * @param supplier Optional supplier filter
   * @param stockType Optional stock type filter
   * @returns Array of stock items
   */
  async getStock(search?: string, supplier?: string, stockType?: string): Promise<StockItem[]> {
    try {
      this.logger.debug('Getting stock items', { search, supplier, stockType });
      
      // Create a cache key based on the filters
      const cacheKey = `stock:${search || ''}:${supplier || ''}:${stockType || ''}`;
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for stock items, fetching from database');
          const stock = await this.repository.findStock(search, supplier, stockType);
          
          // Process stock items (convert quantity to string)
          const processedStock = stock.map(item => ({
            ...item,
            quantity: item.quantity || '0'
          }));
          
          this.logger.info(`Found ${processedStock.length} stock items`);
          return processedStock;
        },
        { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
      );
    } catch (error) {
      this.logger.error('Error getting stock items', error as Error, { search, supplier, stockType });
      throw error;
    }
  }
  
  /**
   * Process stock take updates
   * @param stockTakeData Stock take request data
   * @param userId ID of user performing the stock take
   * @returns Result of the stock take operation
   */
  async processStockTake(stockTakeData: StockTakeRequest, userId: string): Promise<{
    success: boolean;
    updated_count: number;
    total_items: number;
    errors?: string[];
  }> {
    try {
      this.logger.debug('Processing stock take', { 
        itemCount: stockTakeData.stock_updates.length,
        date: stockTakeData.stock_take_date
      });
      
      // Validate stock take data
      const validation = safeValidate(stockTakeData, StockTakeSchema);
      if (!validation.success) {
        this.logger.warn('Invalid stock take data', { errors: validation.error.issues });
        throw new BadRequestError(`Invalid stock take data: ${validation.error.message}`);
      }
      
      const { stock_updates, stock_take_date, notes } = stockTakeData;
      
      let updatedCount = 0;
      const errors: string[] = [];

      // Process each stock update
      for (const update of stock_updates) {
        try {
          const { id, current_quantity, new_quantity, difference } = update;

          // Get current stock item to calculate new total value
          const stockItem = await this.repository.findById(id);
          
          if (!stockItem) {
            this.logger.warn(`Stock item not found: ${id}`);
            errors.push(`Stock item not found: ${id}`);
            continue;
          }

          // Calculate new total value
          const costPerUnit = parseFloat(stockItem.cost_excl_vat_zar || '0');
          const newTotalValue = (new_quantity * costPerUnit).toFixed(2);

          // Update the stock quantity and total value
          await this.repository.updateStockQuantity(id, new_quantity, newTotalValue);

          // Log the stock take change
          await this.repository.createStockTakeLog({
            stock_item_id: id,
            previous_quantity: current_quantity,
            new_quantity: new_quantity,
            difference: difference,
            stock_take_date: stock_take_date || new Date().toISOString(),
            notes: notes,
            performed_by: userId,
            created_at: new Date().toISOString()
          });

          updatedCount++;
          
          // Invalidate cache for this item
          this.cache.delete(`stock:${id}`);
        } catch (error) {
          this.logger.error(`Error processing stock update for item ${update.id}:`, error as Error);
          errors.push(`Error processing item ${update.id}: ${(error as Error).message}`);
        }
      }
      
      // Invalidate stock cache
      this.cache.delete(`stock:::`);
      
      this.logger.info(`Stock take completed: ${updatedCount}/${stock_updates.length} items updated`);

      return {
        success: true,
        updated_count: updatedCount,
        total_items: stock_updates.length,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      this.logger.error('Error processing stock take', error as Error);
      throw error;
    }
  }
  
  /**
   * Get approved stock orders with pagination
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @param search Optional search term
   * @returns Approved stock orders with pagination details
   */
  async getApprovedStockOrders(limit: number = 100, offset: number = 0, search?: string): Promise<{
    orders: TransformedStockOrder[];
    count: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    try {
      this.logger.debug('Getting approved stock orders', { limit, offset, search });
      
      // Create a cache key based on the parameters
      const cacheKey = `stock:orders:approved:${limit}:${offset}:${search || ''}`;
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for approved stock orders, fetching from database');
          
          // Get orders
          const stockOrders = await this.repository.findApprovedStockOrders(limit, offset, search);
          
          // Transform stock orders to expected format
          const orders = stockOrders.map(order => ({
            id: order.id,
            orderNumber: order.order_number,
            supplier: order.supplier || 'Unknown Supplier',
            totalAmount: parseFloat(order.total_amount_ex_vat || '0'),
            totalAmountUSD: order.total_amount_usd,
            orderDate: new Date(order.order_date || order.created_at).toISOString().split('T')[0],
            approved: order.approved || false,
            status: order.status || 'approved',
            notes: order.notes || '',
            createdBy: order.created_by || 'Unknown',
            invoiceLink: order.invoice_link,
            orderItems: order.order_items || [],
            createdAt: order.created_at,
            updatedAt: order.updated_at
          }));
          
          // Get total count for pagination
          const count = await this.repository.countApprovedStockOrders(search);
          
          const result = {
            orders,
            count,
            page: Math.floor(offset / limit) + 1,
            limit,
            total_pages: Math.ceil(count / limit)
          };
          
          this.logger.info(`Found ${orders.length} approved stock orders`, { 
            total: count,
            page: result.page,
            totalPages: result.total_pages
          });
          
          return result;
        },
        { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
      );
    } catch (error) {
      this.logger.error('Error getting approved stock orders', error as Error, { limit, offset, search });
      throw error;
    }
  }
}
