#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function linkCustomersVehicles() {
  try {
    console.log('🔗 Starting fresh customer-vehicle linking...');
    
    // Function to check if company belongs to MACSTEEL group
    function isMacsteelCompany(companyName) {
      const name = companyName.toUpperCase();
      return name.includes('MACSTEEL') || 
             name.startsWith('VRN ') || 
             name.includes('VRN ') ||
             name.includes('HARVEY ROOFING') ||
             name.includes('ROOFING GAUTENG');
    }
    
    // Get all unique companies from vehicles table
    console.log('📋 Fetching unique companies from vehicles...');
    const { data: vehicles, error: vehicleError } = await supabase
      .from('vehicles')
      .select('company')
      .not('company', 'is', null);

    if (vehicleError) {
      console.error('❌ Error fetching vehicles:', vehicleError.message);
      return;
    }

    const uniqueCompanies = [...new Set(vehicles.map(v => v.company))];
    console.log(`📊 Found ${uniqueCompanies.length} unique companies in vehicles`);

    // Clear existing customers_grouped table
    console.log('🗑️ Clearing existing customers_grouped...');
    const { error: deleteError } = await supabase
      .from('customers_grouped')
      .delete()
      .neq('id', 0); // Delete all records

    if (deleteError) {
      console.error('❌ Error clearing table:', deleteError.message);
    }

    // Separate MACSTEEL companies from others
    const macsteelFound = uniqueCompanies.filter(company => 
      isMacsteelCompany(company)
    );
    const otherCompanies = uniqueCompanies.filter(company => 
      !isMacsteelCompany(company)
    );
    
    console.log(`🏭 Found ${macsteelFound.length} MACSTEEL companies`);
    console.log(`🏢 Found ${otherCompanies.length} other companies`);
    
    // Group other companies by base name (detect branches)
    const companyGroups = new Map();
    
    otherCompanies.forEach(company => {
      // Extract base company name (remove branch indicators)
      const baseName = company
        .replace(/\s-\s(Branch|Br)\s\d+$/gi, '')
        .replace(/\s(Branch|Br)\s\d+$/gi, '')
        .replace(/\s\d+$/gi, '') // Remove trailing numbers
        .trim();
      
      if (!companyGroups.has(baseName)) {
        companyGroups.set(baseName, []);
      }
      companyGroups.get(baseName).push(company);
    });

    // Generate customer records with branch handling
    const newCustomers = [];
    
    // First, create MACSTEEL parent company if any MACSTEEL companies exist
    if (macsteelFound.length > 0) {
      newCustomers.push({
        company_group: 'MACSTEEL GROUP',
        legal_names: 'MACSTEEL GROUP',
        all_account_numbers: null,
        all_new_account_numbers: 'MACS-0001',
        cost_code: 'MACS-0001'
      });
    }
    
    let globalIndex = 2; // Start from 2 since MACS-0001 is taken
    
    companyGroups.forEach((branches, baseName) => {
      const baseCode = baseName
        .replace(/\(PTY\)\s*LTD/gi, '')
        .replace(/\(PTY\)/gi, '')
        .replace(/\sLTD$/gi, '')
        .replace(/\sCC$/gi, '')
        .replace(/\sLIMITED$/gi, '')
        .replace(/\s-\s.*$/gi, '')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 2)
        .map(word => word.substring(0, 2))
        .join('')
        .toUpperCase()
        .padEnd(4, 'X');

      if (branches.length === 1) {
        // Single company - no branch suffix
        const accountCode = `${baseCode}-${globalIndex.toString().padStart(4, '0')}`;
        newCustomers.push({
          company_group: baseName,
          legal_names: branches[0],
          all_account_numbers: null,
          all_new_account_numbers: accountCode,
          cost_code: accountCode
        });
        globalIndex++;
      } else {
        // Multiple branches - create parent + branches
        const parentCode = `${baseCode}-${globalIndex.toString().padStart(4, '0')}`;
        const branchCodes = [];
        
        branches.forEach((branch, branchIndex) => {
          const branchCode = `${baseCode}-${globalIndex.toString().padStart(4, '0')}-${(branchIndex + 1).toString().padStart(2, '0')}`;
          branchCodes.push(branchCode);
          
          newCustomers.push({
            company_group: baseName,
            legal_names: branch,
            all_account_numbers: null,
            all_new_account_numbers: branchCode,
            cost_code: branchCode
          });
        });
        
        globalIndex++;
      }
    });

    // Insert new customer records
    console.log('📤 Inserting new customer records...');
    const { data: insertedCustomers, error: insertError } = await supabase
      .from('customers_grouped')
      .insert(newCustomers)
      .select();

    if (insertError) {
      console.error('❌ Error inserting customers:', insertError.message);
      return;
    }

    console.log(`✅ Created ${insertedCustomers.length} customer records`);

    // Update vehicles with new account numbers using partial matching
    console.log('🔄 Updating vehicles with account numbers...');
    let updated = 0;

    // Get all vehicles for partial matching
    const { data: allVehicles, error: allVehiclesError } = await supabase
      .from('vehicles')
      .select('id, company')
      .not('company', 'is', null);

    if (allVehiclesError) {
      console.error('❌ Error fetching all vehicles:', allVehiclesError.message);
      return;
    }

    // Update MACSTEEL companies using partial matching
    for (const vehicle of allVehicles) {
      if (isMacsteelCompany(vehicle.company)) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ new_account_number: 'MACS-0001' })
          .eq('id', vehicle.id);

        if (updateError) {
          console.error(`❌ Error updating vehicle ${vehicle.id}:`, updateError.message);
        } else {
          updated++;
        }
      }
    }

    // Update other companies using partial matching
    for (const customer of insertedCustomers) {
      if (customer.company_group === 'MACSTEEL GROUP') continue; // Skip MACSTEEL parent
      
      // Find vehicles that contain the customer's legal name
      const matchingVehicles = allVehicles.filter(vehicle => 
        !isMacsteelCompany(vehicle.company) && 
        (vehicle.company.toUpperCase().includes(customer.legal_names.toUpperCase()) ||
         customer.legal_names.toUpperCase().includes(vehicle.company.toUpperCase()))
      );

      for (const vehicle of matchingVehicles) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ new_account_number: customer.all_new_account_numbers })
          .eq('id', vehicle.id);

        if (updateError) {
          console.error(`❌ Error updating vehicle ${vehicle.id}:`, updateError.message);
        } else {
          updated++;
        }
      }
    }

    const macsteelVehicleCount = allVehicles.filter(v => isMacsteelCompany(v.company)).length;
    console.log(`🎉 Successfully linked ${updated} vehicles (${macsteelVehicleCount} MACSTEEL + ${updated - macsteelVehicleCount} others)`);

    // Show MACSTEEL results
    if (macsteelFound.length > 0) {
      console.log('\n🏭 MACSTEEL companies → MACS-0001:');
      macsteelFound.slice(0, 5).forEach(company => {
        console.log(`  ${company} → MACS-0001`);
      });
      if (macsteelFound.length > 5) {
        console.log(`  ... and ${macsteelFound.length - 5} more MACSTEEL companies`);
      }
    }
    
    // Show sample results for other companies
    console.log('\n📝 Other company linkages:');
    insertedCustomers.filter(c => c.company_group !== 'MACSTEEL GROUP').slice(0, 10).forEach(customer => {
      console.log(`  ${customer.legal_names} → ${customer.all_new_account_numbers}`);
    });
    
    // Show branch summary
    const branchSummary = new Map();
    insertedCustomers.forEach(customer => {
      const count = branchSummary.get(customer.company_group) || 0;
      branchSummary.set(customer.company_group, count + 1);
    });
    
    console.log('\n🏢 Companies with branches:');
    branchSummary.forEach((count, company) => {
      if (count > 1) {
        console.log(`  ${company}: ${count} branches`);
      }
    });

    // Save results including MACSTEEL mapping
    const allResults = {
      macsteel_companies: macsteelFound.map(company => ({
        company_name: company,
        account_code: 'MACS-0001'
      })),
      other_companies: insertedCustomers
    };
    
    fs.writeFileSync('customer-vehicle-links.json', JSON.stringify(allResults, null, 2));
    console.log('💾 Saved results to customer-vehicle-links.json');

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  linkCustomersVehicles();
}