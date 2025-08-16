import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/lib/services/product-service';
import { handleApiError } from '@/lib/errors';
import { validateRequest } from '@/lib/api/validation';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';
import { 
  GetProductItemsRequestSchema,
  CreateProductItemSchema
} from '@/lib/types/api/product';

// Create an instance of the service
const productService = new ProductService();

/**
 * GET /api/product-items
 * Get all product items with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    try {
      await getAuthenticatedUser();
    } catch (error) {
      return createUnauthorizedResponse();
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const params = {
      type: searchParams.get('type'),
      category: searchParams.get('category'),
      search: searchParams.get('search')
    };
    
    const validatedParams = validateRequest(params, GetProductItemsRequestSchema);
    
    // Get products from service
    const products = await productService.getAllProducts(validatedParams);

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error in product items GET:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}

/**
 * POST /api/product-items
 * Create a new product item
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    try {
      await getAuthenticatedUser();
    } catch (error) {
      return createUnauthorizedResponse();
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = validateRequest(body, CreateProductItemSchema);
    
    // Create product
    const product = await productService.createProduct(validatedData);

    return NextResponse.json({ 
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Error in product items POST:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}