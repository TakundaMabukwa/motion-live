import { z } from 'zod';

/**
 * Get active jobs request parameters
 */
export const GetActiveJobsRequestSchema = z.object({
  status: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional()
});

export type GetActiveJobsRequest = z.infer<typeof GetActiveJobsRequestSchema>;

/**
 * Job item in transformed response format
 */
export interface JobItem {
  id: string;
  product_name: string;
  quantity: number;
  subtotal: number;
  technician: string | null;
  date: string | null;
  time: string | null;
}

/**
 * Transformed job response format
 */
export interface TransformedJob {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  job_type: string;
  total_amount: number;
  jobs: JobItem[];
}

/**
 * Response for active jobs list
 */
export interface GetActiveJobsResponse {
  quotes: TransformedJob[];
  count: number;
}

/**
 * Health check response
 */
export interface JobHealthCheckResponse {
  status: string;
  message: string;
  timestamp: string;
  databaseConnection: boolean;
}
