/**
 * JobCard database entity type
 * Represents a job card in the job_cards table
 */
export interface JobCard {
  id: string; // uuid
  
  // Job identification
  job_number: string;
  job_type: string; // 'install', 'repair', etc.
  repair: boolean;
  job_description: string;
  priority: string; // 'low', 'medium', 'high'
  status: string; // 'draft', 'pending', 'approved', 'completed', etc.
  job_status: string; // 'created', 'in_progress', 'completed', etc.
  
  // Customer information
  account_id?: string; // uuid, references accounts.id
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  
  // Vehicle information
  vehicle_id?: string; // uuid, references vehicles.id
  vehicle_registration: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vin_numer?: string;
  odormeter?: string;
  
  // Location information
  job_location?: string;
  latitude?: number;
  longitude?: number;
  
  // Quotation details
  quotation_number?: string;
  quote_date?: string; // ISO date string
  quote_expiry_date?: string; // ISO date string
  quote_status?: string; // 'draft', 'sent', 'accepted', 'rejected'
  
  // Quotation metadata
  purchase_type?: string; // 'purchase', 'rental', etc.
  quotation_job_type?: string; // 'install', 'repair', etc.
  
  // Quotation pricing
  quotation_products?: Record<string, unknown>[]; // jsonb[]
  quotation_subtotal?: number;
  quotation_vat_amount?: number;
  quotation_total_amount?: number;
  
  // Quotation email
  quote_email_subject?: string;
  quote_email_body?: string;
  quote_email_footer?: string;
  quote_notes?: string;
  quote_type?: string; // 'internal', 'external'
  
  // Additional instructions
  special_instructions?: string;
  
  // Technician information
  technician_id?: string; // uuid, references technicians.id
  technician_name?: string;
  technician_phone?: string;
  
  // Job timing
  job_date?: string; // ISO date string
  start_time?: string; // time
  completion_date?: string; // ISO date string
  end_time?: string; // time
  
  // Photos
  before_photos?: string[]; // jsonb[]
  after_photos?: string[]; // jsonb[]
  
  // Metadata
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  created_by?: string; // uuid
  updated_by?: string; // uuid
  
  // Approval information
  approved?: boolean;
  approval_date?: string; // ISO timestamp
  approved_by?: string; // uuid
}
