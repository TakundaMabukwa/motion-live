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

    console.log('Starting QR code fields migration...');

    // Add qr_code field if it doesn't exist
    const { error: qrError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'job_cards' AND column_name = 'qr_code'
            ) THEN
                ALTER TABLE job_cards ADD COLUMN qr_code TEXT;
                RAISE NOTICE 'Added qr_code column to job_cards table';
            ELSE
                RAISE NOTICE 'qr_code column already exists in job_cards table';
            END IF;
        END $$;
      `
    });

    if (qrError) {
      console.error('Error adding qr_code field:', qrError);
      return NextResponse.json({ error: 'Failed to add qr_code field' }, { status: 500 });
    }

    // Add ip_address field if it doesn't exist
    const { error: ipError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'job_cards' AND column_name = 'ip_address'
            ) THEN
                ALTER TABLE job_cards ADD COLUMN ip_address VARCHAR(45);
                RAISE NOTICE 'Added ip_address column to job_cards table';
            ELSE
                RAISE NOTICE 'ip_address column already exists in job_cards table';
            END IF;
        END $$;
      `
    });

    if (ipError) {
      console.error('Error adding ip_address field:', ipError);
      return NextResponse.json({ error: 'Failed to add ip_address field' }, { status: 500 });
    }

    // Verify the fields were added
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'job_cards')
      .in('column_name', ['qr_code', 'ip_address'])
      .order('column_name');

    if (verifyError) {
      console.error('Error verifying fields:', verifyError);
      return NextResponse.json({ error: 'Failed to verify fields' }, { status: 500 });
    }

    console.log('QR code fields migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'QR code fields migration completed',
      fields: columns
    });

  } catch (error) {
    console.error('Error in QR code fields migration:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
