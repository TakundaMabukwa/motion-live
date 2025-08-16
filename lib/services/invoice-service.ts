import { InvoiceRepository } from '@/lib/repositories/invoice-repository';
import { Invoice } from '@/lib/types/database/invoice';
import { 
  GetInvoicesRequest,
  InvoiceDTO,
  UpdateInvoiceStatusRequest
} from '@/lib/types/api/invoice';
import { BadRequestError, NotFoundError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { Cache } from '@/lib/cache/memory-cache';

/**
 * Service for invoice-related business logic
 */
export class InvoiceService {
  private repository: InvoiceRepository;
  private logger: Logger;
  private cache: Cache;
  
  constructor() {
    this.repository = new InvoiceRepository();
    this.logger = new Logger('InvoiceService');
    this.cache = Cache.getInstance();
  }
  
  /**
   * Get invoices with optional filtering and pagination
   * @param params Query parameters
   * @returns Invoices with pagination details
   */
  async getInvoices(params: GetInvoicesRequest = {}): Promise<{
    invoices: InvoiceDTO[];
    count: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    try {
      this.logger.debug('Getting invoices', params);
      
      // Create a cache key based on the parameters
      const cacheKey = `invoices:${params.status || ''}:${params.limit}:${params.offset}`;
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for invoices, fetching from database');
          
          // Get invoices and count in parallel
          const [invoices, count] = await Promise.all([
            this.repository.findInvoices(params.status, params.limit, params.offset),
            this.repository.countInvoices(params.status)
          ]);
          
          // Transform invoices to expected format
          const transformedInvoices = this.transformInvoices(invoices);
          
          const result = {
            invoices: transformedInvoices,
            count,
            page: Math.floor(params.offset / params.limit) + 1,
            limit: params.limit,
            total_pages: Math.ceil(count / params.limit)
          };
          
          this.logger.info(`Found ${transformedInvoices.length} invoices`, { 
            total: count,
            page: result.page,
            totalPages: result.total_pages,
            status: params.status
          });
          
          return result;
        },
        { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
      );
    } catch (error) {
      this.logger.error('Error getting invoices', error as Error, params);
      throw error;
    }
  }
  
  /**
   * Update invoice status (approve/reject)
   * @param data Update parameters
   * @returns Success status and message
   */
  async updateInvoiceStatus(data: UpdateInvoiceStatusRequest): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.logger.info('Updating invoice status', { 
        orderId: data.orderId,
        status: data.status
      });
      
      // Update the status
      await this.repository.updateStatus(data.orderId, data.status);
      
      // Invalidate cache
      this.cache.invalidateByPrefix('invoices:');
      
      const message = data.status === 'approved' 
        ? 'Invoice approved successfully' 
        : 'Invoice rejected successfully';
      
      this.logger.info(message, { orderId: data.orderId });
      
      return {
        success: true,
        message
      };
    } catch (error) {
      this.logger.error('Error updating invoice status', error as Error, data);
      throw error;
    }
  }
  
  /**
   * Transform database invoices to DTO format
   * @param invoices Array of database invoices
   * @returns Array of transformed invoices
   */
  private transformInvoices(invoices: Invoice[]): InvoiceDTO[] {
    return invoices.map(invoice => ({
      id: invoice.order_number,
      client: invoice.supplier || 'Unknown Supplier',
      amount: parseFloat(invoice.total_amount_ex_vat || '0'),
      date: new Date(invoice.order_date || invoice.created_at).toISOString().split('T')[0],
      approved: invoice.status === 'approved',
      dueDate: new Date(invoice.order_date || invoice.created_at).toISOString().split('T')[0],
      pdfUrl: invoice.invoice_link || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      orderId: invoice.id,
      totalAmountUSD: invoice.total_amount_usd,
      orderItems: invoice.order_items || []
    }));
  }
}
