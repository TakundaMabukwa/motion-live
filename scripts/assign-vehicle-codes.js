#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function assignVehicleCodes() {
  try {
    console.log('🚗 Assigning codes to all vehicles...');
    
    // Read the mapping file
    const mapping = JSON.parse(fs.readFileSync('account-code-mapping.json', 'utf8'));
    
    // Create company to code mapping
    const companyToCode = new Map();
    mapping.forEach(item => {
      companyToCode.set(item.company.toUpperCase(), item.new_code);
    });
    
    console.log(`📋 Loaded ${companyToCode.size} company mappings`);
    
    // Get total count first
    const { count } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .not('company', 'is', null);
    
    console.log(`🚛 Total vehicles in DB: ${count}`);
    
    // Fetch all vehicles in batches
    const vehicles = [];
    const batchSize = 1000;
    let offset = 0;
    
    while (offset < count) {
      const { data: batch, error } = await supabase
        .from('vehicles')
        .select('id, company')
        .not('company', 'is', null)
        .range(offset, offset + batchSize - 1);
        
      if (error) {
        console.error('❌ Error fetching vehicles:', error.message);
        return;
      }
      
      vehicles.push(...batch);
      offset += batchSize;
      console.log(`📥 Fetched ${vehicles.length}/${count} vehicles...`);
    }
      
    console.log(`🚛 Found ${vehicles.length} vehicles to process`);
    
    // Group vehicles by company code prefix (first 4 chars)
    const codeGroups = new Map();
    vehicles.forEach(vehicle => {
      const company = vehicle.company.trim();
      
      // Generate the 4-char prefix for this company
      const baseCode = company
        .replace(/\(PTY\)\s*LTD/gi, '')
        .replace(/\(PTY\)/gi, '')
        .replace(/\sLTD$/gi, '')
        .replace(/\sCC$/gi, '')
        .split(/\s+/)
        .filter(word => word.length > 2)
        .slice(0, 2)
        .map(word => word.substring(0, 2))
        .join('')
        .toUpperCase()
        .padEnd(4, 'X');
      
      if (!codeGroups.has(baseCode)) {
        codeGroups.set(baseCode, []);
      }
      codeGroups.get(baseCode).push(vehicle);
    });
    
    // Convert to company groups for display
    const companyGroups = new Map();
    codeGroups.forEach((vehicles, code) => {
      const companies = [...new Set(vehicles.map(v => v.company.trim()))];
      const groupName = companies.length === 1 ? companies[0] : `${code} Group (${companies.length} branches)`;
      companyGroups.set(groupName, vehicles);
    });
    
    console.log(`🏢 Found ${companyGroups.size} unique companies`);
    
    let updated = 0;
    const companyCodeAssignments = new Map();
    
    // Process each code group
    for (const [groupName, groupVehicles] of companyGroups) {
      const firstCompany = groupVehicles[0].company.trim();
      let assignedCode = null;
      
      // Check for exact match first
      const exactMatch = companyToCode.get(firstCompany.toUpperCase());
      if (exactMatch) {
        assignedCode = exactMatch;
      } else {
        // Check for partial matches
        for (const [mappedCompany, code] of companyToCode) {
          if (firstCompany.toUpperCase().includes(mappedCompany) || 
              mappedCompany.includes(firstCompany.toUpperCase())) {
            assignedCode = code;
            break;
          }
        }
      }
      
      // If still no match, generate new code
      if (!assignedCode) {
        const baseCode = firstCompany
          .replace(/\(PTY\)\s*LTD/gi, '')
          .replace(/\(PTY\)/gi, '')
          .replace(/\sLTD$/gi, '')
          .replace(/\sCC$/gi, '')
          .split(/\s+/)
          .filter(word => word.length > 2)
          .slice(0, 2)
          .map(word => word.substring(0, 2))
          .join('')
          .toUpperCase()
          .padEnd(4, 'X');
          
        assignedCode = `${baseCode}-0001`;
      }
      
      companyCodeAssignments.set(groupName, assignedCode);
      
      // Update all vehicles in this group with the same code
      for (const vehicle of groupVehicles) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ new_account_number: assignedCode })
          .eq('id', vehicle.id);
          
        if (updateError) {
          console.error(`❌ Error updating vehicle ${vehicle.id}:`, updateError.message);
        } else {
          updated++;
        }
      }
      
      console.log(`✅ ${groupName} → ${assignedCode} (${groupVehicles.length} vehicles)`);
    }
    
    console.log(`🎉 Successfully assigned codes to ${updated} vehicles`);
    
    // Show companies with multiple vehicles
    console.log('\n🚛 Companies with multiple vehicles:');
    companyGroups.forEach((vehicles, company) => {
      if (vehicles.length > 1) {
        const code = companyCodeAssignments.get(company);
        console.log(`  ${company}: ${vehicles.length} vehicles → ${code}`);
      }
    });
    
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  assignVehicleCodes();
}