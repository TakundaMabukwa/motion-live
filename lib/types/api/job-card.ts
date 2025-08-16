import { z } from 'zod';

/**
 * Request schema for getting job cards with pagination
 */
export const GetJobCardsRequestSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(50)
});

/**
 * Request type for getting job cards with pagination
 */
export type GetJobCardsRequest = z.infer<typeof GetJobCardsRequestSchema>;

/**
 * Response type for getting job cards with pagination
 */
export interface GetJobCardsResponse {
  job_cards: JobCardSummary[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Summary of a job card for listing
 */
export interface JobCardSummary {
  id: string;
  job_number: string;
  customer_name: string;
  job_type: string;
  status: string;
  created_at: string;
}

/**
 * Schema for creating a job card
 */
export const CreateJobCardSchema = z.object({
  // Job details
  jobType: z.string().optional(),
  job_type: z.string().optional(),
  repair: z.boolean().optional(),
  jobDescription: z.string().optional(),
  job_description: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  job_status: z.string().optional(),
  
  // Customer information
  accountId: z.string().nullable().optional(),
  account_id: z.string().nullable().optional(),
  customerName: z.string().optional(),
  customer_name: z.string().optional(),
  customerEmail: z.string().optional(),
  customer_email: z.string().optional(),
  customerPhone: z.string().optional(),
  customer_phone: z.string().optional(),
  customerAddress: z.string().optional(),
  customer_address: z.string().optional(),
  
  // Vehicle information
  vehicleId: z.string().nullable().optional(),
  vehicle_id: z.string().nullable().optional(),
  vehicleRegistration: z.string().optional(),
  vehicle_registration: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicle_make: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicleYear: z.number().nullable().optional(),
  vehicle_year: z.number().nullable().optional(),
  vinNumber: z.string().optional(),
  vin_numer: z.string().optional(),
  odormeter: z.string().optional(),
  
  // Location information
  jobLocation: z.string().optional(),
  job_location: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  
  // Quotation details
  quotationNumber: z.string().optional(),
  quotation_number: z.string().optional(),
  quoteDate: z.string().optional(),
  quote_date: z.string().optional(),
  quoteExpiryDate: z.string().nullable().optional(),
  quote_expiry_date: z.string().nullable().optional(),
  quoteStatus: z.string().optional(),
  quote_status: z.string().optional(),
  
  // Quotation metadata
  purchaseType: z.string().optional(),
  purchase_type: z.string().optional(),
  quotationJobType: z.string().optional(),
  quotation_job_type: z.string().optional(),
  
  // Quotation pricing
  quotationProducts: z.array(z.record(z.unknown())).optional(),
  quotation_products: z.array(z.record(z.unknown())).optional(),
  quotationSubtotal: z.number().optional(),
  quotation_subtotal: z.number().optional(),
  quotationVatAmount: z.number().optional(),
  quotation_vat_amount: z.number().optional(),
  quotationTotalAmount: z.number().optional(),
  quotation_total_amount: z.number().optional(),
  
  // Quotation email
  quoteEmailSubject: z.string().optional(),
  quote_email_subject: z.string().optional(),
  quoteEmailBody: z.string().optional(),
  quote_email_body: z.string().optional(),
  quoteEmailFooter: z.string().optional(),
  quote_email_footer: z.string().optional(),
  quoteNotes: z.string().optional(),
  quote_notes: z.string().optional(),
  quoteType: z.string().optional(),
  quote_type: z.string().optional(),
  
  // Additional instructions
  specialInstructions: z.string().optional(),
  special_instructions: z.string().optional(),
  
  // Technician information
  technician_id: z.string().nullable().optional(),
  technician_name: z.string().nullable().optional(),
  technician_phone: z.string().nullable().optional(),
  
  // Job timing
  job_date: z.string().optional(),
  start_time: z.string().nullable().optional(),
  completion_date: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  
  // Photos
  before_photos: z.array(z.string()).nullable().optional(),
  after_photos: z.array(z.string()).nullable().optional(),
  
  // Metadata
  created_by: z.string().optional(),
  updated_by: z.string().optional(),
  
  // Job number
  job_number: z.string().optional()
});

/**
 * Request type for creating a job card
 */
export type CreateJobCardRequest = z.infer<typeof CreateJobCardSchema>;

/**
 * Response type for creating a job card
 */
export interface CreateJobCardResponse {
  success: boolean;
  message: string;
  data: JobCardSummary;
}
