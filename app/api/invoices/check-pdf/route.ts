import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pdfUrl } = body;

    if (!pdfUrl) {
      return NextResponse.json({ error: 'PDF URL is required' }, { status: 400 });
    }

    // Check if the PDF is accessible
    try {
      const response = await fetch(pdfUrl, { method: 'HEAD' });
      
      if (response.ok) {
        return NextResponse.json({
          accessible: true,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        });
      } else {
        return NextResponse.json({
          accessible: false,
          status: response.status,
          statusText: response.statusText,
          error: `HTTP ${response.status}: ${response.statusText}`
        });
      }
    } catch (fetchError) {
      return NextResponse.json({
        accessible: false,
        error: 'Network error or CORS issue',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('Error in check-pdf:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
