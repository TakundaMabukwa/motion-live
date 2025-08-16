import { z } from 'zod';

/**
 * Schema for getting vehicle invoices with filtering
 */
export const GetVehicleInvoicesRequestSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(20),
  search: z.string().optional()
});

/**
 * Request type for getting vehicle invoices with filtering
 */
export type GetVehicleInvoicesRequest = z.infer<typeof GetVehicleInvoicesRequestSchema>;

/**
 * Transformed vehicle invoice for API responses
 */
export interface VehicleInvoiceDTO {
  id: string;
  company: string;
  accountNumber: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  status: string;
  monthlyAmount: number;
  overdueAmount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response type for getting vehicle invoices
 */
export interface GetVehicleInvoicesResponse {
  invoices: VehicleInvoiceDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
