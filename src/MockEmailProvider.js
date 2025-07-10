import crypto from 'crypto';

/**
 * Mock email provider for testing purposes
 */
export class MockEmailProvider {
  constructor(name, options = {}) {
    this.name = name;
    this.failureRate = options.failureRate || 0.1; // 10% failure rate
    this.latency = options.latency || 100; // 100ms latency
    this.isHealthy = options.isHealthy !== false;
  }

  /**
   * Send email through this provider
   * @param {Object} email - Email object
   * @returns {Promise<Object>} - Send result
   */
  async sendEmail(email) {
    // Simulate network latency
    await this.delay(this.latency);

    // Simulate random failures
    if (!this.isHealthy || Math.random() < this.failureRate) {
      throw new Error(`${this.name} provider failed: Service temporarily unavailable`);
    }

    // Simulate successful send
    const messageId = this.generateMessageId();
    
    return {
      success: true,
      messageId,
      provider: this.name,
      timestamp: new Date().toISOString(),
      email: {
        to: email.to,
        subject: email.subject
      }
    };
  }

  /**
   * Check provider health
   * @returns {Promise<boolean>} - Health status
   */
  async checkHealth() {
    await this.delay(50);
    return this.isHealthy;
  }

  /**
   * Set provider health status
   * @param {boolean} healthy - Health status
   */
  setHealth(healthy) {
    this.isHealthy = healthy;
  }

  /**
   * Set failure rate for testing
   * @param {number} rate - Failure rate (0-1)
   */
  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * Generate unique message ID
   * @returns {string} - Unique message ID
   */
  generateMessageId() {
    return `${this.name}-${crypto.randomUUID()}`;
  }

  /**
   * Simulate network delay
   * @param {number} ms - Delay in milliseconds
   * @returns {Promise} - Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get provider statistics
   * @returns {Object} - Provider stats
   */
  getStats() {
    return {
      name: this.name,
      failureRate: this.failureRate,
      latency: this.latency,
      isHealthy: this.isHealthy
    };
  }
}
