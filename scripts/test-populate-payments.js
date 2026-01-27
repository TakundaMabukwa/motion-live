// Test the populate_payments_from_vehicles function
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
  console.log('TESTING POPULATE PAYMENTS FUNCTION');
  console.log('========================================\n');

  // Check current state
  console.log('📊 BEFORE - Current state:');
  
  const { count: vehiclesCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .not('new_account_number', 'is', null);

  const { count: paymentsCount } = await supabase
    .from('payments_')
    .select('*', { count: 'exact', head: true });

  console.log(`   Vehicles with account numbers: ${vehiclesCount}`);
  console.log(`   Current payments records: ${paymentsCount}\n`);

  // Test the function
  console.log('🚀 Running populate_payments_from_vehicles()...\n');
  
  try {
    const { data, error } = await supabase.rpc('populate_payments_from_vehicles');
    
    if (error) {
      console.error('❌ Function error:', error);
      return;
    }
    
    console.log('✅ Function executed successfully!');
    console.log('📈 Results:', data[0]);
    
    // Check after state
    console.log('\n📊 AFTER - New state:');
    
    const { count: newPaymentsCount } = await supabase
      .from('payments_')
      .select('*', { count: 'exact', head: true });

    console.log(`   Payments records: ${newPaymentsCount}`);
    console.log(`   Records added: ${newPaymentsCount - paymentsCount}\n`);

    // Show sample records
    const { data: samplePayments } = await supabase
      .from('payments_')
      .select('company, cost_code, due_amount, balance_due, payment_status')
      .limit(5);

    console.log('📋 Sample payment records:');
    samplePayments?.forEach((payment, idx) => {
      console.log(`   ${idx + 1}. ${payment.cost_code} - ${payment.company}`);
      console.log(`      Due: R${payment.due_amount} | Balance: R${payment.balance_due} | Status: ${payment.payment_status}`);
    });

  } catch (error) {
    console.error('💥 Exception:', error);
  }
}

main().catch(console.error);