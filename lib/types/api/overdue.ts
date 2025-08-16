import { OverdueAccount, OverdueSummary } from '@/lib/types/database/overdue';

/**
 * GET /api/overdue-check request parameters
 */
export interface GetOverdueCheckRequest {
  forceRefresh?: boolean;
}

/**
 * GET /api/overdue-check response
 */
export interface GetOverdueCheckResponse {
  success: boolean;
  timestamp: string;
  forceRefresh?: boolean;
  summary: OverdueSummary;
  topOverdueAccounts: OverdueAccount[];
  allOverdueAccounts: OverdueAccount[];
}
