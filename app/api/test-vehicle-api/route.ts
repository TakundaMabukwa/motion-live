import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing external vehicle API...');
    
    const startTime = Date.now();
    
    // Test the external API
    const response = await fetch('http://64.227.138.235:8000/latest', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const result = {
      status: response.status,
      statusText: response.statusText,
      responseTime: `${responseTime}ms`,
      headers: Object.fromEntries(response.headers.entries()),
      timestamp: new Date().toISOString()
    };
    
    if (response.ok) {
      try {
        const data = await response.json();
        result.data = data;
        result.success = true;
        result.message = 'External API is working correctly';
      } catch (parseError) {
        result.success = false;
        result.message = 'External API responded but returned invalid JSON';
        result.parseError = parseError.message;
      }
    } else {
      result.success = false;
      result.message = 'External API returned an error status';
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error testing external vehicle API:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to connect to external vehicle API',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
