import { CustomerQuoteRepository } from '@/lib/repositories/customer-quote-repository';
import { CustomerQuote } from '@/lib/types/database/customer-quote';
import { 
  CreateCustomerQuoteRequest, 
  CreateCustomerQuoteResponse,
  GetCustomerQuotesResponse,
  QuotationProduct
} from '@/lib/types/api/customer-quote';
import { BadRequestError } from '@/lib/errors';
import { Cache } from '@/lib/cache/memory-cache';
import { Logger } from '@/lib/logger';

/**
 * Service for customer quote-related business logic
 */
export class CustomerQuoteService {
  private repository: CustomerQuoteRepository;
  private cache: Cache;
  private logger: Logger;
  
  constructor() {
    this.repository = new CustomerQuoteRepository();
    this.cache = Cache.getInstance();
    this.logger = new Logger('CustomerQuoteService');
  }
  
  /**
   * Create a new customer quote
   * @param requestData The request data
   * @param userId The ID of the user creating the quote
   * @returns Response with created quote information
   */
  async createQuote(
    requestData: CreateCustomerQuoteRequest, 
    userId: string
  ): Promise<CreateCustomerQuoteResponse> {
    try {
      this.logger.debug('Creating customer quote', { userId });
      
      // Extract vehicle information - use vehicle_registration if available, otherwise generate temporary_registration
      let vehicleRegistration = null;
      let temporaryRegistration = null;
      
      if (requestData.vehicle_registration) {
        vehicleRegistration = requestData.vehicle_registration;
      } else {
        // Generate temporary registration number if vehicle registration is not provided
        temporaryRegistration = `TEMP-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        vehicleRegistration = temporaryRegistration; // Use temporary as vehicle registration
      }
      
      // Prepare data for customer_quotes table
      const quoteData = {
        // Basic quote information
        job_number: `EXT-${Date.now()}`, // Generate external job number
        quote_date: new Date().toISOString(),
        quote_expiry_date: requestData.quote_expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        quote_type: 'external',
        status: 'draft',
        quote_status: 'draft',
        
        // Job details
        job_type: requestData.jobType || 'install',
        job_description: requestData.description || '',
        purchase_type: requestData.purchaseType || 'purchase',
        quotation_job_type: requestData.jobType || 'install',
        priority: 'medium',
        
        // Customer information
        customer_name: requestData.customerName || '',
        customer_email: requestData.customerEmail || '',
        customer_phone: requestData.customerPhone || '',
        customer_address: requestData.customerAddress || '',
        
        // Vehicle information
        vehicle_registration: requestData.vehicle_registration || null,
        vehicle_make: requestData.vehicle_make || null,
        vehicle_model: requestData.vehicle_model || null,
        vehicle_year: requestData.vehicle_year ? parseInt(requestData.vehicle_year) : null,
        vin_number: requestData.vin_number || null,
        odormeter: requestData.odormeter || null,
        
        // Quotation products and pricing
        quotation_products: requestData.quotationProducts || [],
        quotation_subtotal: requestData.quotationSubtotal || 0,
        quotation_vat_amount: requestData.quotationVatAmount || 0,
        quotation_total_amount: requestData.quotationTotalAmount || 0,
        
        // Email details
        quote_email_body: requestData.emailBody || '',
        quote_email_subject: requestData.emailSubject || `Quotation for ${requestData.customerName || 'Customer'}`,
        quote_email_footer: requestData.quoteFooter || '',
        quote_notes: requestData.extraNotes || '',
        
        // Additional fields
        special_instructions: requestData.extraNotes || null,
        work_notes: requestData.extraNotes || null,
        
        // Metadata
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: userId
      };
      
      // Create the quote
      const result = await this.repository.createQuote(quoteData, userId);
      
      this.logger.info('Customer quote created successfully', {
        id: result.id,
        jobNumber: result.job_number
      });
      
      return {
        success: true,
        message: 'Customer quote created successfully',
        data: {
          id: result.id,
          job_number: result.job_number,
          quote_date: result.quote_date,
          quote_status: result.quote_status
        }
      };
    } catch (error) {
      this.logger.error('Error creating customer quote', error as Error);
      throw error;
    }
  }
  
  /**
   * Get customer quotes
   * @param status Optional status filter
   * @param limit Optional limit
   * @returns Response with customer quotes
   */
  async getQuotes(status?: string, limit?: number): Promise<GetCustomerQuotesResponse> {
    try {
      this.logger.debug('Getting customer quotes', { status, limit });
      
      // Generate cache key based on parameters
      const cacheKey = `customer-quotes:${status || 'all'}:${limit || 'all'}`;
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for customer quotes, fetching from database');
          
          const quotes = await this.repository.getQuotes(status, limit);
          
          this.logger.info(`Found ${quotes.length} customer quotes`, {
            status: status || 'all',
            limit: limit || 'all'
          });
          
          return {
            success: true,
            data: quotes
          };
        },
        { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
      );
    } catch (error) {
      this.logger.error('Error getting customer quotes', error as Error);
      throw error;
    }
  }
}
