require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
);

async function testVehicleColumns() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .not('new_account_number', 'is', null)
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Sample vehicle columns:');
    console.log(Object.keys(data[0]));
    console.log('\nSample vehicle data:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No vehicles found');
  }
}

testVehicleColumns();
