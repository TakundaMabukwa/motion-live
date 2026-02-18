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

    // Fetch all vehicles with pagination - recursive until all fetched
    let allVehicles = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('*')
        .not('new_account_number', 'is', null)
        .gte('created_at', '2026-01-01')
        .order('company', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      if (!vehicles || vehicles.length === 0) break;

      allVehicles = allVehicles.concat(vehicles);
      console.log(`Fetched page ${page + 1}: ${vehicles.length} vehicles (total: ${allVehicles.length})`);
      
      page++;
      if (vehicles.length < pageSize) break;
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

    // Group by company (client)
    const grouped = uniqueVehicles.reduce((acc, v) => {
      const client = v.company || 'Unknown';
      if (!acc[client]) acc[client] = [];
      acc[client].push(v);
      return acc;
    }, {});

    // Generate Excel
    const data = [];
    data.push(['CLIENT', 'GROUP', 'ITEM CODE', 'DESCRIPTION', 'QTY', 'PRICE EX.', 'VAT', 'TOTAL INCL.']);

    for (const [client, vehicleList] of Object.entries(grouped)) {
      console.log(`Processing client: ${client} with ${vehicleList.length} vehicles`);
      let clientLineCount = 0;
      
      vehicleList.forEach(v => {
        const vehicleId = v.reg || v.fleet_number || '';
        const lineItems = [];

        // Helper to get description
        const getDescription = (columnName) => {
          const lower = columnName.toLowerCase();
          
          // Beame equipment
          if (lower.includes('beame_1')) return lower.includes('_sub') ? 'Beame 1 - Subscription' : 'Beame 1 - Rental';
          if (lower.includes('beame_2')) return lower.includes('_sub') ? 'Beame 2 - Subscription' : 'Beame 2 - Rental';
          if (lower.includes('beame_3')) return lower.includes('_sub') ? 'Beame 3 - Subscription' : 'Beame 3 - Rental';
          if (lower.includes('beame_4')) return lower.includes('_sub') ? 'Beame 4 - Subscription' : 'Beame 4 - Rental';
          if (lower.includes('beame_5')) return lower.includes('_sub') ? 'Beame 5 - Subscription' : 'Beame 5 - Rental';
          if (lower.includes('beame')) return lower.includes('_sub') ? 'Beame - Subscription' : 'Beame - Rental';
          
          // Skylink equipment
          if (lower.includes('skylink_trailer')) return lower.includes('_sub') ? 'Skylink Trailer Unit - Subscription' : 'Skylink Trailer Unit - Rental';
          if (lower.includes('sky_on_batt')) return lower.includes('_sub') ? 'Sky On Battery/Ignition - Subscription' : 'Sky On Battery/Ignition - Rental';
          if (lower.includes('skylink_voice_kit')) return lower.includes('_sub') ? 'Skylink Voice Kit - Subscription' : 'Skylink Voice Kit - Rental';
          if (lower.includes('sky_scout_12v')) return lower.includes('_sub') ? 'Sky Scout 12V - Subscription' : 'Sky Scout 12V - Rental';
          if (lower.includes('sky_scout_24v')) return lower.includes('_sub') ? 'Sky Scout 24V - Subscription' : 'Sky Scout 24V - Rental';
          if (lower.includes('skylink_pro')) return lower.includes('_sub') ? 'Skylink Pro - Subscription' : 'Skylink Pro - Rental';
          
          // Camera equipment
          if (lower.includes('_4ch_mdvr')) return lower.includes('_sub') ? '4CH MDVR - Subscription' : '4CH MDVR - Rental';
          if (lower.includes('_5ch_mdvr')) return lower.includes('_sub') ? '5CH MDVR - Subscription' : '5CH MDVR - Rental';
          if (lower.includes('_8ch_mdvr')) return lower.includes('_sub') ? '8CH MDVR - Subscription' : '8CH MDVR - Rental';
          if (lower.includes('a2_dash_cam')) return lower.includes('_sub') ? 'A2 Dash Cam - Subscription' : 'A2 Dash Cam - Rental';
          if (lower.includes('a3_dash_cam')) return 'A3 Dash Cam AI - Rental';
          
          // Probe equipment
          if (lower.includes('single_probe')) return lower.includes('_sub') ? 'Single Probe - Subscription' : 'Single Probe - Rental';
          if (lower.includes('dual_probe')) return lower.includes('_sub') ? 'Dual Probe - Subscription' : 'Dual Probe - Rental';
          
          // PFK equipment
          if (lower.includes('pfk_main_unit')) return lower.includes('_sub') ? 'PFK Main Unit - Subscription' : 'PFK Main Unit - Rental';
          if (lower.includes('pfk')) return 'PFK Equipment - Rental';
          
          // FM Unit
          if (lower.includes('fm_unit')) return lower.includes('_sub') ? 'FM Unit - Subscription' : 'FM Unit - Rental';
          
          // Services
          if (lower === 'roaming') return 'Monthly Service - Roaming';
          if (lower === 'maintenance') return 'Monthly Service - Maintenance';
          if (lower === 'controlroom') return 'Monthly Service - Control Room';
          if (lower === 'after_hours') return 'Monthly Service - After Hours';
          if (lower === 'consultancy') return 'Monthly Service - Consultancy';
          if (lower === 'software') return 'Monthly Service - Software';
          if (lower === 'additional_data') return 'Monthly Service - Additional Data';
          
          // Totals
          if (lower === 'total_rental_sub') return 'Monthly Rental & Subscription';
          if (lower === 'total_sub') return 'Monthly Subscription Total';
          if (lower === 'total_rental') return 'Monthly Rental Total';
          
          // Default
          return lower.includes('_sub') ? 'Monthly Subscription' : 'Monthly Rental';
        };

        // Check all equipment columns
        Object.keys(v).forEach(key => {
          if (key.includes('_rental') || key.includes('_sub') || ['roaming', 'maintenance', 'after_hours', 'controlroom', 'consultancy', 'software', 'additional_data'].includes(key)) {
            const value = parseFloat(v[key]);
            if (value && value > 0 && !['total_rental', 'total_sub', 'total_rental_sub'].includes(key)) {
              lineItems.push({ column: key, amount: value, description: getDescription(key), code: key.toUpperCase().replace(/_/g, ' ') });
            }
          }
        });

        // If no specific equipment, use totals
        if (lineItems.length === 0) {
          const totalRentalSub = parseFloat(v.total_rental_sub);
          const totalSub = parseFloat(v.total_sub);
          const totalRental = parseFloat(v.total_rental);
          
          if (totalRentalSub && totalRentalSub > 0) {
            lineItems.push({ column: 'total_rental_sub', amount: totalRentalSub, description: 'Monthly Rental & Subscription', code: 'TOTAL RENTAL SUB' });
          } else if (totalSub && totalSub > 0) {
            lineItems.push({ column: 'total_sub', amount: totalSub, description: 'Monthly Subscription Total', code: 'TOTAL SUB' });
          } else if (totalRental && totalRental > 0) {
            lineItems.push({ column: 'total_rental', amount: totalRental, description: 'Monthly Rental Total', code: 'TOTAL RENTAL' });
          } else {
            lineItems.push({ column: 'default', amount: 0, description: 'Monthly Subscription', code: 'DEFAULT' });
          }
        }

        // Add line items to Excel
        lineItems.forEach(item => {
          const vat = item.amount * 0.15;
          const total = item.amount + vat;
          clientLineCount++;

          data.push([
            client,
            vehicleId,
            item.code,
            item.description,
            1,
            item.amount.toFixed(2),
            vat.toFixed(2),
            total.toFixed(2)
          ]);
        });
      });
      
      console.log(`Client ${client}: Generated ${clientLineCount} line items`);
    }

    console.log(`Generated ${data.length - 1} rows`);

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 30 }, // CLIENT
      { wch: 20 }, // GROUP
      { wch: 10 }, // CODE
      { wch: 35 }, // DESCRIPTION
      { wch: 8 },  // QTY
      { wch: 12 }, // PRICE EX.
      { wch: 12 }, // VAT
      { wch: 15 }  // TOTAL INCL.
    ];

    // Style header row
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "366092" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }

    // Format data rows with borders and number formatting
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[address]) continue;
        
        // Add borders
        ws[address].s = {
          border: {
            top: { style: "thin", color: { rgb: "CCCCCC" } },
            bottom: { style: "thin", color: { rgb: "CCCCCC" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } }
          }
        };
        
        // Format currency columns (PRICE EX., VAT, TOTAL INCL.)
        if (C >= 5 && C <= 7) {
          ws[address].z = '"R "#,##0.00';
          ws[address].s.alignment = { horizontal: "right" };
        }
        
        // Center align QTY
        if (C === 4) {
          ws[address].s.alignment = { horizontal: "center" };
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk Invoice');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });

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
