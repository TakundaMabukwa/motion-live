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

    // Fetch vehicles with proper grouping
    let allVehicles = []
    let from = 0
    const limit = 1000

    while (true) {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('reg, fleet_number, company, account_number, new_account_number, total_rental_sub, skylink_pro_serial_number, _4ch_mdvr, pfk_main_unit')
        .not('new_account_number', 'is', null)
        .order('new_account_number', { ascending: true })
        .range(from, from + limit - 1)

      if (error) throw error
      if (!vehicles || vehicles.length === 0) break

      allVehicles = [...allVehicles, ...vehicles]
      if (vehicles.length < limit) break
      from += limit
    }

    // Group by account
    const groupedVehicles = allVehicles.reduce((acc, vehicle) => {
      const accountNumber = vehicle.new_account_number
      if (!acc[accountNumber]) acc[accountNumber] = []
      acc[accountNumber].push(vehicle)
      return acc
    }, {})

    // Fetch customers
    const accountNumbers = Object.keys(groupedVehicles)
    const { data: customers } = await supabase
      .from('customers')
      .select('legal_name, company, trading_name, new_account_number, account_number')

    const customerDetails = {}
    customers?.forEach(customer => {
      const key = customer.new_account_number || customer.account_number
      if (key && accountNumbers.includes(key)) {
        customerDetails[key] = customer
      }
    })
    
    // Generate Excel with proper format
    const allInvoiceData = []
    let isFirstInvoice = true
    
    for (const [accountNumber, vehicles] of Object.entries(groupedVehicles)) {
      const customer = customerDetails[accountNumber]
      const companyName = customer?.legal_name || customer?.company || customer?.trading_name || 'Unknown Company'
      
      if (!isFirstInvoice) {
        allInvoiceData.push([])
        allInvoiceData.push(['', '', '', '', '', '', '', '', '', ''])
        allInvoiceData.push(['', '', '', '', '', '', '', '', '', ''])
      }
      isFirstInvoice = false
      
      allInvoiceData.push([companyName])
      allInvoiceData.push([])
      allInvoiceData.push([`INVOICE - ${accountNumber}`])
      allInvoiceData.push([`Account: ${accountNumber}`])
      allInvoiceData.push([`Date: ${new Date().toLocaleDateString()}`])
      allInvoiceData.push([])
      
      allInvoiceData.push([
        'Reg/Fleet No', 'Fleet/Reg No', 'Service Type', 'Company', 'Account Number',
        'Units', 'Unit Price', 'Total Excl VAT', 'VAT Amount', 'Total Incl VAT'
      ])
      
      let totalAmount = 0
      
      vehicles.forEach((vehicle) => {
        const regFleetNo = vehicle.reg || vehicle.fleet_number || ''
        const totalRentalSub = parseFloat(vehicle.total_rental_sub) || 0
        
        let serviceType = 'Skylink rental monthly fee'
        if (vehicle.skylink_pro_serial_number) serviceType = 'Skylink Pro'
        else if (vehicle._4ch_mdvr) serviceType = '4CH MDVR'
        else if (vehicle.pfk_main_unit) serviceType = 'PFK Main Unit'
        
        const totalExclVat = totalRentalSub
        const vatAmount = totalExclVat * 0.15
        const totalInclVat = totalExclVat + vatAmount
        
        allInvoiceData.push([
          regFleetNo, regFleetNo, serviceType, vehicle.company || companyName,
          vehicle.account_number || '', 1, totalExclVat.toFixed(2),
          totalExclVat.toFixed(2), vatAmount.toFixed(2), totalInclVat.toFixed(2)
        ])
        
        totalAmount += totalInclVat
      })
      
      allInvoiceData.push([])
      allInvoiceData.push(['', '', '', '', '', '', '', '', 'Total Amount:', totalAmount.toFixed(2)])
    }
    
    const ws = XLSX.utils.aoa_to_sheet(allInvoiceData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk Invoices')
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
      recordCount: allVehicles.length
    })

  } catch (error) {
    console.error('Bulk invoice DB error:', error)
    return NextResponse.json(
      { error: 'Failed to generate Excel file' },
      { status: 500 }
    )
  }
}