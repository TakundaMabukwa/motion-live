import { CustomerGrouped } from '@/lib/types/database/customer-grouped';

/**
 * TransformedCustomerGroup type - used in API responses
 */
export interface TransformedCustomerGroup {
  id: string;
  company_group: string;
  legal_names: string;
  all_account_numbers: string;
  all_new_account_numbers?: string;
  created_at: string;
  account_count: number;
  legal_names_list: string[];
}

/**
 * GET /api/customers-grouped request parameters
 */
export interface GetCustomerGroupsRequest {
  page?: number;
  search?: string;
  fetchAll?: boolean;
}

/**
 * GET /api/customers-grouped response
 */
export interface GetCustomerGroupsResponse {
  companyGroups: TransformedCustomerGroup[];
  count: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
  fetchAll: boolean;
}
