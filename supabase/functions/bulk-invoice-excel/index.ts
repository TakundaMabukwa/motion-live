import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { accountId } = await req.json()

    // Fetch vehicles data with pagination
    let allVehicles = []
    let from = 0
    const limit = 1000

    while (true) {
      const { data: vehicles, error } = await supabaseClient
        .from('vehicles')
        .select(`
          id, reg, fleet_number, account_number, cost_code, company,
          total_rental, total_sub, total_rental_sub,
          skylink_units, cameras, pdk_equipment, other_equipment,
          created_at
        `)
        .eq('account_number', accountId)
        .range(from, from + limit - 1)

      if (error) throw error
      if (!vehicles || vehicles.length === 0) break

      allVehicles = [...allVehicles, ...vehicles]
      if (vehicles.length < limit) break
      from += limit
    }

    // Generate Excel data
    const excelData = allVehicles.map(vehicle => {
      const vehicleId = vehicle.reg || vehicle.fleet_number || 'N/A'
      let serviceDescription = 'Vehicle Tracking Service'
      let amount = 0

      // Service item detection logic
      if (vehicle.skylink_units > 0) {
        serviceDescription = 'Skylink Units'
        amount = vehicle.skylink_units * 100
      } else if (vehicle.cameras > 0) {
        serviceDescription = 'Camera Systems'
        amount = vehicle.cameras * 150
      } else if (vehicle.pdk_equipment > 0) {
        serviceDescription = 'PDK Equipment'
        amount = vehicle.pdk_equipment * 120
      } else if (vehicle.other_equipment > 0) {
        serviceDescription = 'Other Equipment'
        amount = vehicle.other_equipment * 80
      } else if (vehicle.total_rental_sub > 0) {
        amount = vehicle.total_rental_sub
      } else if (vehicle.total_rental > 0) {
        amount = vehicle.total_rental
      }

      const vatAmount = amount * 0.15
      const totalAmount = amount + vatAmount

      return {
        'Vehicle ID': vehicleId,
        'Cost Code': vehicle.cost_code || '',
        'Company': vehicle.company || '',
        'Service Description': serviceDescription,
        'Amount (Excl VAT)': amount.toFixed(2),
        'VAT (15%)': vatAmount.toFixed(2),
        'Total Amount': totalAmount.toFixed(2),
        'Date': new Date().toISOString().split('T')[0]
      }
    })

    // Create Excel workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk Invoice')

    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

    // Upload to Supabase Storage
    const fileName = `bulk-invoice-${accountId}-${Date.now()}.xlsx`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('excel-files')
      .upload(fileName, excelBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('excel-files')
      .getPublicUrl(fileName)

    return new Response(
      JSON.stringify({
        success: true,
        fileName,
        downloadUrl: urlData.publicUrl,
        recordCount: allVehicles.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})