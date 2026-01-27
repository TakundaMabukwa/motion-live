import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('Fetching vehicles...');
    
    // Fetch all vehicles
    const { data: vehicles, error } = await getSupabase()
      .from('vehicles')
      .select('new_account_number, reg, fleet_number, total_rental_sub')
      .not('new_account_number', 'is', null)
      .order('new_account_number', { ascending: true });

    if (error) {
      console.error('DB Error:', error);
      throw error;
    }

    console.log(`Fetched ${vehicles?.length || 0} vehicles`);

    if (!vehicles || vehicles.length === 0) {
      console.log('No vehicles found');
      return NextResponse.json({ error: 'No vehicles found' }, { status: 404 });
    }

    // Group by account
    const grouped = vehicles.reduce((acc, v) => {
      const account = v.new_account_number;
      if (!acc[account]) acc[account] = [];
      acc[account].push(v);
      return acc;
    }, {});

    console.log(`Grouped into ${Object.keys(grouped).length} accounts`);

    // Generate Excel
    const data = [];
    data.push(['CLIENT ACCOUNT NO.', 'GROUP CODE', 'DESCRIPTION', 'QTY', 'PRICE EX.', 'PRICE INCL.', 'TOTAL INCL.']);

    for (const [account, vehicleList] of Object.entries(grouped)) {
      vehicleList.forEach(v => {
        const priceEx = parseFloat(v.total_rental_sub) || 0;
        const vat = priceEx * 0.15;
        const priceIncl = priceEx + vat;

        data.push([
          account,
          v.reg || v.fleet_number || '',
          'Monthly Subscription',
          1,
          priceEx.toFixed(2),
          priceIncl.toFixed(2),
          priceIncl.toFixed(2)
        ]);
      });
    }

    console.log(`Generated ${data.length - 1} rows`);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bulk Invoice');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Bulk_Invoice_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 });
  }
}
