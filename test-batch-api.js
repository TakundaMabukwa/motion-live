// Test script to verify the batch contact info API is working
// Run with: node test-batch-api.js

require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing Batch Contact Info API...\n');

async function testBatchAPI() {
  try {
    const response = await fetch('http://localhost:3001/api/customers/contact-info/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        accountNumbers: ['TEST-0001', 'DEMO-0001'] // Sample account numbers
      })
    });

    console.log('📡 API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API Error Response:', errorText);
      return false;
    }

    const data = await response.json();
    console.log('✅ API Success Response:', {
      found: data.found,
      requested: data.requested,
      customersKeysLength: Object.keys(data.customers || {}).length
    });

    return true;

  } catch (error) {
    console.error('❌ Fetch Error:', error.message);
    return false;
  }
}

// Test the API
testBatchAPI().then(success => {
  if (success) {
    console.log('\n🎉 Batch API test completed successfully!');
    console.log('✅ The "Failed to fetch batch contact info" error should be resolved.');
  } else {
    console.log('\n⚠️ Batch API test failed. Please check the server logs.');
  }
}).catch(console.error);