#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function assignBranchCodes() {
  try {
    console.log('🏢 Grouping vehicles by first 4 characters...');
    
    // Get all vehicles with new_account_number
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, company, new_account_number')
      .not('new_account_number', 'is', null);
      
    if (error) {
      console.error('❌ Error fetching vehicles:', error.message);
      return;
    }
    
    console.log(`🚛 Found ${vehicles.length} vehicles with codes`);
    
    // Group vehicles by first 4 characters of company name
    const companyGroups = new Map();
    
    vehicles.forEach(vehicle => {
      const prefix = vehicle.company.substring(0, 4).toUpperCase();
      
      if (!companyGroups.has(prefix)) {
        companyGroups.set(prefix, {
          companies: new Set(),
          codes: new Set()
        });
      }
      
      companyGroups.get(prefix).companies.add(vehicle.company);
      companyGroups.get(prefix).codes.add(vehicle.new_account_number);
    });
    
    console.log(`📋 Found ${companyGroups.size} company groups`);
    
    // Process each group
    for (const [prefix, group] of companyGroups) {
      const allCodes = Array.from(group.codes).join(',');
      const companies = Array.from(group.companies);
      
      console.log(`\n🏢 ${prefix} Group:`);
      console.log(`   Companies: ${companies.join(', ')}`);
      console.log(`   Codes: ${allCodes}`);
      
      // Find matching customer record by trying different company names
      for (const companyName of companies) {
        const { data: customers, error: customerError } = await supabase
          .from('customers_grouped')
          .select('id, company_group')
          .eq('company_group', companyName);
          
        if (!customerError && customers.length > 0) {
          // Update with all codes for this group
          const { error: updateError } = await supabase
            .from('customers_grouped')
            .update({ all_new_account_numbers: allCodes })
            .eq('company_group', companyName);
            
          if (!updateError) {
            console.log(`   ✅ Updated ${companyName} with codes: ${allCodes}`);
            break; // Only update one customer record per group
          }
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  assignBranchCodes();
}