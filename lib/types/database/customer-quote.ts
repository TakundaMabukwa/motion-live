/**
 * CustomerQuote database entity type
 * Represents a customer quote in the customer_quotes table
 */
export interface CustomerQuote {
  id: string;
  job_number: string;
  quote_date: string;
  quote_expiry_date: string;
  quote_type: string;
  status: string;
  quote_status: string;
  
  // Job details
  job_type: string;
  job_description: string;
  purchase_type: string;
  quotation_job_type: string;
  priority: string;
  
  // Customer information
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  
  // Vehicle information
  vehicle_registration: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vin_number: string | null;
  odormeter: number | null;
  
  // Quotation products and pricing
  quotation_products: any[]; // JSON array
  quotation_subtotal: number;
  quotation_vat_amount: number;
  quotation_total_amount: number;
  
  // Email details
  quote_email_body: string;
  quote_email_subject: string;
  quote_email_footer: string;
  quote_notes: string;
  
  // Additional fields
  special_instructions: string | null;
  work_notes: string | null;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string;
}
