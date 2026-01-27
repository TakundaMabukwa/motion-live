// Find database functions - simplified approach
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

async function main() {
  console.log('========================================');
  console.log('SEARCHING FOR PAYMENT SYNC FUNCTIONS');
  console.log('========================================\n');

  // Test known function names that might sync payments from vehicles
  const possibleFunctions = [
    'sync_payments_from_vehicles',
    'populate_payments_table',
    'update_payments_from_vehicles', 
    'refresh_payments_data',
    'calculate_payments',
    'sync_vehicle_payments',
    'populate_payments',
    'update_payment_data',
    'refresh_payment_table',
    'calculate_vehicle_payments',
    'sync_payments',
    'populate_payment_records',
    'update_payments_table',
    'generate_payments_from_vehicles',
    'create_payment_records'
  ];

  console.log('Testing possible function names...\n');

  const foundFunctions = [];

  for (const funcName of possibleFunctions) {
    try {
      // Try to call the function (this will fail if it doesn't exist)
      const { data, error } = await supabase.rpc(funcName);
      
      if (error) {
        if (error.message.includes('does not exist')) {
          // Function doesn't exist
          continue;
        } else {
          // Function exists but might need parameters or have other issues
          console.log(`✅ FOUND: ${funcName}`);
          console.log(`   Error (function exists): ${error.message}\n`);
          foundFunctions.push({ name: funcName, error: error.message });
        }
      } else {
        // Function exists and executed successfully
        console.log(`✅ FOUND & EXECUTED: ${funcName}`);
        console.log(`   Result:`, data);
        foundFunctions.push({ name: funcName, executed: true, result: data });
      }
    } catch (e) {
      // Skip
    }
  }

  console.log('\n========================================');
  console.log('CHECKING PAYMENTS TABLE STRUCTURE');
  console.log('========================================\n');

  // Check payments_ table structure to understand what fields need to be populated
  const { data: paymentsStructure, error: structError } = await supabase
    .from('payments_')
    .select('*')
    .limit(1);

  if (!structError && paymentsStructure) {
    console.log('payments_ table sample record:');
    console.log(JSON.stringify(paymentsStructure[0], null, 2));
  }

  console.log('\n========================================');
  console.log('CHECKING VEHICLES TABLE STRUCTURE');  
  console.log('========================================\n');

  // Check vehicles table structure
  const { data: vehiclesStructure, error: vehError } = await supabase
    .from('vehicles')
    .select('*')
    .limit(1);

  if (!vehError && vehiclesStructure) {
    console.log('vehicles table sample record:');
    console.log(JSON.stringify(vehiclesStructure[0], null, 2));
  }

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================\n');

  if (foundFunctions.length > 0) {
    console.log('🎯 FOUND FUNCTIONS:');
    foundFunctions.forEach(func => {
      console.log(`   - ${func.name}`);
    });
  } else {
    console.log('❌ No payment sync functions found with common names.');
    console.log('💡 You may need to create a function to sync data from vehicles to payments_ table.');
  }
}

main().catch(console.error);