// Simple email test script
const testEmail = async () => {
  try {
    console.log('Testing Solflo email service...');
    console.log('Sending test email to: mabukwa25@gmail.com');
    
    const response = await fetch('http://localhost:3000/api/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'mabukwa25@gmail.com'
      }),
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ SUCCESS: Test email sent!');
      console.log('📧 Check mabukwa25@gmail.com for the email');
      console.log('📨 Message ID:', result.messageId);
    } else {
      console.log('❌ FAILED:', result.error);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('💡 Make sure the server is running: npm run dev');
  }
};

testEmail();
