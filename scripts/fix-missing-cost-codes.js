const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function generateCostCode(company) {
  if (!company) return null;
  
  // Remove spaces and take first 4 chars, uppercase
  const prefix = company.replace(/\s+/g, '').substring(0, 4).toUpperCase();
  return prefix;
}

async function fixMissingCostCodes() {
  try {
    console.log('🔄 Finding vehicles with missing cost codes...');

    // Get vehicles with empty/null new_account_number
    const { data: vehiclesWithoutCodes, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, company, new_account_number')
      .or('new_account_number.is.null,new_account_number.eq.')
      .not('company', 'is', null)
      .neq('company', '');

    if (vehiclesError) throw vehiclesError;

    console.log(`📊 Found ${vehiclesWithoutCodes.length} vehicles without cost codes`);

    if (vehiclesWithoutCodes.length === 0) {
      console.log('✅ All vehicles already have cost codes!');
      return;
    }

    // Get existing cost codes to find next available number
    const { data: existingCostCenters, error: costError } = await supabase
      .from('cost_centers')
      .select('cost_code');

    if (costError) throw costError;

    const existingCodes = new Set(existingCostCenters.map(cc => cc.cost_code));

    // Group vehicles by company prefix and assign codes
    const companyGroups = {};
    const updates = [];
    const newCostCenters = [];

    vehiclesWithoutCodes.forEach(vehicle => {
      const prefix = generateCostCode(vehicle.company);
      if (!prefix) return;

      if (!companyGroups[prefix]) {
        companyGroups[prefix] = {
          company: vehicle.company,
          count: 0,
          vehicles: []
        };
      }
      companyGroups[prefix].vehicles.push(vehicle);
    });

    // Assign cost codes for each company group
    for (const [prefix, group] of Object.entries(companyGroups)) {
      let counter = 1;
      
      for (const vehicle of group.vehicles) {
        let costCode;
        
        // Find next available number for this prefix
        do {
          costCode = `${prefix}-${counter.toString().padStart(4, '0')}`;
          counter++;
        } while (existingCodes.has(costCode));
        
        existingCodes.add(costCode);
        
        updates.push({
          id: vehicle.id,
          new_account_number: costCode
        });
        
        newCostCenters.push({
          cost_code: costCode,
          company: vehicle.company
        });
        
        console.log(`   ${vehicle.company} → ${costCode}`);
      }
    }

    console.log(`➕ Updating ${updates.length} vehicles with new cost codes...`);

    // Update vehicles in batches
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ new_account_number: update.new_account_number })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`❌ Failed to update vehicle ${update.id}:`, updateError);
      }
    }

    console.log(`➕ Adding ${newCostCenters.length} new cost centers...`);

    // Insert new cost centers
    const { error: insertError } = await supabase
      .from('cost_centers')
      .insert(newCostCenters);

    if (insertError) {
      console.error('❌ Failed to insert cost centers:', insertError);
    } else {
      console.log('✅ Successfully updated vehicles and added cost centers!');
    }

    // Show summary
    console.log('\n📊 Summary:');
    Object.entries(companyGroups).forEach(([prefix, group]) => {
      console.log(`   ${prefix}: ${group.vehicles.length} vehicles (${group.company})`);
    });

  } catch (error) {
    console.error('❌ Error fixing missing cost codes:', error);
  }
}

fixMissingCostCodes();