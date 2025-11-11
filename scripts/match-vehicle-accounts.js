#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function matchVehicleAccounts() {
  try {
    console.log('📖 Reading customers.json...');
    const customersData = JSON.parse(fs.readFileSync('customers.json', 'utf8'));
    
    console.log(`📊 Found ${customersData.length} customer records`);

    // Create mapping from all_new_account_numbers to company info
    const accountMapping = new Map();
    
    customersData.forEach(customer => {
      if (customer.all_new_account_numbers) {
        // Handle multiple account numbers separated by commas
        const accountNumbers = customer.all_new_account_numbers.split(',').map(acc => acc.trim());
        
        accountNumbers.forEach(accountNumber => {
          // Extract branch number from account (e.g., SPAR-0001 -> Branch 1)
          const branchMatch = accountNumber.match(/-0*(\d+)$/);
          const branchNumber = branchMatch ? parseInt(branchMatch[1]) : 1;
          const branchSuffix = branchNumber > 1 ? ` - Branch ${branchNumber}` : '';
          
          accountMapping.set(accountNumber, {
            company_group: customer.company_group + branchSuffix,
            legal_names: customer.legal_names,
            all_account_numbers: customer.all_account_numbers,
            cost_code: customer.cost_code,
            branch_number: branchNumber
          });
        });
      }
    });

    console.log(`🗺️ Created mapping for ${accountMapping.size} account numbers`);

    // Get all vehicles with company names
    console.log('🚗 Fetching vehicles from database...');
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select('id, company, new_account_number')
      .not('company', 'is', null);

    if (error) {
      console.error('❌ Error fetching vehicles:', error.message);
      return;
    }

    console.log(`📋 Found ${vehicles.length} vehicles with company names`);

    let matched = 0;
    let unmatched = 0;
    const updates = [];

    // Create reverse mapping: company_group -> account numbers
    const companyToAccounts = new Map();
    customersData.forEach(customer => {
      if (customer.all_new_account_numbers) {
        const accountNumbers = customer.all_new_account_numbers.split(',').map(acc => acc.trim());
        companyToAccounts.set(customer.company_group, accountNumbers);
      }
    });

    // Process each vehicle
    for (const vehicle of vehicles) {
      const accountNumbers = companyToAccounts.get(vehicle.company);
      
      if (accountNumbers && accountNumbers.length > 0) {
        // Use first account number if vehicle doesn't have one
        const accountToAssign = vehicle.new_account_number || accountNumbers[0];
        
        updates.push({
          id: vehicle.id,
          new_account_number: accountToAssign,
          company: vehicle.company
        });
        matched++;
      } else {
        console.log(`⚠️ No account found for company: ${vehicle.company}`);
        unmatched++;
      }
    }

    console.log(`✅ Matched: ${matched}, ❌ Unmatched: ${unmatched}`);

    if (updates.length === 0) {
      console.log('🤷 No updates to perform');
      return;
    }

    // Update vehicles in batches
    const batchSize = 50;
    let updated = 0;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const batchNum = Math.floor(i/batchSize) + 1;
      
      console.log(`📤 Updating batch ${batchNum}/${Math.ceil(updates.length/batchSize)}...`);
      
      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ new_account_number: update.new_account_number })
          .eq('id', update.id);

        if (updateError) {
          console.error(`❌ Error updating vehicle ${update.id}:`, updateError.message);
        } else {
          updated++;
        }
      }
    }

    console.log(`🎉 Successfully updated ${updated} vehicles with account numbers`);

    // Show sample matches
    console.log('\n📝 Sample matches:');
    updates.slice(0, 10).forEach(update => {
      console.log(`  ${update.company} → ${update.new_account_number}`);
    });
    
    // Show company breakdown
    const companyCounts = new Map();
    updates.forEach(update => {
      companyCounts.set(update.company, (companyCounts.get(update.company) || 0) + 1);
    });
    
    console.log('\n🏢 Companies updated:');
    companyCounts.forEach((count, company) => {
      console.log(`  ${company}: ${count} vehicles`);
    });

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  matchVehicleAccounts();
}