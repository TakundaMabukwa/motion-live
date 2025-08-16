import { CustomerGrouped } from '@/lib/types/database/customer-grouped';

/**
 * Repository for interacting with customer group data in the database
 */
export class CustomerGroupedRepository {
  /**
   * Find all customer groups with optional search and pagination
   * @param search Optional search string to filter results
   * @param page Optional page number for pagination
   * @param limit Optional limit per page
   * @param fetchAll Optional flag to fetch all records without pagination
   * @returns An object containing the customer groups, count, and pagination info
   */
  async findAll(
    search?: string,
    page?: number,
    limit?: number,
    fetchAll?: boolean
  ): Promise<{
    data: CustomerGrouped[],
    count: number | null
  }> {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const effectiveLimit = limit || 20;
    const effectivePage = page || 1;
    const offset = (effectivePage - 1) * effectiveLimit;
    
    // Build the query
    let query = supabase
      .from('customers_grouped')
      .select(`
        id,
        company_group,
        legal_names,
        all_account_numbers,
        all_new_account_numbers,
        created_at
      `, { count: 'exact' });

    // Apply search filter if provided
    if (search?.trim()) {
      try {
        query = query.or(
          `company_group.ilike.%${search}%,` +
          `legal_names.ilike.%${search}%,` +
          `all_account_numbers.ilike.%${search}%`
        );
      } catch (searchError) {
        // Fallback to simple search on company_group only
        query = query.ilike('company_group', `%${search}%`);
      }
    }

    // Apply pagination - if fetchAll is true, get all records
    if (fetchAll) {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + effectiveLimit - 1);
    }

    const { data, error, count } = await query;
      
    if (error) {
      throw error;
    }
    
    return {
      data: data as CustomerGrouped[],
      count
    };
  }
}
