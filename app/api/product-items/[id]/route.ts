import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/services/product-service';
import { handleApiError } from '@/lib/errors';
import { validateRequest } from '@/lib/api/validation';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';
import { UpdateProductItemSchema } from '@/lib/types/api/product';

// Create an instance of the service
const productService = new ProductService();

export async function GET(
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
    
    // Get product from service
    const product = await productService.getProductById(id);

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error in product item GET:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function PUT(
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
    const validatedData = validateRequest(body, UpdateProductItemSchema);
    
    // Update product
    const updatedProduct = await productService.updateProduct(id, validatedData);

    return NextResponse.json({ 
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    console.error('Error in product item PUT:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export async function DELETE(
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
    
    // Delete product
    await productService.deleteProduct(id);

    return NextResponse.json({ 
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error in product item DELETE:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
