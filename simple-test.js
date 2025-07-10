import { EmailService } from './src/EmailService.js';

console.log('🚀 Testing Email Service...\n');

const emailService = new EmailService({
  logLevel: 'info',
  maxRetries: 2,
  rateLimit: 5
});

const email = {
  to: 'test@example.com',
  subject: 'Test Email',
  body: 'This is a test email from the resilient email service!',
  from: 'noreply@example.com'
};

try {
  console.log('📧 Sending email...');
  const result = await emailService.sendEmail(email);
  
  console.log('✅ Email sent successfully!');
  console.log('   Message ID:', result.messageId);
  console.log('   Provider:', result.provider);
  console.log('   Timestamp:', result.timestamp);
  
  // Test idempotency
  console.log('\n🔄 Testing idempotency...');
  const result2 = await emailService.sendEmail(email);
  console.log('   Same message ID?', result.messageId === result2.messageId);
  
  // Show service status
  console.log('\n📊 Service Status:');
  const status = emailService.getStatus();
  console.log('   Current Provider:', status.providers[status.currentProvider].name);
  console.log('   Sent Emails:', status.sentEmails);
  console.log('   Rate Limit Remaining:', status.rateLimiter.remaining);
  
  console.log('\n🎉 Test completed successfully!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}
