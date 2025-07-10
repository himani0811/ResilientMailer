import { EmailService } from './EmailService.js';
import { Logger } from './Logger.js';

/**
 * Email queue system for processing emails asynchronously
 */
export class EmailQueue {
  constructor(options = {}) {
    this.logger = new Logger(options.logLevel || 'info');
    this.emailService = options.emailService || new EmailService(options.emailServiceOptions);
    
    this.queue = [];
    this.processing = false;
    this.processInterval = options.processInterval || 1000; // 1 second
    this.maxConcurrency = options.maxConcurrency || 5;
    this.retryAttempts = options.retryAttempts || 3;
    
    this.stats = {
      processed: 0,
      failed: 0,
      pending: 0
    };
    
    this.logger.info('EmailQueue initialized', {
      processInterval: this.processInterval,
      maxConcurrency: this.maxConcurrency
    });
  }

  /**
   * Add email to queue
   * @param {Object} email - Email object
   * @param {Object} options - Queue options
   * @returns {string} - Queue item ID
   */
  async addEmail(email, options = {}) {
    const queueItem = {
      id: this.generateId(),
      email,
      options,
      attempts: 0,
      maxAttempts: options.maxAttempts || this.retryAttempts,
      priority: options.priority || 0,
      createdAt: new Date(),
      status: 'pending'
    };
    
    this.queue.push(queueItem);
    this.sortQueue();
    this.stats.pending++;
    
    this.logger.debug('Email added to queue', {
      id: queueItem.id,
      to: email.to,
      queueSize: this.queue.length
    });
    
    return queueItem.id;
  }

  /**
   * Start processing queue
   */
  async startProcessing() {
    if (this.processing) {
      this.logger.warn('Queue processing already started');
      return;
    }
    
    this.processing = true;
    this.logger.info('Starting queue processing');
    
    while (this.processing) {
      try {
        await this.processQueue();
        await this.delay(this.processInterval);
      } catch (error) {
        this.logger.error('Error in queue processing', { error: error.message });
        await this.delay(this.processInterval);
      }
    }
  }

  /**
   * Stop processing queue
   */
  stopProcessing() {
    this.processing = false;
    this.logger.info('Stopping queue processing');
  }

  /**
   * Process emails in queue
   */
  async processQueue() {
    if (this.queue.length === 0) {
      return;
    }
    
    // Get items to process (up to maxConcurrency)
    const itemsToProcess = this.queue
      .filter(item => item.status === 'pending')
      .slice(0, this.maxConcurrency);
    
    if (itemsToProcess.length === 0) {
      return;
    }
    
    // Process items concurrently
    const promises = itemsToProcess.map(item => this.processQueueItem(item));
    await Promise.allSettled(promises);
    
    // Clean up completed items
    this.cleanupQueue();
  }

  /**
   * Process single queue item
   * @param {Object} queueItem - Queue item to process
   */
  async processQueueItem(queueItem) {
    queueItem.status = 'processing';
    queueItem.attempts++;
    
    this.logger.debug('Processing queue item', {
      id: queueItem.id,
      attempt: queueItem.attempts,
      to: queueItem.email.to
    });
    
    try {
      const result = await this.emailService.sendEmail(queueItem.email, queueItem.options);
      
      queueItem.status = 'completed';
      queueItem.result = result;
      queueItem.completedAt = new Date();
      
      this.stats.processed++;
      this.stats.pending--;
      
      this.logger.info('Queue item processed successfully', {
        id: queueItem.id,
        messageId: result.messageId,
        to: queueItem.email.to
      });
      
    } catch (error) {
      this.logger.warn('Queue item processing failed', {
        id: queueItem.id,
        attempt: queueItem.attempts,
        error: error.message,
        to: queueItem.email.to
      });
      
      if (queueItem.attempts >= queueItem.maxAttempts) {
        queueItem.status = 'failed';
        queueItem.error = error.message;
        queueItem.failedAt = new Date();
        
        this.stats.failed++;
        this.stats.pending--;
        
        this.logger.error('Queue item failed permanently', {
          id: queueItem.id,
          attempts: queueItem.attempts,
          error: error.message
        });
      } else {
        queueItem.status = 'pending';
        queueItem.nextAttempt = new Date(Date.now() + this.calculateRetryDelay(queueItem.attempts));
      }
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt - Attempt number
   * @returns {number} - Delay in milliseconds
   */
  calculateRetryDelay(attempt) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    return Math.min(exponentialDelay, maxDelay);
  }

  /**
   * Sort queue by priority (higher priority first)
   */
  sortQueue() {
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Clean up completed and old failed items
   */
  cleanupQueue() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    this.queue = this.queue.filter(item => {
      if (item.status === 'completed' || item.status === 'failed') {
        const age = now - (item.completedAt || item.failedAt || item.createdAt).getTime();
        return age < maxAge;
      }
      return true;
    });
  }

  /**
   * Get queue statistics
   * @returns {Object} - Queue stats
   */
  getStats() {
    const statusCounts = this.queue.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    
    return {
      ...this.stats,
      queueSize: this.queue.length,
      statusCounts,
      processing: this.processing
    };
  }

  /**
   * Get queue items with optional filtering
   * @param {Object} filter - Filter options
   * @returns {Array} - Filtered queue items
   */
  getQueueItems(filter = {}) {
    let items = [...this.queue];
    
    if (filter.status) {
      items = items.filter(item => item.status === filter.status);
    }
    
    if (filter.limit) {
      items = items.slice(0, filter.limit);
    }
    
    return items.map(item => ({
      id: item.id,
      status: item.status,
      attempts: item.attempts,
      createdAt: item.createdAt,
      email: {
        to: item.email.to,
        subject: item.email.subject
      }
    }));
  }

  /**
   * Remove item from queue
   * @param {string} id - Queue item ID
   * @returns {boolean} - Whether item was removed
   */
  removeItem(id) {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      const item = this.queue[index];
      if (item.status === 'pending') {
        this.stats.pending--;
      }
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Clear all items from queue
   * @param {string} status - Optional status filter
   */
  clear(status = null) {
    if (status) {
      this.queue = this.queue.filter(item => item.status !== status);
    } else {
      this.queue = [];
      this.stats = {
        processed: 0,
        failed: 0,
        pending: 0
      };
    }
  }

  /**
   * Generate unique ID
   * @returns {string} - Unique ID
   */
  generateId() {
    return `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility
   * @param {number} ms - Delay in milliseconds
   * @returns {Promise} - Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
