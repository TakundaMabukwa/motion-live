import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting bulk invoice generation...');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all vehicles with pagination
    let allVehicles = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('company, reg, fleet_number, new_account_number, total_rental_sub')
        .not('new_account_number', 'is', null)
        .order('new_account_number', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      if (!vehicles || vehicles.length === 0) break;

      allVehicles = allVehicles.concat(vehicles);
      console.log(`Fetched page ${page + 1}: ${vehicles.length} vehicles (total: ${allVehicles.length})`);
      
      if (vehicles.length < pageSize) break;
      page++;
    }
    
    console.log(`Total fetched: ${allVehicles.length} vehicles`);

    // Remove duplicates - keep first occurrence of each reg
    const seenRegs = new Set();
    const uniqueVehicles = allVehicles.filter(v => {
      const reg = (v.reg || v.fleet_number || '').toUpperCase();
      if (!reg || seenRegs.has(reg)) return false;
      seenRegs.add(reg);
      return true;
    });
    
    console.log(`Unique vehicles: ${uniqueVehicles.length} (removed ${allVehicles.length - uniqueVehicles.length} duplicates)`);

    // Group by account
    const grouped = uniqueVehicles.reduce((acc, v) => {
      const account = v.new_account_number;
      if (!acc[account]) acc[account] = [];
      acc[account].push(v);
      return acc;
    }, {});

    // Generate Excel with account separators
    const data = [];
    data.push(['CLIENT', 'ACCOUNT NO.', 'GROUP', 'CODE', 'DESCRIPTION', 'QTY', 'PRICE EX.', 'PRICE INCL.', 'TOTAL INCL.']);

    let isFirst = true;
    for (const [account, vehicleList] of Object.entries(grouped)) {
      // Add spacing between accounts
      if (!isFirst) {
        data.push([]);
        data.push([]);
      }
      isFirst = false;
      
      // Add account header
      data.push([`ACCOUNT: ${account}`, '', '', '', '', '', '', '', '']);
      data.push([]);
      
      let accountTotal = 0;
      
      vehicleList.forEach(v => {
        const priceEx = parseFloat(v.total_rental_sub) || 0;
        const vat = priceEx * 0.15;
        const total = priceEx + vat;
        accountTotal += total;

        data.push([
          v.company || '',
          account,
          v.reg || v.fleet_number || '',
          '',
          'Monthly Subscription',
          1,
          priceEx.toFixed(2),
          vat.toFixed(2),
          total.toFixed(2)
        ]);
      });
      
      // Add account total
      data.push([]);
      data.push(['', '', '', '', '', '', '', 'TOTAL:', accountTotal.toFixed(2)]);
    }

    console.log(`Generated ${data.length - 1} rows`);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk Invoice');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Upload to storage
    const fileName = `bulk-invoice-${Date.now()}.xlsx`;
    const { error: uploadError } = await supabase.storage
      .from('excel-files')
      .upload(fileName, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('excel-files')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      fileName,
      downloadUrl: urlData.publicUrl,
      recordCount: uniqueVehicles.length
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 });
  }
}