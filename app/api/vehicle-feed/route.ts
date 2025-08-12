import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Fetch data from external API
    const response = await fetch('http://64.227.138.235:8000/latest', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`External API error: ${response.status}`);
    }

    const data = await response.json();

    // Return the data to the frontend
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Vehicle feed proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch vehicle data', 
        details: error.message 
      },
      { status: 500 }
    );
  }
} 