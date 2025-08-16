/**
 * OverdueAccount type for representing overdue account information
 */
export interface OverdueAccount {
  accountNumber: string;
  company: string;
  totalMonthlyAmount: number;
  totalOverdue: number;
  overdue1_30: number;
  overdue31_60: number;
  overdue61_90: number;
  overdue91_plus: number;
  vehicleCount: number;
}

/**
 * OverdueSummary type for summarizing overdue information
 */
export interface OverdueSummary {
  totalAccountsWithOverdue: number;
  totalOverdueAmount: number;
  monthsLate: number;
  paymentDueDay: number;
}
