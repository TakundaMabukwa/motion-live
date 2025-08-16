import { z } from 'zod';

/**
 * Schema for getting invoices with filtering
 */
export const GetInvoicesRequestSchema = z.object({
  status: z.enum(['pending', 'approved']).optional(),
  limit: z.number().int().positive().optional().default(100),
  offset: z.number().int().nonnegative().optional().default(0)
});

/**
 * Request type for getting invoices with filtering
 */
export type GetInvoicesRequest = z.infer<typeof GetInvoicesRequestSchema>;

/**
 * Transformed invoice for API responses
 */
export interface InvoiceDTO {
  id: string; // order_number
  client: string; // supplier
  amount: number; // total_amount_ex_vat as number
  date: string; // order_date formatted as ISO date string
  approved: boolean; // status === 'approved'
  dueDate: string; // Currently same as date
  pdfUrl: string; // invoice_link
  orderId: string; // id
  totalAmountUSD?: string; // total_amount_usd
  orderItems: any[]; // order_items
}

/**
 * Response type for getting invoices
 */
export interface GetInvoicesResponse {
  invoices: InvoiceDTO[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Schema for updating invoice status
 */
export const UpdateInvoiceStatusSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Status must be either "approved" or "rejected"' })
  })
});

/**
 * Request type for updating invoice status
 */
export type UpdateInvoiceStatusRequest = z.infer<typeof UpdateInvoiceStatusSchema>;

/**
 * Response type for invoice status update
 */
export interface UpdateInvoiceStatusResponse {
  success: boolean;
  message: string;
}
