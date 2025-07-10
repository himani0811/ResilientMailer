/**
 * Configuration file for the Email Service
 * 
 * This file contains example configurations that can be used
 * to customize the behavior of the email service.
 */

// Development configuration - more lenient settings for testing
export const developmentConfig = {
  maxRetries: 2,
  baseDelay: 500,
  maxDelay: 5000,
  rateLimit: 50,
  rateLimitWindow: 60000, // 1 minute
  logLevel: 'debug',
  idempotencyTtl: 1800000, // 30 minutes
  circuitBreakerThreshold: 3,
  circuitBreakerTimeout: 30000, // 30 seconds
  providers: [
    { name: 'DevProvider-A', failureRate: 0.1, latency: 100 },
    { name: 'DevProvider-B', failureRate: 0.15, latency: 150 }
  ]
};

// Production configuration - stricter settings for reliability
export const productionConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  rateLimit: 1000,
  rateLimitWindow: 60000, // 1 minute
  logLevel: 'info',
  idempotencyTtl: 3600000, // 1 hour
  circuitBreakerThreshold: 10,
  circuitBreakerTimeout: 120000, // 2 minutes
  providers: [
    { name: 'PrimaryProvider', failureRate: 0.05, latency: 200 },
    { name: 'SecondaryProvider', failureRate: 0.08, latency: 300 },
    { name: 'BackupProvider', failureRate: 0.03, latency: 500 }
  ]
};

// Testing configuration - optimized for fast test execution
export const testConfig = {
  maxRetries: 1,
  baseDelay: 10,
  maxDelay: 100,
  rateLimit: 10,
  rateLimitWindow: 1000, // 1 second
  logLevel: 'error', // Reduce noise in tests
  idempotencyTtl: 5000, // 5 seconds
  circuitBreakerThreshold: 2,
  circuitBreakerTimeout: 1000, // 1 second
  providers: [
    { name: 'TestProvider-A', failureRate: 0, latency: 10 },
    { name: 'TestProvider-B', failureRate: 0, latency: 10 }
  ]
};

// High-volume configuration - optimized for bulk sending
export const highVolumeConfig = {
  maxRetries: 3,
  baseDelay: 200,
  maxDelay: 10000,
  rateLimit: 5000,
  rateLimitWindow: 60000, // 1 minute
  logLevel: 'warn',
  idempotencyTtl: 1800000, // 30 minutes
  circuitBreakerThreshold: 20,
  circuitBreakerTimeout: 60000, // 1 minute
  providers: [
    { name: 'HighVolume-1', failureRate: 0.02, latency: 50 },
    { name: 'HighVolume-2', failureRate: 0.03, latency: 75 },
    { name: 'HighVolume-3', failureRate: 0.02, latency: 100 },
    { name: 'HighVolume-4', failureRate: 0.04, latency: 125 }
  ]
};

// Queue configuration examples
export const queueConfigs = {
  development: {
    processInterval: 2000,
    maxConcurrency: 3,
    retryAttempts: 2,
    logLevel: 'debug'
  },
  
  production: {
    processInterval: 1000,
    maxConcurrency: 10,
    retryAttempts: 5,
    logLevel: 'info'
  },
  
  highVolume: {
    processInterval: 500,
    maxConcurrency: 20,
    retryAttempts: 3,
    logLevel: 'warn'
  }
};

// Helper function to get configuration by environment
export function getConfig(environment = 'development') {
  const configs = {
    development: developmentConfig,
    production: productionConfig,
    test: testConfig,
    'high-volume': highVolumeConfig
  };
  
  return configs[environment] || developmentConfig;
}

// Helper function to get queue configuration by environment
export function getQueueConfig(environment = 'development') {
  return queueConfigs[environment] || queueConfigs.development;
}

// Email templates for common use cases
export const emailTemplates = {
  welcome: {
    subject: 'Welcome to {{serviceName}}!',
    body: `Dear {{userName}},

Welcome to {{serviceName}}! We're excited to have you on board.

Your account has been successfully created with the email: {{userEmail}}

Best regards,
The {{serviceName}} Team`
  },
  
  passwordReset: {
    subject: 'Password Reset Request',
    body: `Hello,

We received a request to reset your password. Click the link below to reset it:

{{resetLink}}

If you didn't request this, please ignore this email.

Best regards,
Security Team`
  },
  
  orderConfirmation: {
    subject: 'Order Confirmation - {{orderNumber}}',
    body: `Dear {{customerName}},

Thank you for your order! Here are the details:

Order Number: {{orderNumber}}
Total Amount: {{totalAmount}}
Estimated Delivery: {{deliveryDate}}

You can track your order at: {{trackingLink}}

Best regards,
Customer Service`
  }
};

// Rate limiting presets
export const rateLimitPresets = {
  conservative: { limit: 100, window: 60000 },   // 100 per minute
  moderate: { limit: 500, window: 60000 },       // 500 per minute
  aggressive: { limit: 2000, window: 60000 },    // 2000 per minute
  enterprise: { limit: 10000, window: 60000 }    // 10000 per minute
};

export default {
  developmentConfig,
  productionConfig,
  testConfig,
  highVolumeConfig,
  queueConfigs,
  getConfig,
  getQueueConfig,
  emailTemplates,
  rateLimitPresets
};
