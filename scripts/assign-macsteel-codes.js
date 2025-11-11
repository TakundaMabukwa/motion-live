#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// MACSTEEL company mappings
const macsteelMappings = {
  'HARVEY ROOFING PRODUCTS': 'MACS-0001',
  'ROOFING GAUTENG': 'MACS-0002',
  'MACSTEEL COIL PROCESSING': 'MACS-0003',
  'MACSTEEL EXPORTS': 'MACS-0004',
  'MACSTEEL EXPRESS ISANDO': 'MACS-0005',
  'MACSTEEL EXPRESS KLERKSDORP': 'MACS-0006',
  'MACSTEEL EXPRESS NELSPRUIT (PTY) LTD': 'MACS-0007',
  'MACSTEEL EXPRESS PRETORIA': 'MACS-0008',
  'MACSTEEL EXPRESS VEREENIGING': 'MACS-0009',
  'MACSTEEL EXPRESS WELKOM (PTY) LTD': 'MACS-0010',
  'MACSTEEL EXPRESS WEST RAND': 'MACS-0011',
  'MACSTEEL FLUID CONTROL - CT': 'MACS-0012',
  'MACSTEEL FLUID CONTROL - DURBAN': 'MACS-0013',
  'MACSTEEL FLUID CONTROL - JHB': 'MACS-0014',
  'MACSTEEL FLUID CONTROL - RICHARDSBAY - DIV OF MSCSA (PTY) LTD': 'MACS-0015',
  'MACSTEEL FLUID CONTROL - SECUNDA': 'MACS-0016',
  'MACSTEEL FLUID CONTROL -CT': 'MACS-0017',
  'MACSTEEL SERVICE CENTRE': 'MACS-0018',
  'MACSTEEL SPECIAL STEELS': 'MACS-0019',
  'MACSTEEL SPECIAL STEELS - KZN': 'MACS-0020',
  'VRN DURBAN': 'MACS-0021',
  'MACSTEEL SPECIAL STEELS BRIGHT BAR': 'MACS-0022',
  'MACSTEEL TRADING BLOEMFONTEIN': 'MACS-0023',
  'MACSTEEL TRADING CAPE TOWN': 'MACS-0024',
  'MACSTEEL TRADING DURBAN  - DIV OF MSCSA (PTY) LTD': 'MACS-0025',
  'MACSTEEL TRADING GERMISTON': 'MACS-0026',
  'MACSTEEL TUBE & PIPE PTY LTD': 'MACS-0027',
  'MACSTEEL TRADING HEAD OFFICE': 'MACS-0028',
  'MACSTEEL TRADING PHALABORWA': 'MACS-0029',
  'MACSTEEL TRADING PORT ELIZABETH': 'MACS-0030',
  'VRN GAUTENG': 'MACS-0031',
  'VRN KATHU': 'MACS-0032',
  'VRN KLERKSDORP': 'MACS-0033',
  'VRN PORT ELIZABETH': 'MACS-0034',
  'VRN RUSTENBURG': 'MACS-0035',
  'VRN SPRINGBOK': 'MACS-0036',
  'VRN STEEL - C.T. (PTY) LTD': 'MACS-0037',
  'VRN WITBANK': 'MACS-0038'
};

async function assignMacsteelCodes() {
  try {
    console.log('🏭 Assigning MACSTEEL codes...');
    
    let updated = 0;
    
    // Process vehicles table
    for (const [companyName, code] of Object.entries(macsteelMappings)) {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id')
        .ilike('company', companyName);
        
      if (error) {
        console.error(`❌ Error fetching vehicles for ${companyName}:`, error.message);
        continue;
      }
      
      if (vehicles.length > 0) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ new_account_number: code })
          .ilike('company', companyName);
          
        if (updateError) {
          console.error(`❌ Error updating vehicles for ${companyName}:`, updateError.message);
        } else {
          updated += vehicles.length;
          console.log(`✅ ${companyName} → ${code} (${vehicles.length} vehicles)`);
        }
      }
    }
    
    // Update MACSTEEL customer record with all codes
    const allMacsteelCodes = Object.values(macsteelMappings).join(',');
    
    const { error: updateError } = await supabase
      .from('customers_grouped')
      .update({ all_new_account_numbers: allMacsteelCodes })
      .eq('company_group', 'MACSTEEL');
      
    if (updateError) {
      console.error(`❌ Error updating MACSTEEL customer:`, updateError.message);
    } else {
      console.log(`✅ Updated MACSTEEL customer with all codes: ${allMacsteelCodes}`);
    }
    
    console.log(`🎉 Successfully updated ${updated} vehicle records`);
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  assignMacsteelCodes();
}