// Test Email Script
// Run this when your Next.js server is running on localhost:3000

const testEmail = async () => {
  try {
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
    
    if (result.success) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Sent to:', result.details.to);
      console.log('📨 Message ID:', result.messageId);
      console.log('⏰ Sent at:', result.details.sentAt);
    } else {
      console.error('❌ Failed to send test email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Make sure your Next.js server is running on localhost:3000');
  }
};

// Run the test
testEmail();