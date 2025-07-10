import { strict as assert } from 'assert';
import { test, describe } from 'node:test';
import { EmailQueue } from '../src/EmailQueue.js';
import { EmailService } from '../src/EmailService.js';

describe('EmailQueue', () => {
  test('should create queue with default settings', () => {
    const queue = new EmailQueue();
    
    assert.equal(queue.processInterval, 1000);
    assert.equal(queue.maxConcurrency, 5);
    assert.equal(queue.retryAttempts, 3);
    assert.equal(queue.processing, false);
  });

  test('should create queue with custom settings', () => {
    const emailService = new EmailService();
    const queue = new EmailQueue({
      emailService,
      processInterval: 2000,
      maxConcurrency: 3,
      retryAttempts: 5
    });
    
    assert.equal(queue.emailService, emailService);
    assert.equal(queue.processInterval, 2000);
    assert.equal(queue.maxConcurrency, 3);
    assert.equal(queue.retryAttempts, 5);
  });

  test('should add email to queue', async () => {
    const queue = new EmailQueue();
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };
    
    const id = await queue.addEmail(email);
    
    assert.equal(typeof id, 'string');
    assert.ok(id.startsWith('queue-'));
    assert.equal(queue.queue.length, 1);
    assert.equal(queue.stats.pending, 1);
  });

  test('should add email with options', async () => {
    const queue = new EmailQueue();
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };
    
    const options = {
      priority: 5,
      maxAttempts: 2
    };
    
    await queue.addEmail(email, options);
    
    const queueItem = queue.queue[0];
    assert.equal(queueItem.priority, 5);
    assert.equal(queueItem.maxAttempts, 2);
  });

  test('should sort queue by priority', async () => {
    const queue = new EmailQueue();
    
    const email1 = { to: 'test1@example.com', subject: 'Low Priority', body: 'Body' };
    const email2 = { to: 'test2@example.com', subject: 'High Priority', body: 'Body' };
    const email3 = { to: 'test3@example.com', subject: 'Medium Priority', body: 'Body' };
    
    await queue.addEmail(email1, { priority: 1 });
    await queue.addEmail(email2, { priority: 10 });
    await queue.addEmail(email3, { priority: 5 });
    
    // High priority should be first
    assert.equal(queue.queue[0].priority, 10);
    assert.equal(queue.queue[1].priority, 5);
    assert.equal(queue.queue[2].priority, 1);
  });

  test('should process queue items', async () => {
    const mockEmailService = {
      sendEmail: async (email) => ({
        success: true,
        messageId: 'test-message-id',
        provider: 'TestProvider',
        timestamp: new Date().toISOString()
      })
    };
    
    const queue = new EmailQueue({
      emailService: mockEmailService,
      processInterval: 50
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };
    
    await queue.addEmail(email);
    await queue.processQueue();
    
    const queueItem = queue.queue[0];
    assert.equal(queueItem.status, 'completed');
    assert.ok(queueItem.result);
    assert.equal(queue.stats.processed, 1);
  });

  test('should retry failed items', async () => {
    let attempts = 0;
    const mockEmailService = {
      sendEmail: async (email) => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return {
          success: true,
          messageId: 'test-message-id',
          provider: 'TestProvider',
          timestamp: new Date().toISOString()
        };
      }
    };
    
    const queue = new EmailQueue({
      emailService: mockEmailService,
      retryAttempts: 5
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };
    
    await queue.addEmail(email);
    
    // Process multiple times to trigger retries
    await queue.processQueue();
    assert.equal(queue.queue[0].status, 'pending');
    assert.equal(queue.queue[0].attempts, 1);
    
    await queue.processQueue();
    assert.equal(queue.queue[0].status, 'pending');
    assert.equal(queue.queue[0].attempts, 2);
    
    await queue.processQueue();
    assert.equal(queue.queue[0].status, 'completed');
    assert.equal(queue.queue[0].attempts, 3);
  });

  test('should fail items after max attempts', async () => {
    const mockEmailService = {
      sendEmail: async (email) => {
        throw new Error('Permanent failure');
      }
    };
    
    const queue = new EmailQueue({
      emailService: mockEmailService,
      retryAttempts: 2
    });
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };
    
    await queue.addEmail(email);
    
    // Process until max attempts reached
    await queue.processQueue();
    await queue.processQueue();
    
    const queueItem = queue.queue[0];
    assert.equal(queueItem.status, 'failed');
    assert.equal(queueItem.attempts, 2);
    assert.equal(queue.stats.failed, 1);
  });

  test('should calculate retry delay with exponential backoff', () => {
    const queue = new EmailQueue();
    
    const delay1 = queue.calculateRetryDelay(1);
    const delay2 = queue.calculateRetryDelay(2);
    const delay3 = queue.calculateRetryDelay(3);
    const delay10 = queue.calculateRetryDelay(10);
    
    assert.ok(delay1 >= 1000);
    assert.ok(delay2 >= 2000);
    assert.ok(delay3 >= 4000);
    assert.ok(delay10 <= 30000); // Should be capped at max delay
  });

  test('should provide queue statistics', async () => {
    const queue = new EmailQueue();
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };
    
    await queue.addEmail(email);
    
    const stats = queue.getStats();
    
    assert.equal(typeof stats.processed, 'number');
    assert.equal(typeof stats.failed, 'number');
    assert.equal(typeof stats.pending, 'number');
    assert.equal(typeof stats.queueSize, 'number');
    assert.ok(stats.statusCounts);
    assert.equal(typeof stats.processing, 'boolean');
  });

  test('should get queue items with filtering', async () => {
    const queue = new EmailQueue();
    
    const email1 = { to: 'test1@example.com', subject: 'Subject 1', body: 'Body' };
    const email2 = { to: 'test2@example.com', subject: 'Subject 2', body: 'Body' };
    
    await queue.addEmail(email1);
    await queue.addEmail(email2);
    
    const allItems = queue.getQueueItems();
    assert.equal(allItems.length, 2);
    
    const limitedItems = queue.getQueueItems({ limit: 1 });
    assert.equal(limitedItems.length, 1);
    
    const pendingItems = queue.getQueueItems({ status: 'pending' });
    assert.equal(pendingItems.length, 2);
  });

  test('should remove items from queue', async () => {
    const queue = new EmailQueue();
    
    const email = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };
    
    const id = await queue.addEmail(email);
    assert.equal(queue.queue.length, 1);
    
    const removed = queue.removeItem(id);
    assert.equal(removed, true);
    assert.equal(queue.queue.length, 0);
    
    const removedAgain = queue.removeItem(id);
    assert.equal(removedAgain, false);
  });

  test('should clear queue', async () => {
    const queue = new EmailQueue();
    
    const email1 = { to: 'test1@example.com', subject: 'Subject 1', body: 'Body' };
    const email2 = { to: 'test2@example.com', subject: 'Subject 2', body: 'Body' };
    
    await queue.addEmail(email1);
    await queue.addEmail(email2);
    
    assert.equal(queue.queue.length, 2);
    
    queue.clear();
    
    assert.equal(queue.queue.length, 0);
    assert.deepEqual(queue.stats, { processed: 0, failed: 0, pending: 0 });
  });

  test('should cleanup old completed items', async () => {
    const queue = new EmailQueue();
    
    // Add a completed item with old timestamp
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    queue.queue.push({
      id: 'old-item',
      status: 'completed',
      completedAt: oldDate,
      createdAt: oldDate
    });
    
    // Add a recent completed item
    queue.queue.push({
      id: 'recent-item',
      status: 'completed',
      completedAt: new Date(),
      createdAt: new Date()
    });
    
    assert.equal(queue.queue.length, 2);
    
    queue.cleanupQueue();
    
    // Only recent item should remain
    assert.equal(queue.queue.length, 1);
    assert.equal(queue.queue[0].id, 'recent-item');
  });

  test('should start and stop processing', () => {
    const queue = new EmailQueue();
    
    assert.equal(queue.processing, false);
    
    // Start processing (but don't await to avoid blocking)
    queue.startProcessing();
    assert.equal(queue.processing, true);
    
    queue.stopProcessing();
    assert.equal(queue.processing, false);
  });

  test('should generate unique IDs', () => {
    const queue = new EmailQueue();
    
    const id1 = queue.generateId();
    const id2 = queue.generateId();
    
    assert.notEqual(id1, id2);
    assert.ok(id1.startsWith('queue-'));
    assert.ok(id2.startsWith('queue-'));
  });
});
