// Test customer lookup API
const testCustomerLookup = async () => {
  try {
    console.log('Testing customer lookup for account: ALLD-0001');
    
    const response = await fetch('http://localhost:3000/api/customers/by-account?account_number=ALLD-0001');
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ SUCCESS: Customer found!');
      console.log('📧 Email:', result.customer.email);
      console.log('🏢 Company:', result.customer.company);
      console.log('📞 Phone:', result.customer.cell_no);
    } else {
      console.log('❌ FAILED:', result.error);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('💡 Make sure the server is running: npm run dev');
  }
};

testCustomerLookup();

