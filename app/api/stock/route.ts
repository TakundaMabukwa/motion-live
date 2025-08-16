import { NextRequest, NextResponse } from 'next/server';
import { StockService } from '@/lib/services/stock-service';
import { handleApiError } from '@/lib/errors';
import { Logger } from '@/lib/logger';

// Create service and logger instances
const stockService = new StockService();
const logger = new Logger('API:stock');

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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const supplier = searchParams.get('supplier');
    const stockType = searchParams.get('stock_type');

    logger.info('Fetching stock items', { search, supplier, stockType });

    // Use stock service to get filtered stock items
    const stock = await stockService.getStock(search || undefined, supplier || undefined, stockType || undefined);

    logger.info(`Returning ${stock.length} stock items`);
    return NextResponse.json({ stock });
  } catch (error) {
    logger.error('Error in stock GET:', error as Error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}