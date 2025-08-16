import { NextRequest, NextResponse } from 'next/server';
import { OverdueService } from '@/lib/services/overdue-service';
import { handleApiError } from '@/lib/errors';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';
import { Logger } from '@/lib/logger';

// Create an instance of the service and logger
const service = new OverdueService();
const logger = new Logger('overdue-check-api');

/**
 * GET /api/overdue-check
 * Get overdue payment information
 */
export async function GET(_request: NextRequest) {
  try {
    logger.debug('Starting overdue check request');
    
    // Get authenticated user
    try {
      const user = await getAuthenticatedUser();
      logger.debug('User authenticated successfully', { user: user.email });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_authError) {
      logger.warn('Authentication failed');
      return createUnauthorizedResponse();
    }

    // Get overdue check from service
    const result = await service.getOverdueCheck();
    
    logger.info('Overdue check request completed successfully');
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in overdue check GET', error as Error);
    const { message, status } = handleApiError(error as Error);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/overdue-check
 * Force refresh overdue payment information
 */
export async function POST(request: NextRequest) {
  try {
    logger.debug('Starting overdue check POST request');
    
    // Get authenticated user
    try {
      const user = await getAuthenticatedUser();
      logger.debug('User authenticated successfully', { user: user.email });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_authError) {
      logger.warn('Authentication failed');
      return createUnauthorizedResponse();
    }

    // Parse request body
    const body = await request.json();
    const { forceRefresh = true } = body; // Default to true for POST
    
    logger.debug('Overdue check POST parameters', { forceRefresh });

    // Get overdue check from service with force refresh
    const result = await service.getOverdueCheck({ forceRefresh });
    
    logger.info('Overdue check POST request completed successfully');
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in overdue check POST', error as Error);
    const { message, status } = handleApiError(error as Error);
    return NextResponse.json({ error: message }, { status });
  }
}
