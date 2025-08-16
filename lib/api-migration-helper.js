// This script provides utilities to help with API route migrations
// Execute this in the browser console or Node.js environment to get templates

/**
 * Generates a template for a new API route using the architecture
 * @param {string} routeName The name of the route (e.g., 'vehicles')
 * @param {string} method The HTTP method (GET, POST, PUT, DELETE)
 * @param {string} serviceName The name of the service to use
 * @param {string} serviceMethodName The method in the service to call
 * @returns {string} The template code
 */
function generateApiRouteTemplate(routeName, method, serviceName, serviceMethodName) {
  const template = `import { NextRequest, NextResponse } from 'next/server';
import { ${serviceName} } from '@/lib/services/${serviceName.toLowerCase().replace('Service', '')}-service';
import { handleApiError } from '@/lib/errors';
import { safeValidateRequest } from '@/lib/validation';
import { getAuthenticatedUser, createUnauthorizedResponse } from '@/lib/auth/auth-utils';

// Create an instance of the service
const ${serviceName.charAt(0).toLowerCase() + serviceName.slice(1)} = new ${serviceName}();

/**
 * ${method} /api/${routeName}
 * [Description of what this endpoint does]
 */
export async function ${method}(request: NextRequest) {
  try {
    // Get authenticated user if needed
    let user;
    try {
      user = await getAuthenticatedUser();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return createUnauthorizedResponse();
    }

    // Get request parameters
    ${method === 'GET' ? `const { searchParams } = new URL(request.url);
    const param1 = searchParams.get('param1');
    const param2 = searchParams.get('param2');` : `const body = await request.json();
    const { param1, param2 } = body;`}
    
    // Validate request
    // const validation = safeValidateRequest(
    //   { param1, param2 }, 
    //   SomeSchema
    // );
    
    // if (!validation.success) {
    //   return NextResponse.json({ error: validation.error }, { status: 400 });
    // }
    
    // Use service to handle business logic
    const result = await ${serviceName.charAt(0).toLowerCase() + serviceName.slice(1)}.${serviceMethodName}({
      param1,
      param2
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in ${routeName} ${method}:', error);
    const { error: errorMessage, status } = handleApiError(error);
    return NextResponse.json({ error: errorMessage }, { status });
  }
}`;

  return template;
}

// Example usage:
// generateApiRouteTemplate('products', 'GET', 'ProductService', 'getAllProducts');
// generateApiRouteTemplate('orders', 'POST', 'OrderService', 'createOrder');

module.exports = {
  generateApiRouteTemplate
};
