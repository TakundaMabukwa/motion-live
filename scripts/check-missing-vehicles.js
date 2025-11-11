#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMissingVehicles() {
  try {
    console.log('🔍 Checking for missing vehicle updates...');
    
    // Read the mapping file
    const mapping = JSON.parse(fs.readFileSync('account-code-mapping.json', 'utf8'));
    const otherMappings = mapping.filter(item => item.company !== 'MACSTEEL');
    
    console.log(`📋 Checking ${otherMappings.length} companies`);
    
    for (const item of otherMappings) {
      const companyName = item.company;
      const newCode = item.new_code;
      
      // Check vehicles with case-insensitive matching
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, company')
        .ilike('company', companyName);
        
      if (!error && vehicles.length > 0) {
        console.log(`🚛 ${companyName}: ${vehicles.length} vehicles found`);
        
        // Show first few vehicle company names to check exact matching
        vehicles.slice(0, 3).forEach(v => {
          console.log(`   - "${v.company}"`);
        });
      }
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  checkMissingVehicles();
}