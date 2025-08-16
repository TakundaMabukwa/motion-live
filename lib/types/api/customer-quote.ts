import { CustomerQuote } from '@/lib/types/database/customer-quote';

/**
 * Product item in a quotation
 */
export interface QuotationProduct {
  id?: string;
  product_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  vat_amount?: number;
}

/**
 * POST /api/customer-quotes request body
 */
export interface CreateCustomerQuoteRequest {
  // Basic quote information
  quote_expiry_date?: string;
  
  // Job details
  jobType?: string;
  description?: string;
  purchaseType?: string;
  
  // Customer information
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  
  // Vehicle information
  vehicle_registration?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  vin_number?: string;
  odormeter?: number;
  
  // Quotation products and pricing
  quotationProducts?: QuotationProduct[];
  quotationSubtotal?: number;
  quotationVatAmount?: number;
  quotationTotalAmount?: number;
  
  // Email details
  emailBody?: string;
  emailSubject?: string;
  quoteFooter?: string;
  extraNotes?: string;
}

/**
 * POST /api/customer-quotes response
 */
export interface CreateCustomerQuoteResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    job_number: string;
    quote_date: string;
    quote_status: string;
  };
}

/**
 * GET /api/customer-quotes response
 */
export interface GetCustomerQuotesResponse {
  success: boolean;
  data: CustomerQuote[];
}
