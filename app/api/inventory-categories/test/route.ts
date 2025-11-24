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

    // Sample categories to create
    const sampleCategories = [
      { code: 'VW-100IP', description: 'IP CAMERA DRIVER FACING' },
      { code: 'KEYBOARD', description: 'KEYBOARD WATERPROOF FOR STARLINK' },
      { code: 'SKYLINK', description: 'SKYLINK LIN ADAPTER' },
      { code: 'GPS-TRACKER', description: 'GPS TRACKING DEVICE' },
      { code: 'ANTENNA', description: 'ANTENNA EQUIPMENT' },
      { code: 'CABLE', description: 'CABLES AND WIRING' },
      { code: 'MOUNT', description: 'MOUNTING HARDWARE' },
      { code: 'SENSOR', description: 'SENSOR EQUIPMENT' }
    ];

    const results = [];
    
    for (const category of sampleCategories) {
      try {
        const { data, error } = await supabase
          .from('inventory_categories')
          .upsert(category, { onConflict: 'code' })
          .select()
          .single();

        if (error) {
          console.error(`Error creating category ${category.code}:`, error);
          results.push({ category: category.code, status: 'error', error: error.message });
        } else {
          results.push({ category: category.code, status: 'success', data });
        }
      } catch (err) {
        console.error(`Exception creating category ${category.code}:`, err);
        results.push({ category: category.code, status: 'exception', error: err.message });
      }
    }

    return NextResponse.json({ 
      message: 'Test categories creation completed',
      results 
    });
  } catch (error) {
    console.error('Error in test categories POST:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}