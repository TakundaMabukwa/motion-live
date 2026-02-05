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
      .select('new_account_number, reg, fleet_number, total_rental_sub, total_rental, total_sub')
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
    data.push(['ITEM CODE', 'CLIENT ACCOUNT NO.', 'GROUP CODE', 'DESCRIPTION', 'QTY', 'PRICE EX.', 'PRICE INCL.', 'TOTAL INCL.']);

    for (const [account, vehicleList] of Object.entries(grouped)) {
      vehicleList.forEach(v => {
        const totalRentalSub = parseFloat(v.total_rental_sub) || 0;
        const totalRental = parseFloat(v.total_rental) || 0;
        const totalSub = parseFloat(v.total_sub) || 0;
        
        let itemCode = 'TOTAL RENTAL SUB';
        let priceEx = totalRentalSub;
        
        // If total_rental_sub is 0 or missing (DEFAULT case), check breakdown
        if (totalRentalSub === 0) {
          if (totalRental > 0 && totalSub === 0) {
            itemCode = 'TOTAL RENTAL';
            priceEx = totalRental;
          } else if (totalSub > 0 && totalRental === 0) {
            itemCode = 'TOTAL SUB';
            priceEx = totalSub;
          } else if (totalRental > 0 && totalSub > 0) {
            itemCode = 'TOTAL RENTAL & SUB';
            priceEx = totalRental + totalSub;
          }
        }
        
        const vat = priceEx * 0.15;
        const priceIncl = priceEx + vat;

        data.push([
          itemCode,
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
