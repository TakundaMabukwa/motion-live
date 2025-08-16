import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/services/product-service';
import { handleApiError } from '@/lib/errors';
import { validateRequest } from '@/lib/api/validation';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';
import { z } from 'zod';

// Create an instance of the service
const productService = new ProductService();

// Schema for updating stock
const UpdateStockSchema = z.object({
  quantity: z.coerce.number({
    required_error: 'Quantity is required',
    invalid_type_error: 'Quantity must be a number'
  })
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate the user
    try {
      await getAuthenticatedUser();
    } catch {
      return createUnauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();
    
    // Validate request body
    const { quantity } = validateRequest(body, UpdateStockSchema);
    
    // Update stock
    const updatedProduct = await productService.updateProductStock(id, quantity);

    return NextResponse.json({ 
      success: true,
      message: 'Stock updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error in product stock update:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
