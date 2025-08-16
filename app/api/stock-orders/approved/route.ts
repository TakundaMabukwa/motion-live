import { NextRequest, NextResponse } from 'next/server';
import { StockService } from '@/lib/services/stock-service';
import { handleApiError } from '@/lib/errors';
import { Logger } from '@/lib/logger';

// Create service and logger instances
const stockService = new StockService();
const logger = new Logger('API:stock-orders:approved');

export async function GET(request: NextRequest) {
  try {
    logger.debug('Processing GET request');
    
    const supabase = await (await import('@/lib/supabase/server')).createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.warn('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    logger.info('Fetching approved stock orders', { limit, offset, search });

    // Use service to get approved stock orders
    const result = await stockService.getApprovedStockOrders(limit, offset, search || undefined);

    logger.info(`Found ${result.orders.length} approved stock orders`, { 
      total: result.count,
      page: result.page,
      totalPages: result.total_pages
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in approved stock orders GET:', error as Error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
