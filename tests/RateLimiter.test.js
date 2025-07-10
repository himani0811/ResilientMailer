import { strict as assert } from 'assert';
import { test, describe } from 'node:test';
import { RateLimiter } from '../src/RateLimiter.js';

describe('RateLimiter', () => {
  test('should allow requests within limit', () => {
    const rateLimiter = new RateLimiter({ limit: 5, window: 60000 });
    
    for (let i = 0; i < 5; i++) {
      assert.equal(rateLimiter.isAllowed('test'), true);
    }
  });

  test('should block requests exceeding limit', () => {
    const rateLimiter = new RateLimiter({ limit: 2, window: 60000 });
    
    assert.equal(rateLimiter.isAllowed('test'), true);
    assert.equal(rateLimiter.isAllowed('test'), true);
    assert.equal(rateLimiter.isAllowed('test'), false);
  });

  test('should track different identifiers separately', () => {
    const rateLimiter = new RateLimiter({ limit: 1, window: 60000 });
    
    assert.equal(rateLimiter.isAllowed('user1'), true);
    assert.equal(rateLimiter.isAllowed('user2'), true);
    assert.equal(rateLimiter.isAllowed('user1'), false);
    assert.equal(rateLimiter.isAllowed('user2'), false);
  });

  test('should reset after time window', async () => {
    const rateLimiter = new RateLimiter({ limit: 1, window: 100 });
    
    assert.equal(rateLimiter.isAllowed('test'), true);
    assert.equal(rateLimiter.isAllowed('test'), false);
    
    // Wait for window to pass
    await new Promise(resolve => setTimeout(resolve, 150));
    
    assert.equal(rateLimiter.isAllowed('test'), true);
  });

  test('should return correct remaining capacity', () => {
    const rateLimiter = new RateLimiter({ limit: 3, window: 60000 });
    
    assert.equal(rateLimiter.getRemaining('test'), 3);
    
    rateLimiter.isAllowed('test');
    assert.equal(rateLimiter.getRemaining('test'), 2);
    
    rateLimiter.isAllowed('test');
    assert.equal(rateLimiter.getRemaining('test'), 1);
    
    rateLimiter.isAllowed('test');
    assert.equal(rateLimiter.getRemaining('test'), 0);
  });

  test('should reset specific identifier', () => {
    const rateLimiter = new RateLimiter({ limit: 1, window: 60000 });
    
    rateLimiter.isAllowed('test1');
    rateLimiter.isAllowed('test2');
    
    assert.equal(rateLimiter.isAllowed('test1'), false);
    assert.equal(rateLimiter.isAllowed('test2'), false);
    
    rateLimiter.reset('test1');
    
    assert.equal(rateLimiter.isAllowed('test1'), true);
    assert.equal(rateLimiter.isAllowed('test2'), false);
  });

  test('should handle default identifier', () => {
    const rateLimiter = new RateLimiter({ limit: 1, window: 60000 });
    
    assert.equal(rateLimiter.isAllowed(), true);
    assert.equal(rateLimiter.isAllowed(), false);
    assert.equal(rateLimiter.getRemaining(), 0);
  });

  test('should clean up old requests', async () => {
    const rateLimiter = new RateLimiter({ limit: 2, window: 100 });
    
    // Make requests
    rateLimiter.isAllowed('test');
    rateLimiter.isAllowed('test');
    
    assert.equal(rateLimiter.getRemaining('test'), 0);
    
    // Wait for window to pass
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Old requests should be cleaned up
    assert.equal(rateLimiter.getRemaining('test'), 2);
  });
});
