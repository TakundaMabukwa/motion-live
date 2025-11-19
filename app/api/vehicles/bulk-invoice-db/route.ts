import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Call database function
    const { data, error } = await supabase.rpc('generate_bulk_invoice_data', {
      account_id_param: accountId || 'all'
    })

    if (error) throw error

    // Generate Excel
    const excelData = data.map((row: any) => ({
      'Vehicle ID': row.vehicle_id,
      'Cost Code': row.cost_code,
      'Company': row.company,
      'Service Description': row.service_description,
      'Amount (Excl VAT)': parseFloat(row.amount_excl_vat).toFixed(2),
      'VAT (15%)': parseFloat(row.vat_amount).toFixed(2),
      'Total Amount': parseFloat(row.total_amount).toFixed(2),
      'Date': row.invoice_date
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk Invoice')
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Upload to storage
    const fileName = `bulk-invoice-${accountId}-${Date.now()}.xlsx`
    const { error: uploadError } = await supabase.storage
      .from('excel-files')
      .upload(fileName, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('excel-files')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      fileName,
      downloadUrl: urlData.publicUrl,
      recordCount: data.length
    })

  } catch (error) {
    console.error('Bulk invoice DB error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Excel file' },
      { status: 500 }
    )
  }
}