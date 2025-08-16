import { OverdueRepository } from '@/lib/repositories/overdue-repository';
import { 
  GetOverdueCheckRequest, 
  GetOverdueCheckResponse 
} from '@/lib/types/api/overdue';
import {
  OverdueAccount,
  OverdueSummary
} from '@/lib/types/database/overdue';
import { Cache } from '@/lib/cache/memory-cache';
import { Logger } from '@/lib/logger';

/**
 * Service for overdue payment-related business logic
 */
export class OverdueService {
  private repository: OverdueRepository;
  private cache: Cache;
  private logger: Logger;
  private paymentDueDay = 21; // Payment is due on 21st of each month
  
  constructor() {
    this.repository = new OverdueRepository();
    this.cache = Cache.getInstance();
    this.logger = new Logger('OverdueService');
  }
  
  /**
   * Get overdue payment information
   * @param params Request parameters
   * @returns Overdue payment information
   */
  async getOverdueCheck(params: GetOverdueCheckRequest = {}): Promise<GetOverdueCheckResponse> {
    try {
      const { forceRefresh = false } = params;
      
      this.logger.debug('Getting overdue check', { forceRefresh });
      
      // Calculate the cache key
      const cacheKey = 'overdue-check';
      
      // Use cache unless force refresh is requested
      if (forceRefresh) {
        this.logger.info('Force refreshing overdue check data');
        this.cache.delete(cacheKey);
      }
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for overdue check, calculating from database');
          
          // Get current date and calculate overdue periods
          const now = new Date();
          const currentDay = now.getDate();
          
          // Calculate months late based on payment due day
          let monthsLate = 0;
          if (currentDay > this.paymentDueDay) {
            monthsLate = 1; // Current month is overdue
          }
          
          // Get all subscriptions from repository
          const invoices = await this.repository.getMonthlySubscriptionInvoices();
          
          // Process invoices to calculate overdue amounts
          const { 
            overdueAccounts,
            totalOverdueAmount,
            totalAccountsWithOverdue
          } = this.calculateOverdueAmounts(invoices, monthsLate);
          
          // Sort accounts by total monthly amount (highest first)
          const sortedOverdueAccounts = Object.values(overdueAccounts)
            .sort((a, b) => b.totalMonthlyAmount - a.totalMonthlyAmount);
          
          this.logger.info('Overdue check calculated', {
            totalAccountsWithOverdue,
            totalOverdueAmount,
            accountsCount: sortedOverdueAccounts.length
          });
          
          return {
            success: true,
            timestamp: new Date().toISOString(),
            forceRefresh,
            summary: {
              totalAccountsWithOverdue,
              totalOverdueAmount,
              monthsLate,
              paymentDueDay: this.paymentDueDay
            },
            topOverdueAccounts: sortedOverdueAccounts.slice(0, 10),
            allOverdueAccounts: sortedOverdueAccounts
          };
        },
        { ttl: 60 * 60 * 1000 } // Cache for 1 hour
      );
    } catch (error) {
      this.logger.error('Error getting overdue check', error as Error);
      throw error;
    }
  }
  
  /**
   * Calculate overdue amounts for all accounts
   * @param invoices The vehicle invoices
   * @param monthsLate The number of months late
   * @returns Overdue accounts and summary information
   */
  private calculateOverdueAmounts(
    invoices: any[], 
    monthsLate: number
  ): {
    overdueAccounts: Record<string, OverdueAccount>;
    totalOverdueAmount: number;
    totalAccountsWithOverdue: number;
  } {
    const overdueAccounts: Record<string, OverdueAccount> = {};
    let totalOverdueAmount = 0;
    
    invoices.forEach(invoice => {
      const monthlyAmount = parseFloat(invoice.total_incl_vat) || 0;
      
      if (monthlyAmount > 0) {
        // Calculate overdue amounts for different periods
        const overdue1_30 = monthsLate >= 1 ? monthlyAmount : 0;
        const overdue31_60 = monthsLate >= 2 ? monthlyAmount : 0;
        const overdue61_90 = monthsLate >= 3 ? monthlyAmount : 0;
        const overdue91_plus = monthsLate >= 4 ? monthlyAmount : 0;
        
        const totalOverdue = overdue1_30 + overdue31_60 + overdue61_90 + overdue91_plus;

        const accountNumber = invoice.new_account_number;
        if (!accountNumber) return;

        if (!overdueAccounts[accountNumber]) {
          overdueAccounts[accountNumber] = {
            accountNumber,
            company: invoice.company,
            totalMonthlyAmount: 0,
            totalOverdue: 0,
            overdue1_30: 0,
            overdue31_60: 0,
            overdue61_90: 0,
            overdue91_plus: 0,
            vehicleCount: 0
          };
        }

        overdueAccounts[accountNumber].totalMonthlyAmount += monthlyAmount;
        overdueAccounts[accountNumber].totalOverdue += totalOverdue;
        overdueAccounts[accountNumber].overdue1_30 += overdue1_30;
        overdueAccounts[accountNumber].overdue31_60 += overdue31_60;
        overdueAccounts[accountNumber].overdue61_90 += overdue61_90;
        overdueAccounts[accountNumber].overdue91_plus += overdue91_plus;
        overdueAccounts[accountNumber].vehicleCount += 1;

        if (totalOverdue > 0) {
          totalOverdueAmount += totalOverdue;
        }
      }
    });
    
    const totalAccountsWithOverdue = Object.values(overdueAccounts)
      .filter(acc => acc.totalOverdue > 0).length;
    
    return {
      overdueAccounts,
      totalOverdueAmount,
      totalAccountsWithOverdue
    };
  }
}
