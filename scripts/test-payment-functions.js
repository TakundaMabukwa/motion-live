// Test payment sync functions
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key.trim()]) {
      process.env[key.trim()] = value;
    }
  }
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFunction(funcName, params = []) {
  try {
    console.log(`\n🧪 Testing: ${funcName}(${params.join(', ')})`);
    
    let result;
    if (params.length === 0) {
      result = await supabase.rpc(funcName);
    } else if (params.length === 1) {
      result = await supabase.rpc(funcName, { param1: params[0] });
    } else {
      // Try with named parameters
      const paramObj = {};
      params.forEach((param, idx) => {
        paramObj[`param${idx + 1}`] = param;
      });
      result = await supabase.rpc(funcName, paramObj);
    }
    
    if (result.error) {
      console.log(`   ❌ Error: ${result.error.message}`);
      return false;
    } else {
      console.log(`   ✅ Success!`);
      console.log(`   📊 Result:`, result.data);
      return true;
    }
  } catch (error) {
    console.log(`   💥 Exception: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('TESTING PAYMENT SYNC FUNCTIONS');
  console.log('========================================');

  const topFunctions = [
    'populate_payments_table',
    'sync_payments_from_vehicles', 
    'generate_payments_from_vehicles',
    'refresh_payments_data',
    'update_payments_from_vehicles'
  ];

  for (const funcName of topFunctions) {
    console.log(`\n🎯 Testing function: ${funcName}`);
    
    // Try without parameters
    let success = await testFunction(funcName);
    
    if (!success) {
      // Try with common parameter patterns
      const paramVariations = [
        [],
        [null],
        ['all'],
        [true],
        [false],
        ['2025-12-01'],
        ['ICON-0001']
      ];
      
      for (const params of paramVariations) {
        success = await testFunction(funcName, params);
        if (success) break;
      }
    }
    
    if (success) {
      console.log(`\n🎉 WORKING FUNCTION FOUND: ${funcName}`);
      break;
    }
  }

  console.log('\n========================================');
  console.log('CHECKING CURRENT PAYMENTS DATA');
  console.log('========================================');

  // Check current payments count
  const { count: paymentsCount } = await supabase
    .from('payments_')
    .select('*', { count: 'exact', head: true });

  console.log(`\nCurrent payments_ records: ${paymentsCount}`);

  // Check vehicles count  
  const { count: vehiclesCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true });

  console.log(`Current vehicles records: ${vehiclesCount}`);

  // Sample comparison
  const { data: sampleVehicle } = await supabase
    .from('vehicles')
    .select('new_account_number, total_rental_sub, company')
    .not('total_rental_sub', 'is', null)
    .limit(1)
    .single();

  if (sampleVehicle) {
    console.log(`\nSample vehicle data:`);
    console.log(`  Account: ${sampleVehicle.new_account_number}`);
    console.log(`  Company: ${sampleVehicle.company}`);
    console.log(`  Amount: ${sampleVehicle.total_rental_sub}`);

    // Check if this account exists in payments
    const { data: matchingPayment } = await supabase
      .from('payments_')
      .select('*')
      .eq('cost_code', sampleVehicle.new_account_number)
      .single();

    if (matchingPayment) {
      console.log(`  ✅ Found in payments_: ${matchingPayment.due_amount}`);
    } else {
      console.log(`  ❌ NOT found in payments_ table`);
    }
  }
}

main().catch(console.error);