/**
 * CustomerGrouped database entity type
 * Represents a customer group in the customers_grouped table
 */
export interface CustomerGrouped {
  id: string;
  company_group: string;
  legal_names: string;
  all_account_numbers: string;
  all_new_account_numbers?: string;
  created_at: string;
}
