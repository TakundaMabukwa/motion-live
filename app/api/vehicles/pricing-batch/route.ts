import { createClient } from '@/lib/supabase/server';
import { setVehicleUserContext } from '@/lib/supabase/set-context';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const { costCode, field, value } = await request.json();

    if (!costCode || !field) {
      return NextResponse.json(
        { error: 'costCode and field are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await setVehicleUserContext(supabase);

    const { data, error } = await supabase
      .from('vehicles_duplicate')
      .update({ [field]: value })
      .eq('new_account_number', costCode)
      .select('id, reg, fleet_number');

    if (error) {
      console.error('Error batch updating pricing:', error);
      return NextResponse.json(
        { error: 'Failed to update pricing', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
      field,
      value,
    });
  } catch (error) {
    console.error('Error in batch pricing update:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Failed to update pricing', details: errMsg },
      { status: 500 }
    );
  }
}
