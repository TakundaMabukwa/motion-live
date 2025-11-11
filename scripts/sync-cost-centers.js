#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function syncCostCenters() {
  try {
    console.log('🏢 Syncing cost centers from vehicles...');
    
    // Get unique account numbers and companies from vehicles
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('company, new_account_number')
      .not('new_account_number', 'is', null)
      .not('company', 'is', null);
      
    if (error) {
      console.error('❌ Error fetching vehicles:', error.message);
      return;
    }
    
    console.log(`🚛 Found ${vehicles.length} vehicles with account numbers`);
    
    // Create unique combinations of company and account number
    const uniqueCombinations = new Map();
    
    vehicles.forEach(vehicle => {
      const key = `${vehicle.company}|${vehicle.new_account_number}`;
      if (!uniqueCombinations.has(key)) {
        uniqueCombinations.set(key, {
          company: vehicle.company,
          cost_code: vehicle.new_account_number
        });
      }
    });
    
    console.log(`📋 Found ${uniqueCombinations.size} unique company-code combinations`);
    
    // Clear existing cost centers
    const { error: deleteError } = await supabase
      .from('cost_centers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
    if (deleteError) {
      console.error('❌ Error clearing cost centers:', deleteError.message);
      return;
    }
    
    console.log('🗑️ Cleared existing cost centers');
    
    // Insert new cost centers
    const costCentersToInsert = Array.from(uniqueCombinations.values());
    
    const { error: insertError } = await supabase
      .from('cost_centers')
      .insert(costCentersToInsert);
      
    if (insertError) {
      console.error('❌ Error inserting cost centers:', insertError.message);
      return;
    }
    
    console.log(`✅ Inserted ${costCentersToInsert.length} cost centers`);
    
    // Show sample of inserted data
    console.log('\n📋 Sample cost centers:');
    costCentersToInsert.slice(0, 10).forEach(center => {
      console.log(`   ${center.company} → ${center.cost_code}`);
    });
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  syncCostCenters();
}