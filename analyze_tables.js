require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeTableStructure() {
  console.log('🔍 Analyzing table structures and relationships...\n');
  
  try {
    // Check customers_grouped structure
    console.log('📊 CUSTOMERS_GROUPED Table:');
    const { data: groupedData, error: groupedError } = await supabase
      .from('customers_grouped')
      .select('*')
      .limit(3);
    
    if (groupedError) {
      console.error('❌ Error fetching customers_grouped:', groupedError);
    } else {
      console.log('✅ Sample customers_grouped record:');
      if (groupedData && groupedData[0]) {
        console.log(JSON.stringify(groupedData[0], null, 2));
      }
      console.log(`📈 Total grouped records: ${groupedData?.length}`);
    }

    // Check customers structure  
    console.log('\n📊 CUSTOMERS Table:');
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .limit(3);
      
    if (customersError) {
      console.error('❌ Error fetching customers:', customersError);
    } else {
      console.log('✅ Sample customers record:');
      if (customersData && customersData[0]) {
        // Show key fields only for readability
        const sample = {
          id: customersData[0].id,
          company: customersData[0].company,
          trading_name: customersData[0].trading_name,
          new_account_number: customersData[0].new_account_number,
          email: customersData[0].email,
          cell_no: customersData[0].cell_no,
          totalFields: Object.keys(customersData[0]).length,
          allFields: Object.keys(customersData[0])
        };
        console.log(JSON.stringify(sample, null, 2));
      }
      console.log(`📈 Total individual records: ${customersData?.length}`);
    }

    // Analyze the relationship
    console.log('\n🔗 RELATIONSHIP ANALYSIS:');
    if (groupedData && groupedData[0] && groupedData[0].all_new_account_numbers) {
      const accountNumbers = groupedData[0].all_new_account_numbers.split(',');
      console.log('📋 Accounts in grouped record:', accountNumbers.map(a => a.trim()));
      
      // Check if these accounts exist in customers table
      const { data: relatedCustomers, error: relError } = await supabase
        .from('customers')
        .select('new_account_number, company, trading_name, email, cell_no')
        .in('new_account_number', accountNumbers.map(a => a.trim()));
        
      if (!relError && relatedCustomers) {
        console.log(`🔄 Related individual customer records: ${relatedCustomers.length}`);
        console.log('📊 Individual customers for this group:');
        relatedCustomers.forEach(cust => {
          console.log(`  - ${cust.new_account_number}: ${cust.company} (${cust.trading_name})`);
          console.log(`    📧 ${cust.email || 'No email'} | 📱 ${cust.cell_no || 'No phone'}`);
        });
      }
    }

    // Check counts
    console.log('\n📊 TABLE COUNTS:');
    
    const { count: groupedCount } = await supabase
      .from('customers_grouped')
      .select('*', { count: 'exact', head: true });
      
    const { count: customersCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
      
    console.log(`👥 customers_grouped: ${groupedCount} records`);
    console.log(`👤 customers: ${customersCount} records`);
    
    const ratio = customersCount && groupedCount ? (customersCount / groupedCount).toFixed(2) : 'N/A';
    console.log(`📈 Average customers per group: ${ratio}`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

analyzeTableStructure().catch(console.error);