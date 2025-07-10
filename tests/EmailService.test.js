import { strict as assert } from 'assert';
import { test, describe } from 'node:test';
import { EmailService } from '../src/EmailService.js';

describe('EmailService', () => {
  test('should create service with default configuration', () => {
    const service = new EmailService();
    
    assert.equal(service.maxRetries, 3);
    assert.equal(service.baseDelay, 1000);
    assert.equal(service.maxDelay, 10000);
    assert.equal(service.providers.length, 2);
  });

  test('should create service with custom configuration', () => {
    const service = new EmailService({
      maxRetries: 5,
      baseDelay: 500,
      maxDelay: 5000,
      rateLimit: 50
    });
    
    assert.equal(service.maxRetries, 5);
    assert.equal(service.baseDelay, 500);
    assert.equal(service.maxDelay, 5000);
    assert.equal(service.rateLimiter.limit, 50);
  });

  test('should validate email format', async () => {
    const service = new EmailService();
    
    // Missing required fields
    try {
      await service.sendEmail({});
      assert.fail('Should have thrown validation error');
    } catch (error) {
      assert.ok(error.message.includes('required'));
    }
    
    // Invalid email format
    try {
      await service.sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        body: 'Test body'
      });
      assert.fail('Should have thrown validation error');
    } catch (error) {
      assert.ok(error.message.includes('Invalid email address format'));
    }
  });

  test('should send email successfully', async () => {
    const service = new EmailService({
      providers: [
        { name: 'TestProvider', failureRate: 0, latency: 10 }
      ]
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      from: 'sender@example.com'
    };
    
    const result = await service.sendEmail(email);
    
    assert.equal(result.success, true);
    assert.ok(result.messageId);
    assert.equal(result.provider, 'TestProvider');
  });

  test('should implement idempotency', async () => {
    const service = new EmailService({
      providers: [
        { name: 'TestProvider', failureRate: 0, latency: 10 }
      ]
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      from: 'sender@example.com'
    };
    
    const result1 = await service.sendEmail(email);
    const result2 = await service.sendEmail(email);
    
    // Should return the same result for duplicate
    assert.equal(result1.messageId, result2.messageId);
  });

  test('should enforce rate limiting', async () => {
    const service = new EmailService({
      rateLimit: 1,
      providers: [
        { name: 'TestProvider', failureRate: 0, latency: 10 }
      ]
    });
    
    const email1 = {
      to: 'test1@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      from: 'sender@example.com'
    };
    
    const email2 = {
      to: 'test2@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      from: 'sender@example.com'
    };
    
    // First email should succeed
    await service.sendEmail(email1);
    
    // Second email should be rate limited
    try {
      await service.sendEmail(email2);
      assert.fail('Should have been rate limited');
    } catch (error) {
      assert.equal(error.code, 'RATE_LIMIT_EXCEEDED');
    }
  });

  test('should retry on failure', async () => {
    const service = new EmailService({
      maxRetries: 2,
      baseDelay: 10,
      providers: [
        { name: 'TestProvider', failureRate: 0.8, latency: 10 }
      ]
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      from: 'sender@example.com'
    };
    
    // This should eventually fail after retries
    try {
      await service.sendEmail(email);
    } catch (error) {
      assert.ok(error.message.includes('Failed to send email'));
    }
  });

  test('should fallback between providers', async () => {
    const service = new EmailService({
      providers: [
        { name: 'Provider1', failureRate: 1.0, latency: 10 }, // Always fails
        { name: 'Provider2', failureRate: 0, latency: 10 }    // Always succeeds
      ]
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      from: 'sender@example.com'
    };
    
    const result = await service.sendEmail(email);
    
    // Should have used the second provider
    assert.equal(result.provider, 'Provider2');
  });

  test('should calculate exponential backoff delay', () => {
    const service = new EmailService({ baseDelay: 1000, maxDelay: 8000 });
    
    const delay1 = service.calculateDelay(1);
    const delay2 = service.calculateDelay(2);
    const delay3 = service.calculateDelay(3);
    const delay4 = service.calculateDelay(4);
    
    // Should increase exponentially but stay within bounds
    assert.ok(delay1 >= 1000 && delay1 <= 1100); // 1000 + 10% jitter
    assert.ok(delay2 >= 2000 && delay2 <= 2200); // 2000 + 10% jitter
    assert.ok(delay3 >= 4000 && delay3 <= 4400); // 4000 + 10% jitter
    assert.ok(delay4 <= 8000); // Should be capped at maxDelay
  });

  test('should generate consistent idempotency keys', () => {
    const service = new EmailService();
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      from: 'sender@example.com'
    };
    
    const key1 = service.generateIdempotencyKey(email);
    const key2 = service.generateIdempotencyKey(email);
    
    assert.equal(key1, key2);
    assert.equal(typeof key1, 'string');
    assert.ok(key1.length > 0);
  });

  test('should provide service status', () => {
    const service = new EmailService();
    const status = service.getStatus();
    
    assert.ok(Array.isArray(status.providers));
    assert.equal(typeof status.currentProvider, 'number');
    assert.ok(status.rateLimiter);
    assert.equal(typeof status.sentEmails, 'number');
    assert.equal(typeof status.uptime, 'number');
  });

  test('should cleanup expired idempotency records', async () => {
    const service = new EmailService({
      idempotencyTtl: 100, // 100ms TTL
      providers: [
        { name: 'TestProvider', failureRate: 0, latency: 10 }
      ]
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      from: 'sender@example.com'
    };
    
    await service.sendEmail(email);
    assert.equal(service.sentEmails.size, 1);
    
    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    
    service.cleanup();
    assert.equal(service.sentEmails.size, 0);
  });

  test('should handle custom idempotency keys', async () => {
    const service = new EmailService({
      providers: [
        { name: 'TestProvider', failureRate: 0, latency: 10 }
      ]
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      from: 'sender@example.com'
    };
    
    const result1 = await service.sendEmail(email, { idempotencyKey: 'custom-key' });
    const result2 = await service.sendEmail(email, { idempotencyKey: 'custom-key' });
    
    assert.equal(result1.messageId, result2.messageId);
  });

  test('should handle all providers failing', async () => {
    const service = new EmailService({
      providers: [
        { name: 'Provider1', failureRate: 1.0, latency: 10 },
        { name: 'Provider2', failureRate: 1.0, latency: 10 }
      ]
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body',
      from: 'sender@example.com'
    };
    
    try {
      await service.sendEmail(email);
      assert.fail('Should have failed when all providers fail');
    } catch (error) {
      assert.ok(error.message.includes('Failed to send email after trying all providers'));
    }
  });
});
