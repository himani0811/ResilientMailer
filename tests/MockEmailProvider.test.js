import { strict as assert } from 'assert';
import { test, describe } from 'node:test';
import { MockEmailProvider } from '../src/MockEmailProvider.js';

describe('MockEmailProvider', () => {
  test('should create provider with default settings', () => {
    const provider = new MockEmailProvider('TestProvider');
    
    assert.equal(provider.name, 'TestProvider');
    assert.equal(provider.failureRate, 0.1);
    assert.equal(provider.latency, 100);
    assert.equal(provider.isHealthy, true);
  });

  test('should create provider with custom settings', () => {
    const provider = new MockEmailProvider('TestProvider', {
      failureRate: 0.5,
      latency: 200,
      isHealthy: false
    });
    
    assert.equal(provider.failureRate, 0.5);
    assert.equal(provider.latency, 200);
    assert.equal(provider.isHealthy, false);
  });

  test('should send email successfully when healthy', async () => {
    const provider = new MockEmailProvider('TestProvider', {
      failureRate: 0,
      latency: 10
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };
    
    const result = await provider.sendEmail(email);
    
    assert.equal(result.success, true);
    assert.ok(result.messageId);
    assert.equal(result.provider, 'TestProvider');
    assert.ok(result.timestamp);
    assert.equal(result.email.to, 'test@example.com');
    assert.equal(result.email.subject, 'Test Subject');
  });

  test('should fail when unhealthy', async () => {
    const provider = new MockEmailProvider('TestProvider', {
      isHealthy: false,
      latency: 10
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };
    
    try {
      await provider.sendEmail(email);
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.ok(error.message.includes('TestProvider provider failed'));
    }
  });

  test('should simulate latency', async () => {
    const provider = new MockEmailProvider('TestProvider', {
      failureRate: 0,
      latency: 100
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };
    
    const startTime = Date.now();
    await provider.sendEmail(email);
    const endTime = Date.now();
    
    assert.ok(endTime - startTime >= 90); // Allow some tolerance
  });

  test('should check health status', async () => {
    const provider = new MockEmailProvider('TestProvider', {
      isHealthy: true
    });
    
    const health = await provider.checkHealth();
    assert.equal(health, true);
    
    provider.setHealth(false);
    const health2 = await provider.checkHealth();
    assert.equal(health2, false);
  });

  test('should set failure rate', () => {
    const provider = new MockEmailProvider('TestProvider');
    
    provider.setFailureRate(0.5);
    assert.equal(provider.failureRate, 0.5);
    
    // Should clamp to valid range
    provider.setFailureRate(-0.1);
    assert.equal(provider.failureRate, 0);
    
    provider.setFailureRate(1.5);
    assert.equal(provider.failureRate, 1);
  });

  test('should generate unique message IDs', async () => {
    const provider = new MockEmailProvider('TestProvider', {
      failureRate: 0, // Set to 0 to avoid random failures
      latency: 10
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };
    
    const result1 = await provider.sendEmail(email);
    const result2 = await provider.sendEmail(email);
    
    assert.notEqual(result1.messageId, result2.messageId);
    assert.ok(result1.messageId.startsWith('TestProvider-'));
    assert.ok(result2.messageId.startsWith('TestProvider-'));
  });

  test('should return provider stats', () => {
    const provider = new MockEmailProvider('TestProvider', {
      failureRate: 0.3,
      latency: 150,
      isHealthy: false
    });
    
    const stats = provider.getStats();
    
    assert.equal(stats.name, 'TestProvider');
    assert.equal(stats.failureRate, 0.3);
    assert.equal(stats.latency, 150);
    assert.equal(stats.isHealthy, false);
  });

  test('should simulate random failures based on failure rate', async () => {
    const provider = new MockEmailProvider('TestProvider', {
      failureRate: 1.0, // 100% failure rate
      latency: 10
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };
    
    try {
      await provider.sendEmail(email);
      assert.fail('Should have failed with 100% failure rate');
    } catch (error) {
      assert.ok(error.message.includes('provider failed'));
    }
  });
});
