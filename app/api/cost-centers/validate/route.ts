import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const { cost_code, validated } = await request.json();
    
    if (!cost_code) {
      return NextResponse.json(
        { error: 'Cost code required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('cost_centers')
      .update({ validated })
      .eq('cost_code', cost_code)
      .select()
      .single();

    if (error) {
      console.error('Error updating cost center:', error);
      return NextResponse.json(
        { error: 'Failed to update cost center', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in cost center validate API:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to update cost center', details: errMsg },
      { status: 500 }
    );
  }
}
