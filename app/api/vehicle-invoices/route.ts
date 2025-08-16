import { NextRequest, NextResponse } from 'next/server';
import { VehicleInvoiceService } from '@/lib/services/vehicle-invoice-service';
import { handleApiError } from '@/lib/errors';
import { validateRequest } from '@/lib/api/validation';
import { GetVehicleInvoicesRequestSchema } from '@/lib/types/api/vehicle-invoice';
import { Logger } from '@/lib/logger';

// Create service and logger instances
const vehicleInvoiceService = new VehicleInvoiceService();
const logger = new Logger('API:vehicle-invoices');

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
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search') || undefined
    };
    
    logger.info('Fetching vehicle invoices', params);
    
    // Validate parameters
    const validatedParams = validateRequest(params, GetVehicleInvoicesRequestSchema);
    
    // Get vehicle invoices from service
    const result = await vehicleInvoiceService.getVehicleInvoices(validatedParams);
    
    logger.info(`Returning ${result.invoices.length} vehicle invoices`, { 
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    });
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in vehicle invoices GET:', error as Error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
