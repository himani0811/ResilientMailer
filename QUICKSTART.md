# Quick Start Guide

This guide will help you get started with the Resilient Email Service quickly.

## Installation

No external dependencies are required. The service uses only Node.js built-in modules.

```bash
# Make sure you have Node.js 18+ installed
node --version

# Navigate to the project directory
cd resilient-email-service
```

## Basic Usage

### 1. Sending a Simple Email

```javascript
import { EmailService } from './src/EmailService.js';

const emailService = new EmailService();

const email = {
  to: 'user@example.com',
  subject: 'Hello World',
  body: 'This is a test email',
  from: 'sender@example.com'
};

try {
  const result = await emailService.sendEmail(email);
  console.log('Email sent:', result.messageId);
} catch (error) {
  console.error('Failed to send email:', error.message);
}
```

### 2. Using the Command Line Interface

```bash
# Send an email directly
node cli/index.js send --to user@example.com --subject "Hello" --body "Test message"

# Add email to queue and process it
node cli/index.js queue --to user@example.com --subject "Hello" --body "Test" --process

# Check service status
node cli/index.js status

# Run a quick test
node cli/index.js test
```

### 3. Running Examples

```bash
# Run comprehensive examples
npm run examples

# Run the demo application
npm start
```

### 4. Running Tests

```bash
# Run all tests
npm test

# Run with Node.js test runner
npm run test:node

# Run tests in watch mode
npm run test:watch
```

## Configuration

### Environment-based Configuration

```javascript
import { EmailService } from './src/EmailService.js';
import { getConfig } from './config/index.js';

// Use production configuration
const config = getConfig('production');
const emailService = new EmailService(config);
```

### Custom Configuration

```javascript
const emailService = new EmailService({
  maxRetries: 5,
  baseDelay: 1000,
  rateLimit: 100,
  providers: [
    { name: 'Primary', failureRate: 0.1, latency: 100 },
    { name: 'Backup', failureRate: 0.05, latency: 200 }
  ]
});
```

## Queue System

### Basic Queue Usage

```javascript
import { EmailQueue } from './src/EmailQueue.js';

const queue = new EmailQueue();

// Add emails to queue
await queue.addEmail(email, { priority: 5 });

// Process queue
queue.startProcessing();

// Stop processing after some time
setTimeout(() => {
  queue.stopProcessing();
}, 10000);
```

## Features Overview

### ✅ Retry Logic
- Exponential backoff with jitter
- Configurable max retries and delays
- Automatic retry on temporary failures

### ✅ Provider Fallback
- Multiple email provider support
- Automatic failover on provider errors
- Health monitoring and circuit breakers

### ✅ Idempotency
- Prevents duplicate email sends
- Automatic deduplication based on content
- Custom idempotency key support

### ✅ Rate Limiting
- Token bucket algorithm
- Per-identifier rate limiting
- Configurable limits and windows

### ✅ Circuit Breaker
- Prevents cascading failures
- Automatic recovery after timeout
- Per-provider circuit breakers

### ✅ Queue System
- Asynchronous email processing
- Priority-based queue ordering
- Configurable concurrency and retry

### ✅ Monitoring & Logging
- Comprehensive status reporting
- Structured logging with levels
- Performance metrics tracking

## Common Use Cases

### High-Volume Sending

```javascript
// Use high-volume configuration
const config = getConfig('high-volume');
const emailService = new EmailService(config);

// Use queue for better throughput
const queue = new EmailQueue({
  emailServiceOptions: config,
  maxConcurrency: 20,
  processInterval: 500
});
```

### Transactional Emails

```javascript
// Use custom idempotency for transactions
const orderId = 'ORDER-12345';
const result = await emailService.sendEmail(email, {
  idempotencyKey: `order-confirmation-${orderId}`
});
```

### Bulk Email Campaigns

```javascript
// Add multiple emails to queue with priorities
const emails = getSubscriberEmails();

for (const email of emails) {
  await queue.addEmail(email, {
    priority: email.isVip ? 10 : 1,
    maxAttempts: 5
  });
}

queue.startProcessing();
```

## Error Handling

The service provides detailed error information:

```javascript
try {
  await emailService.sendEmail(email);
} catch (error) {
  switch (error.code) {
    case 'RATE_LIMIT_EXCEEDED':
      console.log('Rate limit exceeded, try again later');
      break;
    default:
      console.log('General error:', error.message);
  }
}
```

## Production Checklist

- [ ] Configure appropriate rate limits
- [ ] Set up monitoring and alerting
- [ ] Use production logging level
- [ ] Configure circuit breaker thresholds
- [ ] Set up persistent storage for idempotency
- [ ] Implement proper error handling
- [ ] Test provider failover scenarios
- [ ] Monitor queue processing performance

## Need Help?

- Check the comprehensive examples in `examples/comprehensive.js`
- Run `node cli/index.js help` for CLI usage
- Review the test files for detailed usage patterns
- Check the configuration examples in `config/index.js`
