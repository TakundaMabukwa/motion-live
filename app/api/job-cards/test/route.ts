import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test basic query
    const { data, error } = await supabase
      .from('job_cards')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Error in test query:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    // Also check table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('job_cards')
      .select('*')
      .limit(0);

    return NextResponse.json({
      message: 'Test endpoint working',
      job_cards_count: data?.length || 0,
      sample_data: data?.slice(0, 2) || [],
      table_exists: !tableError,
      user_id: user.id
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a test job card
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    const jobNumber = `TEST-JOB-${timestamp}-${randomSuffix}`;
    const quotationNumber = `TEST-QUOTE-${timestamp}-${randomSuffix}`;

    const testJobCard = {
      job_number: jobNumber,
      job_type: 'installation',
      job_description: 'Test installation job for inventory testing',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      customer_phone: '123-456-7890',
      customer_address: '123 Test Street, Test City',
      vehicle_registration: 'TEST123',
      vehicle_make: 'Test Make',
      vehicle_model: 'Test Model',
      job_status: 'pending',
      status: 'pending',
      quotation_number: quotationNumber,
      quote_date: new Date().toISOString(),
      quote_status: 'draft',
      purchase_type: 'purchase',
      quotation_job_type: 'installation',
      quotation_products: [],
      quotation_subtotal: 0,
      quotation_vat_amount: 0,
      quotation_total_amount: 0,
      created_by: user.id,
      updated_by: user.id
    };

    const { data, error } = await supabase
      .from('job_cards')
      .insert([testJobCard])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating test job card:', error);
      return NextResponse.json({ error: 'Failed to create test job card', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Test job card created successfully',
      job_card: data
    });

  } catch (error) {
    console.error('Error in test POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 