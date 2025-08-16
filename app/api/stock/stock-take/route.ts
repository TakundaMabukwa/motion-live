import { NextRequest, NextResponse } from 'next/server';
import { StockService } from '@/lib/services/stock-service';
import { handleApiError } from '@/lib/errors';
import { Logger } from '@/lib/logger';
import { StockTakeRequest } from '@/lib/types/api/stock';

// Create service and logger instances
const stockService = new StockService();
const logger = new Logger('API:stock-take');

export async function POST(request: NextRequest) {
  try {
    logger.debug('Processing POST request');
    
    const supabase = await (await import('@/lib/supabase/server')).createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.warn('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    logger.info('Received stock take data', { 
      updates: body.stock_updates?.length || 0,
      date: body.stock_take_date
    });

    // Validate basic structure before passing to service
    if (!body.stock_updates || !Array.isArray(body.stock_updates)) {
      logger.warn('Invalid request format', { body });
      return NextResponse.json({ error: 'Invalid stock updates data' }, { status: 400 });
    }

    // Process stock take using service
    const result = await stockService.processStockTake(body as StockTakeRequest, user.id);

    logger.info('Stock take completed', { 
      success: result.success,
      updated: result.updated_count,
      total: result.total_items,
      errors: result.errors?.length || 0
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in stock take POST:', error as Error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    logger.info('Fetching stock take history', { limit, offset });

    // Fetch stock take history
    const { data: stockTakeHistory, error } = await supabase
      .from('stock_take_log')
      .select(`
        *,
        stock_item:stock(description, code, supplier, stock_type)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching stock take history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.info(`Found ${stockTakeHistory?.length || 0} stock take history records`);
    return NextResponse.json({ 
      stock_take_history: stockTakeHistory || [],
      total: stockTakeHistory?.length || 0
    });

  } catch (error) {
    logger.error('Error in stock take history GET:', error as Error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}