/**
 * Rate limiter implementation using token bucket algorithm
 */
export class RateLimiter {
  constructor(options = {}) {
    this.limit = options.limit || 100; // requests per window
    this.window = options.window || 60000; // 1 minute
    this.tokens = this.limit;
    this.lastRefill = Date.now();
    this.requests = new Map(); // Track requests per identifier
  }

  /**
   * Check if request is allowed under rate limit
   * @param {string} identifier - Unique identifier for the requester
   * @returns {boolean} - Whether request is allowed
   */
  isAllowed(identifier = 'default') {
    const now = Date.now();
    this.refillTokens(now);

    const requestHistory = this.requests.get(identifier) || [];
    const windowStart = now - this.window;
    
    // Clean old requests
    const recentRequests = requestHistory.filter(time => time > windowStart);
    
    if (recentRequests.length >= this.limit) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }

  refillTokens(now) {
    const timePassed = now - this.lastRefill;
    if (timePassed >= this.window) {
      this.tokens = this.limit;
      this.lastRefill = now;
    }
  }

  /**
   * Get remaining capacity for identifier
   * @param {string} identifier - Unique identifier
   * @returns {number} - Remaining requests allowed
   */
  getRemaining(identifier = 'default') {
    const now = Date.now();
    const requestHistory = this.requests.get(identifier) || [];
    const windowStart = now - this.window;
    const recentRequests = requestHistory.filter(time => time > windowStart);
    
    return Math.max(0, this.limit - recentRequests.length);
  }

  /**
   * Reset rate limit for identifier
   * @param {string} identifier - Unique identifier to reset
   */
  reset(identifier = 'default') {
    this.requests.delete(identifier);
  }
}
