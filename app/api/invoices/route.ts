import { NextRequest, NextResponse } from 'next/server';
import { InvoiceService } from '@/lib/services/invoice-service';
import { handleApiError } from '@/lib/errors';
import { validateRequest } from '@/lib/api/validation';
import { GetInvoicesRequestSchema, UpdateInvoiceStatusSchema } from '@/lib/types/api/invoice';
import { Logger } from '@/lib/logger';

// Create service and logger instances
const invoiceService = new InvoiceService();
const logger = new Logger('API:invoices');

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

    // Get and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = {
      status: searchParams.get('status') as string || undefined,
      limit: parseInt(searchParams.get('limit') || '100'),
      offset: parseInt(searchParams.get('offset') || '0')
    };
    
    logger.info('Fetching invoices', params);
    
    // Validate parameters
    const validatedParams = validateRequest(params, GetInvoicesRequestSchema);
    
    // Get invoices from service
    const result = await invoiceService.getInvoices(validatedParams);
    
    logger.info(`Returning ${result.invoices.length} invoices`, { 
      total: result.count,
      page: result.page,
      totalPages: result.total_pages
    });
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in invoices GET:', error as Error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

// Update invoice status (approve/reject)
export async function PATCH(request: NextRequest) {
  try {
    logger.debug('Processing PATCH request');
    
    const supabase = await (await import('@/lib/supabase/server')).createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.warn('Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    logger.info('Received invoice status update request', { 
      orderId: body.orderId,
      status: body.status
    });
    
    // Validate the request data
    const validatedData = validateRequest(body, UpdateInvoiceStatusSchema);
    
    // Update invoice status
    const result = await invoiceService.updateInvoiceStatus(validatedData);
    
    logger.info('Invoice status updated', result);
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in invoices PATCH:', error as Error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
