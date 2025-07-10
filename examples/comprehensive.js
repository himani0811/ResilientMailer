import { EmailService } from '../src/EmailService.js';
import { EmailQueue } from '../src/EmailQueue.js';

/**
 * Comprehensive examples of using the Email Service
 */

// Example 1: Basic Email Sending
async function basicEmailExample() {
  console.log('\n=== Basic Email Sending ===');
  
  const emailService = new EmailService();
  
  const email = {
    to: 'user@example.com',
    subject: 'Welcome to our service',
    body: 'Thank you for signing up! We\'re excited to have you on board.',
    from: 'welcome@company.com'
  };
  
  try {
    const result = await emailService.sendEmail(email);
    console.log('Email sent successfully:', {
      messageId: result.messageId,
      provider: result.provider,
      timestamp: result.timestamp
    });
  } catch (error) {
    console.error('Failed to send email:', error.message);
  }
}

// Example 2: Custom Configuration
async function customConfigExample() {
  console.log('\n=== Custom Configuration ===');
  
  const emailService = new EmailService({
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 8000,
    rateLimit: 50,
    rateLimitWindow: 60000,
    providers: [
      { name: 'PrimaryProvider', failureRate: 0.1, latency: 100 },
      { name: 'BackupProvider', failureRate: 0.2, latency: 200 },
      { name: 'EmergencyProvider', failureRate: 0.05, latency: 300 }
    ]
  });
  
  const email = {
    to: 'customer@example.com',
    subject: 'Order Confirmation',
    body: 'Your order #12345 has been confirmed and will be shipped soon.',
    from: 'orders@company.com'
  };
  
  try {
    const result = await emailService.sendEmail(email);
    console.log('Email sent with custom config:', result.provider);
  } catch (error) {
    console.error('Failed to send email:', error.message);
  }
}

// Example 3: Idempotency
async function idempotencyExample() {
  console.log('\n=== Idempotency Example ===');
  
  const emailService = new EmailService();
  
  const email = {
    to: 'user@example.com',
    subject: 'Password Reset',
    body: 'Click here to reset your password: https://example.com/reset',
    from: 'security@company.com'
  };
  
  try {
    // Send email first time
    const result1 = await emailService.sendEmail(email);
    console.log('First send:', result1.messageId);
    
    // Send same email again (should be deduplicated)
    const result2 = await emailService.sendEmail(email);
    console.log('Second send (duplicate):', result2.messageId);
    
    console.log('Same message ID?', result1.messageId === result2.messageId);
  } catch (error) {
    console.error('Idempotency test failed:', error.message);
  }
}

// Example 4: Custom Idempotency Key
async function customIdempotencyExample() {
  console.log('\n=== Custom Idempotency Key ===');
  
  const emailService = new EmailService();
  
  const email = {
    to: 'user@example.com',
    subject: 'Invoice #INV-001',
    body: 'Your invoice is attached.',
    from: 'billing@company.com'
  };
  
  const customKey = 'invoice-INV-001-user@example.com';
  
  try {
    const result1 = await emailService.sendEmail(email, { idempotencyKey: customKey });
    const result2 = await emailService.sendEmail(email, { idempotencyKey: customKey });
    
    console.log('Custom idempotency works:', result1.messageId === result2.messageId);
  } catch (error) {
    console.error('Custom idempotency failed:', error.message);
  }
}

// Example 5: Rate Limiting
async function rateLimitingExample() {
  console.log('\n=== Rate Limiting Example ===');
  
  const emailService = new EmailService({
    rateLimit: 3, // Only 3 emails per minute
    rateLimitWindow: 60000
  });
  
  const emails = Array.from({ length: 5 }, (_, i) => ({
    to: `user${i}@example.com`,
    subject: `Bulk Email ${i + 1}`,
    body: `This is bulk email number ${i + 1}`,
    from: 'bulk@company.com'
  }));
  
  let successCount = 0;
  let rateLimitedCount = 0;
  
  for (const email of emails) {
    try {
      await emailService.sendEmail(email);
      successCount++;
      console.log(`✅ Sent email to ${email.to}`);
    } catch (error) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        rateLimitedCount++;
        console.log(`🚫 Rate limited: ${email.to}`);
      } else {
        console.log(`❌ Failed: ${email.to} - ${error.message}`);
      }
    }
  }
  
  console.log(`Results: ${successCount} sent, ${rateLimitedCount} rate limited`);
}

// Example 6: Queue System
async function queueExample() {
  console.log('\n=== Queue System Example ===');
  
  const queue = new EmailQueue({
    emailServiceOptions: {
      rateLimit: 5,
      maxRetries: 2
    },
    processInterval: 1000,
    maxConcurrency: 2
  });
  
  // Add multiple emails to queue
  const emails = [
    {
      to: 'priority@example.com',
      subject: 'High Priority Email',
      body: 'This is a high priority message.',
      from: 'urgent@company.com'
    },
    {
      to: 'normal@example.com',
      subject: 'Normal Email',
      body: 'This is a normal priority message.',
      from: 'info@company.com'
    },
    {
      to: 'low@example.com',
      subject: 'Low Priority Email',
      body: 'This is a low priority message.',
      from: 'newsletter@company.com'
    }
  ];
  
  // Add emails with different priorities
  await queue.addEmail(emails[1], { priority: 1 }); // Normal priority
  await queue.addEmail(emails[0], { priority: 10 }); // High priority
  await queue.addEmail(emails[2], { priority: 0 }); // Low priority
  
  console.log('Added emails to queue:', queue.getStats());
  
  // Process queue for a few seconds
  const processingPromise = queue.startProcessing();
  
  setTimeout(() => {
    queue.stopProcessing();
    console.log('Final queue stats:', queue.getStats());
  }, 5000);
  
  return processingPromise;
}

// Example 7: Error Handling and Monitoring
async function monitoringExample() {
  console.log('\n=== Monitoring Example ===');
  
  const emailService = new EmailService({
    providers: [
      { name: 'UnreliableProvider', failureRate: 0.7, latency: 100 },
      { name: 'BackupProvider', failureRate: 0.1, latency: 200 }
    ]
  });
  
  const emails = Array.from({ length: 10 }, (_, i) => ({
    to: `test${i}@example.com`,
    subject: `Test Email ${i}`,
    body: `Test message ${i}`,
    from: 'test@company.com'
  }));
  
  let results = {
    success: 0,
    failed: 0,
    providers: {}
  };
  
  for (const email of emails) {
    try {
      const result = await emailService.sendEmail(email);
      results.success++;
      results.providers[result.provider] = (results.providers[result.provider] || 0) + 1;
    } catch (error) {
      results.failed++;
    }
  }
  
  console.log('Sending results:', results);
  console.log('Service status:', emailService.getStatus());
}

// Example 8: Provider Health Simulation
async function providerHealthExample() {
  console.log('\n=== Provider Health Simulation ===');
  
  const emailService = new EmailService();
  
  // Simulate provider going down
  emailService.providers[0].setHealth(false);
  console.log('Primary provider set to unhealthy');
  
  const email = {
    to: 'user@example.com',
    subject: 'Health Test Email',
    body: 'Testing provider fallback',
    from: 'test@company.com'
  };
  
  try {
    const result = await emailService.sendEmail(email);
    console.log('Email sent via fallback provider:', result.provider);
  } catch (error) {
    console.error('All providers failed:', error.message);
  }
  
  // Restore provider health
  emailService.providers[0].setHealth(true);
  console.log('Primary provider restored');
}

// Run all examples
async function runAllExamples() {
  console.log('🚀 Email Service Examples\n');
  
  try {
    await basicEmailExample();
    await customConfigExample();
    await idempotencyExample();
    await customIdempotencyExample();
    await rateLimitingExample();
    await queueExample();
    await monitoringExample();
    await providerHealthExample();
    
    console.log('\n✨ All examples completed successfully!');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Export for use in other files
export {
  basicEmailExample,
  customConfigExample,
  idempotencyExample,
  customIdempotencyExample,
  rateLimitingExample,
  queueExample,
  monitoringExample,
  providerHealthExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
