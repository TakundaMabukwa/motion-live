import { NextRequest, NextResponse } from 'next/server';
import { CustomerGroupedService } from '@/lib/services/customer-grouped-service';
import { handleApiError } from '@/lib/errors';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';
import { Logger } from '@/lib/logger';

// Create an instance of the service and logger
const service = new CustomerGroupedService();
const logger = new Logger('customers-grouped-api');

/**
 * GET /api/customers-grouped
 * Get all customer groups with optional search and pagination
 */
export async function GET(request: NextRequest) {
  try {
    logger.debug('Starting customers-grouped request');
    
    // Get authenticated user
    try {
      const user = await getAuthenticatedUser();
      logger.debug('User authenticated successfully', { user: user.email });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_authError) {
      logger.warn('Authentication failed');
      return createUnauthorizedResponse();
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const fetchAll = searchParams.get('fetchAll') === 'true';

    logger.debug('Query parameters', { page, search, fetchAll });

    // Get customer groups from service
    const result = await service.getCustomerGroups({
      page,
      search,
      fetchAll
    });

    logger.info('Request completed successfully', { 
      groupsCount: result.companyGroups.length,
      totalCount: result.count
    });
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in customers-grouped GET', error as Error);
    const { message, status } = handleApiError(error as Error);
    return NextResponse.json({ error: message }, { status });
  }
} 