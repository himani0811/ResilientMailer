import crypto from 'crypto';
import { MockEmailProvider } from './MockEmailProvider.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import { RateLimiter } from './RateLimiter.js';
import { Logger } from './Logger.js';

/**
 * Resilient email service with retry, fallback, and rate limiting
 */
export class EmailService {
  constructor(options = {}) {
    this.logger = new Logger(options.logLevel || 'info');
    
    // Configuration
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 10000; // 10 seconds
    
    // Initialize providers
    this.providers = this.initializeProviders(options.providers);
    this.currentProviderIndex = 0;
    
    // Rate limiting
    this.rateLimiter = new RateLimiter({
      limit: options.rateLimit || 100,
      window: options.rateLimitWindow || 60000
    });
    
    // Circuit breakers for each provider
    this.circuitBreakers = new Map();
    this.providers.forEach((provider, index) => {
      this.circuitBreakers.set(index, new CircuitBreaker({
        failureThreshold: options.circuitBreakerThreshold || 5,
        resetTimeout: options.circuitBreakerTimeout || 60000
      }));
    });
    
    // Idempotency tracking
    this.sentEmails = new Map();
    this.idempotencyTtl = options.idempotencyTtl || 3600000; // 1 hour
    
    this.logger.info('EmailService initialized', {
      providers: this.providers.length,
      maxRetries: this.maxRetries,
      rateLimit: this.rateLimiter.limit
    });
  }

  /**
   * Initialize email providers
   * @param {Array} providerConfigs - Provider configurations
   * @returns {Array} - Initialized providers
   */
  initializeProviders(providerConfigs) {
    const defaultProviders = [
      { name: 'Provider-A', failureRate: 0.1, latency: 100 },
      { name: 'Provider-B', failureRate: 0.15, latency: 200 }
    ];
    
    const configs = providerConfigs || defaultProviders;
    return configs.map(config => new MockEmailProvider(config.name, config));
  }

  /**
   * Send email with retry logic and fallback
   * @param {Object} email - Email object
   * @param {Object} options - Send options
   * @returns {Promise<Object>} - Send result
   */
  async sendEmail(email, options = {}) {
    // Validate email
    this.validateEmail(email);
    
    // Generate idempotency key
    const idempotencyKey = options.idempotencyKey || this.generateIdempotencyKey(email);
    
    // Check for duplicate
    if (this.isDuplicate(idempotencyKey)) {
      this.logger.warn('Duplicate email detected', { idempotencyKey });
      return this.sentEmails.get(idempotencyKey);
    }
    
    // Check rate limit
    if (!this.rateLimiter.isAllowed(email.from || 'default')) {
      const error = new Error('Rate limit exceeded');
      error.code = 'RATE_LIMIT_EXCEEDED';
      this.logger.warn('Rate limit exceeded', { email: email.to });
      throw error;
    }
    
    const startTime = Date.now();
    let lastError;
    
    // Try each provider with retry logic
    for (let providerIndex = 0; providerIndex < this.providers.length; providerIndex++) {
      const actualProviderIndex = (this.currentProviderIndex + providerIndex) % this.providers.length;
      const provider = this.providers[actualProviderIndex];
      const circuitBreaker = this.circuitBreakers.get(actualProviderIndex);
      
      this.logger.debug('Attempting provider', { 
        provider: provider.name, 
        attempt: providerIndex + 1 
      });
      
      try {
        const result = await this.sendWithRetry(email, provider, circuitBreaker, idempotencyKey);
        
        // Success - update provider preference and track email
        this.currentProviderIndex = actualProviderIndex;
        this.trackSentEmail(idempotencyKey, result);
        
        this.logger.info('Email sent successfully', {
          provider: provider.name,
          messageId: result.messageId,
          duration: Date.now() - startTime,
          to: email.to
        });
        
        return result;
      } catch (error) {
        lastError = error;
        this.logger.warn('Provider failed', {
          provider: provider.name,
          error: error.message,
          attempt: providerIndex + 1
        });
      }
    }
    
    // All providers failed
    this.logger.error('All providers failed', {
      email: email.to,
      duration: Date.now() - startTime,
      lastError: lastError.message
    });
    
    throw new Error(`Failed to send email after trying all providers: ${lastError.message}`);
  }

  /**
   * Send email through provider with retry logic
   * @param {Object} email - Email object
   * @param {MockEmailProvider} provider - Email provider
   * @param {CircuitBreaker} circuitBreaker - Circuit breaker
   * @param {string} idempotencyKey - Idempotency key
   * @returns {Promise<Object>} - Send result
   */
  async sendWithRetry(email, provider, circuitBreaker, idempotencyKey) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await circuitBreaker.execute(async () => {
          return await provider.sendEmail(email);
        });
      } catch (error) {
        this.logger.debug('Send attempt failed', {
          provider: provider.name,
          attempt,
          error: error.message
        });
        
        if (attempt === this.maxRetries) {
          throw error;
        }
        
        // Exponential backoff with jitter
        const delay = this.calculateDelay(attempt);
        await this.delay(delay);
      }
    }
  }

  /**
   * Calculate delay for exponential backoff
   * @param {number} attempt - Attempt number
   * @returns {number} - Delay in milliseconds
   */
  calculateDelay(attempt) {
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, this.maxDelay);
  }

  /**
   * Validate email object
   * @param {Object} email - Email to validate
   */
  validateEmail(email) {
    if (!email || typeof email !== 'object') {
      throw new Error('Email must be an object');
    }
    
    const required = ['to', 'subject', 'body'];
    for (const field of required) {
      if (!email[field]) {
        throw new Error(`Email ${field} is required`);
      }
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.to)) {
      throw new Error('Invalid email address format');
    }
  }

  /**
   * Generate idempotency key for email
   * @param {Object} email - Email object
   * @returns {string} - Idempotency key
   */
  generateIdempotencyKey(email) {
    const content = JSON.stringify({
      to: email.to,
      subject: email.subject,
      body: email.body,
      from: email.from
    });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if email is duplicate
   * @param {string} idempotencyKey - Idempotency key
   * @returns {boolean} - Whether email is duplicate
   */
  isDuplicate(idempotencyKey) {
    const record = this.sentEmails.get(idempotencyKey);
    if (!record) return false;
    
    // Check if record is still valid (not expired)
    if (Date.now() - record.timestamp > this.idempotencyTtl) {
      this.sentEmails.delete(idempotencyKey);
      return false;
    }
    
    return true;
  }

  /**
   * Track sent email for idempotency
   * @param {string} idempotencyKey - Idempotency key
   * @param {Object} result - Send result
   */
  trackSentEmail(idempotencyKey, result) {
    this.sentEmails.set(idempotencyKey, {
      ...result,
      timestamp: Date.now()
    });
  }

  /**
   * Get service status and statistics
   * @returns {Object} - Service status
   */
  getStatus() {
    const providerStats = this.providers.map((provider, index) => ({
      ...provider.getStats(),
      circuitBreaker: this.circuitBreakers.get(index).getState()
    }));
    
    return {
      providers: providerStats,
      currentProvider: this.currentProviderIndex,
      rateLimiter: {
        remaining: this.rateLimiter.getRemaining()
      },
      sentEmails: this.sentEmails.size,
      uptime: process.uptime()
    };
  }

  /**
   * Delay utility
   * @param {number} ms - Delay in milliseconds
   * @returns {Promise} - Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup expired idempotency records
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.sentEmails.entries()) {
      if (now - record.timestamp > this.idempotencyTtl) {
        this.sentEmails.delete(key);
      }
    }
  }
}
