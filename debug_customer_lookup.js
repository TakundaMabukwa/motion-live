require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugCustomerLookup() {
  console.log('🔍 Debugging Customer Lookup API...\n');
  
  try {
    // Get some sample account numbers
    const { data: sampleGroups, error } = await supabase
      .from('customers_grouped')
      .select('id, legal_names, all_new_account_numbers')
      .limit(5);
      
    if (error) {
      console.error('❌ Error fetching sample data:', error);
      return;
    }
    
    console.log('📊 Sample customer groups in database:');
    sampleGroups.forEach((group, index) => {
      console.log(`${index + 1}. ID: ${group.id} | ${group.legal_names}`);
      console.log(`   Account Numbers: ${group.all_new_account_numbers}`);
      
      // Show individual accounts
      if (group.all_new_account_numbers) {
        const accounts = group.all_new_account_numbers.split(',').map(a => a.trim());
        console.log(`   Individual: ${accounts.join(', ')}`);
      }
      console.log();
    });

    // Test API endpoint with first available account
    if (sampleGroups.length > 0 && sampleGroups[0].all_new_account_numbers) {
      const testAccount = sampleGroups[0].all_new_account_numbers.split(',')[0].trim();
      console.log(`🧪 Testing API with account: "${testAccount}"`);
      
      try {
        const response = await fetch(`http://localhost:3000/api/customers-grouped/by-account/${encodeURIComponent(testAccount)}`);
        const responseText = await response.text();
        
        console.log(`📡 API Response Status: ${response.status}`);
        console.log(`📡 API Response:`, responseText);
        
        if (response.ok) {
          const data = JSON.parse(responseText);
          console.log('✅ API Success!');
          console.log(`   Found: ${data.company || data.legal_names}`);
          console.log(`   Email: ${data.email || 'Not set'}`);
          console.log(`   Phone: ${data.cell_no || 'Not set'}`);
          console.log(`   Is Initial Data Entry: ${!data.email && !data.cell_no}`);
        } else {
          console.log('❌ API Failed');
        }
      } catch (apiError) {
        console.log('⚠️  Could not test API (server not running?):', apiError.message);
      }
    }

    // Test account matching logic
    console.log('\n🔍 Testing account matching logic:');
    const testCases = [
      'LJVI-0001',
      'ANKR-0001', 
      'KARG-0008',
      'NONEXISTENT'
    ];
    
    for (const testAccount of testCases) {
      console.log(`\nTesting: "${testAccount}"`);
      
      const matchingGroup = sampleGroups.find(group => {
        const accounts = (group.all_new_account_numbers || '').split(',').map(a => a.trim());
        return accounts.some(acc => acc === testAccount || testAccount.includes(acc) || acc.includes(testAccount));
      });
      
      if (matchingGroup) {
        console.log(`✅ Match found: ${matchingGroup.legal_names} (ID: ${matchingGroup.id})`);
      } else {
        console.log('❌ No match found');
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugCustomerLookup().catch(console.error);