import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.time('Server Excel Generation');
    
    // Fetch data using existing logic
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/vehicles/bulk-invoice`);
    const data = await response.json();
    const { groupedVehicles, customerDetails } = data.data;
    
    // Generate Excel on server
    const allInvoiceData = [];
    let isFirstInvoice = true;
    
    for (const [accountNumber, vehicles] of Object.entries(groupedVehicles)) {
      const customer = customerDetails[accountNumber];
      const companyName = customer?.legal_name || customer?.company || customer?.trading_name || 'Unknown Company';
      
      if (!isFirstInvoice) {
        allInvoiceData.push([]);
        allInvoiceData.push(['', '', '', '', '', '', '', '', '', '']);
        allInvoiceData.push(['', '', '', '', '', '', '', '', '', '']);
      }
      isFirstInvoice = false;
      
      allInvoiceData.push([companyName]);
      allInvoiceData.push([]);
      allInvoiceData.push([`INVOICE - ${accountNumber}`]);
      allInvoiceData.push([`Account: ${accountNumber}`]);
      allInvoiceData.push([`Date: ${new Date().toLocaleDateString()}`]);
      allInvoiceData.push([]);
      
      allInvoiceData.push([
        'Reg/Fleet No', 'Fleet/Reg No', 'Service Type', 'Company', 'Account Number',
        'Units', 'Unit Price', 'Total Excl VAT', 'VAT Amount', 'Total Incl VAT'
      ]);
      
      let totalAmount = 0;
      
      vehicles.forEach((vehicle) => {
        const regFleetNo = vehicle.reg || vehicle.fleet_number || '';
        const totalRentalSub = parseFloat(vehicle.total_rental_sub) || 0;
        
        // Quick service type detection
        let serviceType = 'Skylink rental monthly fee';
        if (vehicle.skylink_pro_serial_number) serviceType = 'Skylink Pro';
        else if (vehicle._4ch_mdvr) serviceType = '4CH MDVR';
        else if (vehicle.pfk_main_unit) serviceType = 'PFK Main Unit';
        
        const totalExclVat = totalRentalSub;
        const vatAmount = totalExclVat * 0.15;
        const totalInclVat = totalExclVat + vatAmount;
        
        allInvoiceData.push([
          regFleetNo, regFleetNo, serviceType, vehicle.company || companyName,
          vehicle.account_number || '', 1, totalExclVat.toFixed(2),
          totalExclVat.toFixed(2), vatAmount.toFixed(2), totalInclVat.toFixed(2)
        ]);
        
        totalAmount += totalInclVat;
      });
      
      allInvoiceData.push([]);
      allInvoiceData.push(['', '', '', '', '', '', '', '', 'Total Amount:', totalAmount]);
    }
    
    // Create Excel file
    const worksheet = XLSX.utils.aoa_to_sheet(allInvoiceData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bulk Invoices');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    console.timeEnd('Server Excel Generation');
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Bulk_Invoice_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
    
  } catch (error) {
    console.error('Server Excel generation error:', error);
    return NextResponse.json({ error: 'Failed to generate Excel' }, { status: 500 });
  }
}