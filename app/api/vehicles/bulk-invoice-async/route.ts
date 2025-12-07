import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// In-memory job tracking
const jobs = new Map();

export async function POST() {
  try {
    const jobId = `bulk-invoice-${Date.now()}`;
    jobs.set(jobId, { status: 'processing', progress: 0 });
    
    // Start background job
    generateExcelInBackground(jobId);
    
    return NextResponse.json({ 
      jobId, 
      status: 'started',
      message: 'Excel generation started. Check status with job ID.' 
    });
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to start job' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  
  if (!jobId || !jobs.has(jobId)) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  
  const job = jobs.get(jobId);
  
  if (job.status === 'completed' && job.fileBuffer) {
    jobs.delete(jobId);
    return new NextResponse(job.fileBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Bulk_Invoice_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    });
  }
  
  return NextResponse.json({ 
    status: job.status, 
    progress: job.progress,
    message: job.message || 'Processing...'
  });
}

async function generateExcelInBackground(jobId: string) {
  try {
    const XLSX = await import('xlsx');
    
    jobs.set(jobId, { status: 'processing', progress: 20, message: 'Fetching data...' });
    
    const { data: vehicles } = await getSupabase()
      .from('vehicles')
      .select('reg, fleet_number, company, new_account_number, total_rental_sub')
      .not('new_account_number', 'is', null)
      .limit(5000);
    
    const groupedVehicles = vehicles?.reduce((acc, vehicle) => {
      const accountNumber = vehicle.new_account_number;
      if (!acc[accountNumber]) acc[accountNumber] = [];
      acc[accountNumber].push(vehicle);
      return acc;
    }, {}) || {};
    
    const { data: customers } = await getSupabase()
      .from('customers')
      .select('legal_name, company, new_account_number, account_number');
    
    const customerDetails = {};
    customers?.forEach(customer => {
      const key = customer.new_account_number || customer.account_number;
      customerDetails[key] = customer;
    });
    
    jobs.set(jobId, { status: 'processing', progress: 60, message: 'Generating Excel...' });
    
    const allInvoiceData = [
      ['Account', 'Company', 'Reg/Fleet No', 'Service Type', 'Amount Excl VAT', 'VAT', 'Amount Incl VAT']
    ];
    
    Object.entries(groupedVehicles).forEach(([accountNumber, vehicles]) => {
      const customer = customerDetails[accountNumber];
      const companyName = customer?.legal_name || customer?.company || 'Unknown Company';
      
      vehicles.forEach(vehicle => {
        const amount = parseFloat(vehicle.total_rental_sub) || 0;
        const vat = amount * 0.15;
        const total = amount + vat;
        
        allInvoiceData.push([
          accountNumber,
          companyName,
          vehicle.reg || vehicle.fleet_number || '',
          'Vehicle Service',
          amount.toFixed(2),
          vat.toFixed(2),
          total.toFixed(2)
        ]);
      });
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(allInvoiceData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bulk Invoice');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    jobs.set(jobId, { 
      status: 'completed', 
      progress: 100, 
      message: 'Ready for download',
      fileBuffer: buffer 
    });
    
  } catch (error) {
    jobs.set(jobId, { 
      status: 'failed', 
      progress: 0, 
      message: error.message 
    });
  }
}