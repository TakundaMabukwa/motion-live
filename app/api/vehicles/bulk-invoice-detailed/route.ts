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

    // First run the populate function to ensure payments are up to date
    const { data: functionResult, error: functionError } = await supabase
      .rpc('populate_payments_from_vehicles')

    if (functionError) {
      console.error('Function error:', functionError)
      // Continue anyway, might have existing data
    }

    // Fetch vehicles with ALL individual columns for detailed breakdown
    let allVehicles = []
    let from = 0
    const limit = 1000

    while (true) {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select(`
          id, reg, fleet_number, company, account_number, new_account_number,
          skylink_trailer_unit_rental, skylink_voice_kit_rental, skylink_pro_rental,
          sky_on_batt_ign_rental, sky_scout_12v_rental, sky_scout_24v_rental, sky_idata_rental, sky_ican_rental,
          beame_1_rental, beame_2_rental, beame_3_rental, beame_4_rental, beame_5_rental,
          _4ch_mdvr_rental, _5ch_mdvr_rental, _8ch_mdvr_rental, a2_dash_cam_rental, a3_dash_cam_ai_rental,
          pfk_main_unit_rental, breathaloc_rental, pfk_road_facing_rental, pfk_driver_facing_rental,
          consultancy, roaming, maintenance, after_hours, controlroom,
          skylink_trailer_sub, skylink_voice_kit_sub, skylink_pro_sub,
          sky_on_batt_sub, sky_scout_12v_sub, sky_scout_24v_sub,
          beame_1_sub, beame_2_sub, beame_3_sub, beame_4_sub, beame_5_sub,
          _4ch_mdvr_sub, _5ch_mdvr_sub, _8ch_mdvr_sub, a2_dash_cam_sub, pfk_main_unit_sub,
          industrial_panic_rental, flat_panic_rental, buzzer_rental, tag_rental, tag_reader_rental,
          keypad_rental, early_warning_rental, cia_rental, fm_unit_rental, gps_rental, gsm_rental,
          vw400_dome_1_rental, vw400_dome_2_rental, vw300_dakkie_dome_1_rental, vw300_dakkie_dome_2_rental,
          sd_card_1tb_rental, sd_card_2tb_rental, sd_card_480gb_rental, sd_card_256gb_rental,
          mic_rental, speaker_rental, roller_door_switches_rental
        `)
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
    
    // Generate Excel with ALL columns breakdown
    const allInvoiceData = []
    let isFirstInvoice = true
    
    for (const [accountNumber, vehicles] of Object.entries(groupedVehicles)) {
      const customer = customerDetails[accountNumber]
      const companyName = customer?.legal_name || customer?.company || customer?.trading_name || ''
      
      if (!isFirstInvoice) {
        allInvoiceData.push([])
        allInvoiceData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''])
      }
      isFirstInvoice = false
      
      allInvoiceData.push([companyName])
      allInvoiceData.push([])
      allInvoiceData.push([`INVOICE - ${accountNumber}`])
      allInvoiceData.push([`Account: ${accountNumber}`])
      allInvoiceData.push([`Date: ${new Date().toLocaleDateString()}`])
      allInvoiceData.push([])
      
      // Enhanced header with all categories
      allInvoiceData.push([
        'Reg/Fleet No', 'Company', 'Account Number',
        'Skylink Products', 'Sky Products', 'Beame Products', 'Camera/DVR', 'PFK Products',
        'Roaming', 'Other Services', 'Total Excl VAT', 'VAT Amount', 'Total Incl VAT'
      ])
      
      let totalAmount = 0
      
      vehicles.forEach((vehicle) => {
        const regFleetNo = vehicle.reg || vehicle.fleet_number || ''
        
        // Calculate category totals
        const skylinkTotal = 
          (parseFloat(vehicle.skylink_trailer_unit_rental) || 0) +
          (parseFloat(vehicle.skylink_voice_kit_rental) || 0) +
          (parseFloat(vehicle.skylink_pro_rental) || 0) +
          (parseFloat(vehicle.skylink_trailer_sub) || 0) +
          (parseFloat(vehicle.skylink_voice_kit_sub) || 0) +
          (parseFloat(vehicle.skylink_pro_sub) || 0)
        
        const skyTotal = 
          (parseFloat(vehicle.sky_on_batt_ign_rental) || 0) +
          (parseFloat(vehicle.sky_scout_12v_rental) || 0) +
          (parseFloat(vehicle.sky_scout_24v_rental) || 0) +
          (parseFloat(vehicle.sky_idata_rental) || 0) +
          (parseFloat(vehicle.sky_ican_rental) || 0) +
          (parseFloat(vehicle.sky_on_batt_sub) || 0) +
          (parseFloat(vehicle.sky_scout_12v_sub) || 0) +
          (parseFloat(vehicle.sky_scout_24v_sub) || 0)
        
        const beameTotal = 
          (parseFloat(vehicle.beame_1_rental) || 0) +
          (parseFloat(vehicle.beame_2_rental) || 0) +
          (parseFloat(vehicle.beame_3_rental) || 0) +
          (parseFloat(vehicle.beame_4_rental) || 0) +
          (parseFloat(vehicle.beame_5_rental) || 0) +
          (parseFloat(vehicle.beame_1_sub) || 0) +
          (parseFloat(vehicle.beame_2_sub) || 0) +
          (parseFloat(vehicle.beame_3_sub) || 0) +
          (parseFloat(vehicle.beame_4_sub) || 0) +
          (parseFloat(vehicle.beame_5_sub) || 0)
        
        const cameraTotal = 
          (parseFloat(vehicle._4ch_mdvr_rental) || 0) +
          (parseFloat(vehicle._5ch_mdvr_rental) || 0) +
          (parseFloat(vehicle._8ch_mdvr_rental) || 0) +
          (parseFloat(vehicle.a2_dash_cam_rental) || 0) +
          (parseFloat(vehicle.a3_dash_cam_ai_rental) || 0) +
          (parseFloat(vehicle._4ch_mdvr_sub) || 0) +
          (parseFloat(vehicle._5ch_mdvr_sub) || 0) +
          (parseFloat(vehicle._8ch_mdvr_sub) || 0) +
          (parseFloat(vehicle.a2_dash_cam_sub) || 0) +
          (parseFloat(vehicle.vw400_dome_1_rental) || 0) +
          (parseFloat(vehicle.vw400_dome_2_rental) || 0)
        
        const pfkTotal = 
          (parseFloat(vehicle.pfk_main_unit_rental) || 0) +
          (parseFloat(vehicle.breathaloc_rental) || 0) +
          (parseFloat(vehicle.pfk_road_facing_rental) || 0) +
          (parseFloat(vehicle.pfk_driver_facing_rental) || 0) +
          (parseFloat(vehicle.pfk_main_unit_sub) || 0)
        
        const roamingTotal = parseFloat(vehicle.roaming) || 0
        
        const servicesTotal = 
          (parseFloat(vehicle.consultancy) || 0) +
          (parseFloat(vehicle.maintenance) || 0) +
          (parseFloat(vehicle.after_hours) || 0) +
          (parseFloat(vehicle.controlroom) || 0) +
          (parseFloat(vehicle.industrial_panic_rental) || 0) +
          (parseFloat(vehicle.flat_panic_rental) || 0) +
          (parseFloat(vehicle.buzzer_rental) || 0) +
          (parseFloat(vehicle.tag_rental) || 0) +
          (parseFloat(vehicle.keypad_rental) || 0) +
          (parseFloat(vehicle.mic_rental) || 0) +
          (parseFloat(vehicle.speaker_rental) || 0)
        
        const totalExclVat = skylinkTotal + skyTotal + beameTotal + cameraTotal + pfkTotal + roamingTotal + servicesTotal
        const vatAmount = totalExclVat * 0.15
        const totalInclVat = totalExclVat + vatAmount
        
        if (totalExclVat > 0) {
          allInvoiceData.push([
            regFleetNo,
            vehicle.company || companyName,
            vehicle.account_number || '',
            skylinkTotal.toFixed(2),
            skyTotal.toFixed(2),
            beameTotal.toFixed(2),
            cameraTotal.toFixed(2),
            pfkTotal.toFixed(2),
            roamingTotal.toFixed(2),
            servicesTotal.toFixed(2),
            totalExclVat.toFixed(2),
            vatAmount.toFixed(2),
            totalInclVat.toFixed(2)
          ])
          
          totalAmount += totalInclVat
        }
      })
      
      allInvoiceData.push([])
      allInvoiceData.push(['', '', '', '', '', '', '', '', '', '', '', 'Total Amount:', totalAmount.toFixed(2)])
    }
    
    const ws = XLSX.utils.aoa_to_sheet(allInvoiceData)
    
    // Set column widths for better formatting
    ws['!cols'] = [
      { wch: 15 }, // Reg/Fleet
      { wch: 20 }, // Company
      { wch: 15 }, // Account
      { wch: 12 }, // Skylink
      { wch: 12 }, // Sky
      { wch: 12 }, // Beame
      { wch: 12 }, // Camera
      { wch: 12 }, // PFK
      { wch: 10 }, // Roaming
      { wch: 15 }, // Services
      { wch: 12 }, // Total Excl
      { wch: 12 }, // VAT
      { wch: 12 }  // Total Incl
    ]
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Detailed Bulk Invoices')
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Upload to storage
    const fileName = `detailed-bulk-invoice-${accountId}-${Date.now()}.xlsx`
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
      recordCount: allVehicles.length,
      functionResult: functionResult?.[0] || null
    })

  } catch (error) {
    console.error('Detailed bulk invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to generate detailed Excel file' },
      { status: 500 }
    )
  }
}