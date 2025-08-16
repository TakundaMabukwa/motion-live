import { VehicleInvoiceRepository } from '@/lib/repositories/vehicle-invoice-repository';
import { VehicleInvoice } from '@/lib/types/database/vehicle-invoice';
import { 
  GetVehicleInvoicesRequest,
  VehicleInvoiceDTO
} from '@/lib/types/api/vehicle-invoice';
import { Logger } from '@/lib/logger';
import { Cache } from '@/lib/cache/memory-cache';

/**
 * Service for vehicle invoice business logic
 */
export class VehicleInvoiceService {
  private repository: VehicleInvoiceRepository;
  private logger: Logger;
  private cache: Cache;
  
  constructor() {
    this.repository = new VehicleInvoiceRepository();
    this.logger = new Logger('VehicleInvoiceService');
    this.cache = Cache.getInstance();
  }
  
  /**
   * Get vehicle invoices with optional filtering and pagination
   * @param params Query parameters
   * @returns Vehicle invoices with pagination details
   */
  async getVehicleInvoices(params: GetVehicleInvoicesRequest = {}): Promise<{
    invoices: VehicleInvoiceDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      this.logger.debug('Getting vehicle invoices', params);
      
      // Create a cache key based on the parameters
      const cacheKey = `vehicle-invoices:${params.search || ''}:${params.page}:${params.limit}`;
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for vehicle invoices, fetching from database');
          
          const offset = (params.page - 1) * params.limit;
          
          // Get invoices and count in parallel
          const [invoices, total] = await Promise.all([
            this.repository.findVehicleInvoices(params.search, params.limit, offset),
            this.repository.countVehicleInvoices(params.search)
          ]);
          
          // Calculate overdue amounts
          const transformedInvoices = this.calculateOverdueAmounts(invoices);
          
          const result = {
            invoices: transformedInvoices,
            total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(total / params.limit)
          };
          
          this.logger.info(`Found ${transformedInvoices.length} vehicle invoices`, { 
            total,
            page: params.page,
            totalPages: result.totalPages,
            search: params.search
          });
          
          return result;
        },
        { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
      );
    } catch (error) {
      this.logger.error('Error getting vehicle invoices', error as Error, params);
      throw error;
    }
  }
  
  /**
   * Calculate overdue amounts for vehicle invoices
   * @param invoices Array of vehicle invoices
   * @returns Transformed invoices with calculated overdue amounts
   */
  private calculateOverdueAmounts(invoices: VehicleInvoice[]): VehicleInvoiceDTO[] {
    // Get current date and calculate overdue periods
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Payment is due on 21st of each month
    const paymentDueDay = 21;
    
    return invoices.map(invoice => {
      let monthlyAmount = 0;
      let overdueAmount = 0;
      
      // Parse monthly amount from string
      if (invoice.monthly_amount) {
        monthlyAmount = parseFloat(invoice.monthly_amount);
      }
      
      // Calculate overdue amount based on due date
      if (invoice.due_date && monthlyAmount > 0) {
        const dueDate = new Date(invoice.due_date);
        const dueYear = dueDate.getFullYear();
        const dueMonth = dueDate.getMonth();
        
        // Calculate months overdue
        let monthsLate = (currentYear - dueYear) * 12 + (currentMonth - dueMonth);
        
        // Adjust based on payment due day
        if (currentDay < paymentDueDay && dueDate.getDate() >= paymentDueDay) {
          monthsLate -= 1;
        }
        
        // Calculate overdue amount
        if (monthsLate > 0) {
          overdueAmount = monthlyAmount * monthsLate;
        }
      }
      
      return {
        id: invoice.id,
        company: invoice.company || 'Unknown',
        accountNumber: invoice.new_account_number || '',
        invoiceNumber: invoice.invoice_number || '',
        amount: invoice.amount ? parseFloat(invoice.amount) : 0,
        dueDate: invoice.due_date || '',
        status: invoice.status || 'pending',
        monthlyAmount,
        overdueAmount,
        createdAt: invoice.created_at || '',
        updatedAt: invoice.updated_at || ''
      };
    });
  }
}
