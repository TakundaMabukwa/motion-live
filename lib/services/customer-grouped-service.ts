import { CustomerGroupedRepository } from '@/lib/repositories/customer-grouped-repository';
import { 
  GetCustomerGroupsRequest, 
  GetCustomerGroupsResponse, 
  TransformedCustomerGroup 
} from '@/lib/types/api/customer-grouped';
import { CustomerGrouped } from '@/lib/types/database/customer-grouped';
import { Cache } from '@/lib/cache/memory-cache';
import { Logger } from '@/lib/logger';

/**
 * Service for customer group-related business logic
 */
export class CustomerGroupedService {
  private repository: CustomerGroupedRepository;
  private cache: Cache;
  private logger: Logger;
  
  constructor() {
    this.repository = new CustomerGroupedRepository();
    this.cache = Cache.getInstance();
    this.logger = new Logger('CustomerGroupedService');
  }
  
  /**
   * Get all customer groups with optional search and pagination
   * @param params Request parameters (page, search, fetchAll)
   * @returns Customer groups with pagination info
   */
  async getCustomerGroups(params: GetCustomerGroupsRequest): Promise<GetCustomerGroupsResponse> {
    try {
      this.logger.debug('Getting customer groups', params);
      
      const { page = 1, search, fetchAll = false } = params;
      const limit = 20; // Fixed limit per page
      
      // Generate cache key based on parameters
      const cacheKey = `customer-groups:${page}:${search || 'none'}:${fetchAll}`;
      
      return await this.cache.getOrSet(
        cacheKey,
        async () => {
          this.logger.debug('Cache miss for customer groups, fetching from database');
          
          // Get data from repository
          const { data: customerGroups, count } = await this.repository.findAll(
            search,
            page,
            limit,
            fetchAll
          );
          
          // Transform the data to match the expected format
          const transformedGroups = this.transformCustomerGroups(customerGroups);
          
          const totalCount = count || 0;
          
          this.logger.info(`Found ${transformedGroups.length} customer groups`, {
            totalCount,
            page,
            search: search || 'none'
          });
          
          return {
            companyGroups: transformedGroups,
            count: totalCount,
            page,
            limit,
            hasMore: fetchAll ? false : (totalCount ? page * limit < totalCount : false),
            totalPages: totalCount ? Math.ceil(totalCount / limit) : 0,
            fetchAll
          };
        },
        { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
      );
    } catch (error) {
      this.logger.error('Error getting customer groups', error as Error);
      throw error;
    }
  }
  
  /**
   * Transform customer groups to the format expected by the API
   * @param customerGroups The raw customer groups from the database
   * @returns Transformed customer groups
   */
  private transformCustomerGroups(customerGroups: CustomerGrouped[]): TransformedCustomerGroup[] {
    return customerGroups.map(group => ({
      id: group.id,
      company_group: group.company_group,
      legal_names: group.legal_names,
      all_account_numbers: group.all_account_numbers,
      all_new_account_numbers: group.all_new_account_numbers,
      created_at: group.created_at,
      // Parse account numbers for display
      account_count: group.all_account_numbers ? group.all_account_numbers.split(',').length : 0,
      // Parse legal names for display
      legal_names_list: group.legal_names ? group.legal_names.split(',').map(name => name.trim()) : []
    }));
  }
}
