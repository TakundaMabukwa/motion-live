import { NextRequest, NextResponse } from 'next/server';
import { CustomerQuoteService } from '@/lib/services/customer-quote-service';
import { handleApiError } from '@/lib/errors';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';
import { Logger } from '@/lib/logger';

// Create an instance of the service and logger
const service = new CustomerQuoteService();
const logger = new Logger('customer-quotes-api');

/**
 * POST /api/customer-quotes
 * Create a new customer quote
 */
export async function POST(request: NextRequest) {
  try {
    logger.debug('Starting customer quote creation request');
    
    // Get authenticated user
    let user;
    try {
      user = await getAuthenticatedUser();
      logger.debug('User authenticated successfully', { user: user.email });
    } catch (error) {
      logger.warn('Authentication failed');
      return createUnauthorizedResponse();
    }

    // Parse request body
    const body = await request.json();
    
    logger.debug('Creating customer quote', { customerName: body.customerName });

    // Create quote via service
    const result = await service.createQuote(body, user.id);
    
    logger.info('Customer quote created successfully', { 
      id: result.data.id,
      jobNumber: result.data.job_number
    });
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in customer quotes POST', error as Error);
    const { message, status } = handleApiError(error as Error);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * GET /api/customer-quotes
 * Get customer quotes
 */
export async function GET(request: NextRequest) {
  try {
    logger.debug('Starting customer quotes GET request');
    
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
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : undefined;

    logger.debug('Getting customer quotes', { status, limit });

    // Get quotes via service
    const result = await service.getQuotes(status, limit);
    
    logger.info('Customer quotes retrieved successfully', { 
      count: result.data.length
    });
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in customer quotes GET', error as Error);
    const { message, status } = handleApiError(error as Error);
    return NextResponse.json({ error: message }, { status });
  }
}
