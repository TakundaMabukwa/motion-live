/**
 * Type definitions for vehicle-invoice-related database entities
 */

/**
 * Represents a vehicle invoice in the database
 */
export interface VehicleInvoice {
  id: string;
  company?: string;
  new_account_number?: string;
  invoice_number?: string;
  amount?: string; // Stored as string in DB
  due_date?: string;
  status?: string;
  monthly_amount?: string; // Stored as string in DB
  overdue_amount?: string; // Stored as string in DB
  created_at?: string;
  updated_at?: string;
}
