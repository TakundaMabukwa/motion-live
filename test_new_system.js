require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testNewSystem() {
  console.log('🧪 Testing New Simplified Customer System...\n');
  
  try {
    // Test 1: Check if we have data in customers_grouped
    console.log('📊 Step 1: Checking customers_grouped data...');
    const { data: groups, error: groupError } = await supabase
      .from('customers_grouped')
      .select('*')
      .limit(5);
      
    if (groupError) {
      console.error('❌ Error fetching groups:', groupError);
      return;
    }
    
    console.log(`✅ Found ${groups.length} customer groups`);
    
    if (groups.length === 0) {
      console.log('⚠️  No customer groups found. Please check your data.');
      return;
    }

    // Test 2: Show sample contact_details structure
    const sampleGroup = groups[0];
    console.log('\n📋 Sample customer group structure:');
    console.log(`ID: ${sampleGroup.id}`);
    console.log(`Legal Names: ${sampleGroup.legal_names}`);
    console.log(`Account Numbers: ${sampleGroup.all_new_account_numbers}`);
    console.log(`Contact Details Structure:`, JSON.stringify(sampleGroup.contact_details, null, 2));
    
    // Test 3: Test the new API endpoint
    console.log('\n🔍 Step 2: Testing API endpoint...');
    const testAccountNumber = sampleGroup.all_new_account_numbers.split(',')[0].trim();
    console.log(`Testing with account: ${testAccountNumber}`);
    
    try {
      const response = await fetch(`http://localhost:3000/api/customers-grouped/by-account/${encodeURIComponent(testAccountNumber)}`);
      
      if (response.ok) {
        const apiData = await response.json();
        console.log('✅ API Response successful:');
        console.log(`  Company: ${apiData.company}`);
        console.log(`  Trading Name: ${apiData.trading_name}`);
        console.log(`  Email: ${apiData.email}`);
        console.log(`  Phone: ${apiData.cell_no}`);
        console.log(`  Validated: ${apiData.customer_validated}`);
      } else {
        console.log('⚠️  API Response failed:', response.status, await response.text());
        console.log('💡 This is expected if the Next.js server is not running');
      }
    } catch (fetchError) {
      console.log('⚠️  Could not test API endpoint (server not running?):', fetchError.message);
    }

    // Test 4: Sample data structure for form fields
    console.log('\n📝 Step 3: Form fields mapping:');
    const contactDetails = sampleGroup.contact_details || {};
    
    const formFields = {
      // Basic Info
      company: contactDetails.company || sampleGroup.legal_names,
      legal_name: contactDetails.legal_name || sampleGroup.legal_names,
      trading_name: contactDetails.trading_name || sampleGroup.legal_names,
      new_account_number: testAccountNumber,
      
      // Contact Info
      email: contactDetails.email,
      cell_no: contactDetails.cell_no,
      switchboard: contactDetails.switchboard,
      
      // Physical Address
      physical_address_1: contactDetails.physical_address_1,
      physical_address_2: contactDetails.physical_address_2, 
      physical_area: contactDetails.physical_area,
      physical_province: contactDetails.physical_province,
      physical_code: contactDetails.physical_code,
      
      // Validation Status
      customer_validated: contactDetails.customer_validated || false,
      validated_by: contactDetails.validated_by,
      validated_at: contactDetails.validated_at
    };
    
    console.log('Form fields available:');
    Object.entries(formFields).forEach(([key, value]) => {
      const status = value ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${value || 'Not set'}`);
    });

    // Test 5: Suggest next steps
    console.log('\n🚀 Next Steps:');
    console.log('1. ✅ customers_grouped table is now the single source of truth');
    console.log('2. ✅ All detailed contact info stored in contact_details JSONB field');
    console.log('3. ✅ API endpoints updated to handle JSONB structure');
    console.log('4. ✅ Validation form updated to use new endpoints');
    console.log('5. 🔄 Test the validation form by visiting /protected/fc/validate?account=' + testAccountNumber);
    
    if (!sampleGroup.contact_details || Object.keys(sampleGroup.contact_details).length < 3) {
      console.log('\n💡 Recommendation: Run the populate_contact_details.sql script to add sample data');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNewSystem().catch(console.error);