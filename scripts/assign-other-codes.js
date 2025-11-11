#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function assignOtherCodes() {
  try {
    console.log('🏢 Assigning codes to other companies...');
    
    // Read the mapping file
    const mapping = JSON.parse(fs.readFileSync('account-code-mapping.json', 'utf8'));
    
    // Filter out MACSTEEL (already handled)
    const otherMappings = mapping.filter(item => item.company !== 'MACSTEEL');
    
    console.log(`📋 Processing ${otherMappings.length} company mappings`);
    
    let vehiclesUpdated = 0;
    let customersUpdated = 0;
    
    for (const item of otherMappings) {
      const companyName = item.company;
      const newCode = item.new_code;
      
      // Update vehicles (exact match)
      const { data: vehicles, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('company', companyName);
        
      if (!vehicleError && vehicles.length > 0) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ new_account_number: newCode })
          .eq('company', companyName);
          
        if (!updateError) {
          vehiclesUpdated += vehicles.length;
          console.log(`✅ Vehicles: ${companyName} → ${newCode} (${vehicles.length} vehicles)`);
        }
      }
      
      // Update customers_grouped (exact match)
      const { data: customers, error: customerError } = await supabase
        .from('customers_grouped')
        .select('id, all_new_account_numbers')
        .eq('company_group', companyName);
        
      if (!customerError && customers.length > 0) {
        for (const customer of customers) {
          const currentCodes = customer.all_new_account_numbers || '';
          const newCodes = currentCodes ? `${currentCodes},${newCode}` : newCode;
          
          const { error: updateError } = await supabase
            .from('customers_grouped')
            .update({ all_new_account_numbers: newCodes })
            .eq('id', customer.id);
            
          if (!updateError) {
            customersUpdated++;
            console.log(`✅ Customer: ${companyName} → ${newCode}`);
          }
        }
      }
    }
    
    console.log(`🎉 Updated ${vehiclesUpdated} vehicles and ${customersUpdated} customer records`);
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  assignOtherCodes();
}