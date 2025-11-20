import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const registration = searchParams.get('registration');

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('reg', registration)
      .single();

    if (error) {
      console.error('Error fetching vehicle details:', error);
      return NextResponse.json(
        { error: 'Failed to fetch vehicle details' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle
    });

  } catch (error) {
    console.error('Error in vehicle details API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}