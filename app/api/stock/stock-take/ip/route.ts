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
    const { stockItemId, ipAddresses } = body;

    if (!stockItemId || !ipAddresses || !Array.isArray(ipAddresses)) {
      return NextResponse.json({ error: 'Invalid data provided' }, { status: 400 });
    }

    // Update the stock item with the new IP addresses
    const { error: updateError } = await supabase
      .from('stock')
      .update({ ip_addresses: ipAddresses })
      .eq('id', stockItemId);

    if (updateError) {
      console.error('Error updating IP addresses:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the IP address assignment
    const { error: logError } = await supabase
      .from('stock_take_log')
      .insert({
        stock_item_id: stockItemId,
        previous_quantity: null, // Not applicable for IP address updates
        new_quantity: null, // Not applicable for IP address updates
        difference: 0, // Not applicable for IP address updates
        stock_take_date: new Date().toISOString(),
        notes: `IP addresses updated: ${ipAddresses.join(', ')}`,
        performed_by: user.id,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging IP address update:', logError);
      // Don't fail the entire operation for logging errors
    }

    return NextResponse.json({ 
      success: true,
      message: 'IP addresses updated successfully',
      ipAddresses
    });

  } catch (error) {
    console.error('Error in IP address update:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}