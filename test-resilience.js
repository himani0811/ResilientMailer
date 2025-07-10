import { EmailService } from './src/EmailService.js';

console.log('🚀 Testing Email Service Resilience Features...\n');

// Test 1: Provider Fallback
console.log('=== Test 1: Provider Fallback ===');
const emailService = new EmailService({
  logLevel: 'info',
  maxRetries: 2,
  providers: [
    { name: 'UnreliableProvider', failureRate: 1.0, latency: 100 }, // Always fails
    { name: 'ReliableProvider', failureRate: 0.0, latency: 150 }    // Never fails
  ]
});

const email = {
  to: 'test@example.com',
  subject: 'Fallback Test',
  body: 'Testing provider fallback mechanism',
  from: 'test@company.com'
};

try {
  const result = await emailService.sendEmail(email);
  console.log('✅ Email sent via fallback provider:', result.provider);
} catch (error) {
  console.error('❌ Fallback test failed:', error.message);
}

// Test 2: Rate Limiting
console.log('\n=== Test 2: Rate Limiting ===');
const rateLimitedService = new EmailService({
  logLevel: 'warn',
  rateLimit: 2, // Only 2 emails allowed
  rateLimitWindow: 60000
});

let successCount = 0;
let rateLimitedCount = 0;

for (let i = 1; i <= 4; i++) {
  try {
    const testEmail = {
      to: `user${i}@example.com`,
      subject: `Test Email ${i}`,
      body: `This is test email number ${i}`,
      from: 'bulk@company.com'
    };
    
    await rateLimitedService.sendEmail(testEmail);
    successCount++;
    console.log(`✅ Email ${i} sent successfully`);
  } catch (error) {
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      rateLimitedCount++;
      console.log(`🚫 Email ${i} rate limited`);
    } else {
      console.log(`❌ Email ${i} failed: ${error.message}`);
    }
  }
}

console.log(`📊 Rate limiting results: ${successCount} sent, ${rateLimitedCount} rate limited`);

// Test 3: Circuit Breaker
console.log('\n=== Test 3: Circuit Breaker Simulation ===');
const circuitTestService = new EmailService({
  logLevel: 'warn',
  circuitBreakerThreshold: 2, // Trip after 2 failures
  circuitBreakerTimeout: 3000, // 3 second timeout
  providers: [
    { name: 'FailingProvider', failureRate: 1.0, latency: 50 } // Always fails
  ]
});

// This should trigger the circuit breaker
for (let i = 1; i <= 4; i++) {
  try {
    await circuitTestService.sendEmail({
      to: `circuit-test${i}@example.com`,
      subject: `Circuit Test ${i}`,
      body: `Testing circuit breaker ${i}`,
      from: 'circuit@company.com'
    });
  } catch (error) {
    console.log(`🔌 Attempt ${i}: ${error.message}`);
  }
}

console.log('\n📊 Service Status Summary:');
console.log('Fallback Service:', emailService.getStatus().providers[emailService.getStatus().currentProvider]?.name);
console.log('Rate Limited Service - Remaining:', rateLimitedService.getStatus().rateLimiter.remaining);
console.log('Circuit Test Service - Provider State:', circuitTestService.getStatus().providers[0]?.circuitBreaker.state);

console.log('\n🎉 Resilience testing completed!');
