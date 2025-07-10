import { strict as assert } from 'assert';
import { test, describe } from 'node:test';
import { CircuitBreaker } from '../src/CircuitBreaker.js';

describe('CircuitBreaker', () => {
  test('should start in CLOSED state', () => {
    const cb = new CircuitBreaker();
    assert.equal(cb.state, 'CLOSED');
    assert.equal(cb.failureCount, 0);
  });

  test('should execute function successfully when CLOSED', async () => {
    const cb = new CircuitBreaker();
    const mockFn = () => Promise.resolve('success');
    
    const result = await cb.execute(mockFn);
    assert.equal(result, 'success');
    assert.equal(cb.state, 'CLOSED');
  });

  test('should count failures and transition to OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 });
    const mockFn = () => Promise.reject(new Error('failure'));
    
    // First failure
    try {
      await cb.execute(mockFn);
    } catch (e) {
      // Expected
    }
    assert.equal(cb.failureCount, 1);
    assert.equal(cb.state, 'CLOSED');
    
    // Second failure - should trigger OPEN
    try {
      await cb.execute(mockFn);
    } catch (e) {
      // Expected
    }
    assert.equal(cb.failureCount, 2);
    assert.equal(cb.state, 'OPEN');
  });

  test('should block execution when OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    const mockFn = () => Promise.reject(new Error('failure'));
    
    // Trigger failure to open circuit
    try {
      await cb.execute(mockFn);
    } catch (e) {
      // Expected
    }
    
    // Should block subsequent calls
    try {
      await cb.execute(() => Promise.resolve('should not execute'));
      assert.fail('Should have thrown error');
    } catch (error) {
      assert.ok(error.message.includes('Circuit breaker is OPEN'));
    }
  });

  test('should transition to HALF_OPEN after timeout', async () => {
    const cb = new CircuitBreaker({ 
      failureThreshold: 1, 
      resetTimeout: 100 
    });
    
    // Trigger failure
    try {
      await cb.execute(() => Promise.reject(new Error('failure')));
    } catch (e) {
      // Expected
    }
    assert.equal(cb.state, 'OPEN');
    
    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Next execution should set to HALF_OPEN
    const mockFn = () => Promise.resolve('success');
    const result = await cb.execute(mockFn);
    
    assert.equal(result, 'success');
    assert.equal(cb.state, 'CLOSED');
    assert.equal(cb.failureCount, 0);
  });

  test('should provide correct state information', () => {
    const cb = new CircuitBreaker();
    const state = cb.getState();
    
    assert.equal(typeof state.state, 'string');
    assert.equal(typeof state.failureCount, 'number');
    assert.ok(state.nextAttempt === null || typeof state.nextAttempt === 'number');
  });

  test('should reset on success', async () => {
    const cb = new CircuitBreaker();
    
    // Cause a failure
    try {
      await cb.execute(() => Promise.reject(new Error('failure')));
    } catch (e) {
      // Expected
    }
    assert.equal(cb.failureCount, 1);
    
    // Successful execution should reset
    await cb.execute(() => Promise.resolve('success'));
    assert.equal(cb.failureCount, 0);
    assert.equal(cb.state, 'CLOSED');
  });
});
