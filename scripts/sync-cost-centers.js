const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncCostCenters() {
  try {
    console.log('🔄 Starting cost centers sync...');

    // Get all unique new_account_numbers from vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('new_account_number, company')
      .not('new_account_number', 'is', null)
      .neq('new_account_number', '');

    if (vehiclesError) {
      throw vehiclesError;
    }

    console.log(`📊 Found ${vehicles.length} vehicle records`);

    // Get unique combinations
    const uniqueAccounts = vehicles.reduce((acc, vehicle) => {
      if (vehicle.new_account_number && !acc[vehicle.new_account_number]) {
        acc[vehicle.new_account_number] = vehicle.company || vehicle.new_account_number.split('-')[0];
      }
      return acc;
    }, {});

    console.log(`🔢 Found ${Object.keys(uniqueAccounts).length} unique account numbers`);

    // Get existing cost centers
    const { data: existingCostCenters, error: costCentersError } = await supabase
      .from('cost_centers')
      .select('cost_code');

    if (costCentersError) {
      throw costCentersError;
    }

    const existingCodes = new Set(existingCostCenters.map(cc => cc.cost_code));
    console.log(`📋 Found ${existingCodes.size} existing cost centers`);

    // Find missing cost centers
    const missingCostCenters = Object.entries(uniqueAccounts)
      .filter(([costCode]) => !existingCodes.has(costCode))
      .map(([costCode, company]) => ({
        cost_code: costCode,
        company: company,
        created_at: new Date().toISOString()
      }));

    if (missingCostCenters.length === 0) {
      console.log('✅ All cost centers are already synced!');
      return;
    }

    console.log(`➕ Inserting ${missingCostCenters.length} missing cost centers:`);
    missingCostCenters.forEach(cc => {
      console.log(`   - ${cc.cost_code} (${cc.company})`);
    });

    // Insert missing cost centers
    const { data: insertedData, error: insertError } = await supabase
      .from('cost_centers')
      .insert(missingCostCenters)
      .select('*');

    if (insertError) {
      throw insertError;
    }

    console.log(`✅ Successfully inserted ${insertedData.length} cost centers`);

    // Verify sync
    const { data: finalCount, error: countError } = await supabase
      .from('cost_centers')
      .select('cost_code', { count: 'exact' });

    if (countError) {
      throw countError;
    }

    console.log(`📊 Final cost centers count: ${finalCount.length}`);
    console.log('🎉 Cost centers sync completed successfully!');

  } catch (error) {
    console.error('❌ Error syncing cost centers:', error);
    process.exit(1);
  }
}

// Run the sync
syncCostCenters();