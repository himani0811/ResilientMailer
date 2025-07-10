import { EmailService } from './EmailService.js';
import { EmailQueue } from './EmailQueue.js';
import { Logger } from './Logger.js';
import { getConfig, getQueueConfig } from '../config/index.js';

/**
 * Main application demonstrating the email service capabilities
 */
class EmailServiceApp {
  constructor(environment = 'development') {
    this.logger = new Logger('info');
    this.environment = environment;
    
    // Initialize with environment-specific configuration
    const config = getConfig(environment);
    const queueConfig = getQueueConfig(environment);
    
    this.emailService = new EmailService(config);
    this.emailQueue = new EmailQueue({
      emailServiceOptions: config,
      ...queueConfig
    });
    
    this.logger.info('Email Service App initialized', {
      environment,
      providers: config.providers?.length || 2,
      rateLimit: config.rateLimit
    });
  }

  /**
   * Run comprehensive demo of all features
   */
  async runDemo() {
    this.logger.info('🚀 Starting Comprehensive Email Service Demo');
    
    try {
      await this.demoBasicSending();
      await this.demoIdempotency();
      await this.demoRateLimiting();
      await this.demoProviderFallback();
      await this.demoQueueSystem();
      await this.demoMonitoring();
      
      this.logger.info('✨ All demos completed successfully!');
    } catch (error) {
      this.logger.error('Demo failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Demo 1: Basic email sending
   */
  async demoBasicSending() {
    this.logger.info('=== Demo 1: Basic Email Sending ===');
    
    const email = {
      to: 'user@example.com',
      subject: 'Welcome to our service',
      body: 'Thank you for signing up! We\'re excited to have you on board.',
      from: 'welcome@company.com'
    };
    
    try {
      const result = await this.emailService.sendEmail(email);
      this.logger.info('✅ Email sent successfully', {
        messageId: result.messageId,
        provider: result.provider,
        to: email.to
      });
    } catch (error) {
      this.logger.error('❌ Failed to send email', { error: error.message });
    }
  }

  /**
   * Demo 2: Idempotency testing
   */
  async demoIdempotency() {
    this.logger.info('=== Demo 2: Idempotency Test ===');
    
    const email = {
      to: 'user@example.com',
      subject: 'Password Reset Request',
      body: 'Click here to reset your password: https://example.com/reset',
      from: 'security@company.com'
    };
    
    try {
      const result1 = await this.emailService.sendEmail(email);
      this.logger.info('First send completed', { messageId: result1.messageId });
      
      const result2 = await this.emailService.sendEmail(email);
      this.logger.info('Second send (duplicate check)', { messageId: result2.messageId });
      
      const isDuplicate = result1.messageId === result2.messageId;
      this.logger.info(`✅ Idempotency test: ${isDuplicate ? 'PASSED' : 'FAILED'}`, {
        duplicate: isDuplicate
      });
    } catch (error) {
      this.logger.error('❌ Idempotency test failed', { error: error.message });
    }
  }

  /**
   * Demo 3: Rate limiting
   */
  async demoRateLimiting() {
    this.logger.info('=== Demo 3: Rate Limiting Test ===');
    
    const testEmails = Array.from({ length: 15 }, (_, i) => ({
      to: `user${i}@example.com`,
      subject: `Test Email ${i + 1}`,
      body: `This is test email number ${i + 1}`,
      from: 'test@company.com'
    }));
    
    let successCount = 0;
    let rateLimitedCount = 0;
    let errorCount = 0;
    
    for (const email of testEmails) {
      try {
        await this.emailService.sendEmail(email);
        successCount++;
      } catch (error) {
        if (error.code === 'RATE_LIMIT_EXCEEDED') {
          rateLimitedCount++;
        } else {
          errorCount++;
        }
      }
    }
    
    this.logger.info('✅ Rate limiting results', {
      successful: successCount,
      rateLimited: rateLimitedCount,
      errors: errorCount,
      totalAttempts: testEmails.length
    });
  }

  /**
   * Demo 4: Provider fallback
   */
  async demoProviderFallback() {
    this.logger.info('=== Demo 4: Provider Fallback Test ===');
    
    // Simulate primary provider failure
    this.emailService.providers[0].setHealth(false);
    this.logger.info('Primary provider set to unhealthy');
    
    const email = {
      to: 'failover@example.com',
      subject: 'Provider Fallback Test',
      body: 'Testing automatic provider failover',
      from: 'test@company.com'
    };
    
    try {
      const result = await this.emailService.sendEmail(email);
      this.logger.info('✅ Fallback successful', {
        usedProvider: result.provider,
        messageId: result.messageId
      });
    } catch (error) {
      this.logger.error('❌ Fallback failed', { error: error.message });
    }
    
    // Restore provider health
    this.emailService.providers[0].setHealth(true);
    this.logger.info('Primary provider health restored');
  }

  /**
   * Demo 5: Queue system
   */
  async demoQueueSystem() {
    this.logger.info('=== Demo 5: Queue System Test ===');
    
    const queueEmails = [
      {
        email: {
          to: 'high-priority@example.com',
          subject: 'High Priority Email',
          body: 'This is a high priority message',
          from: 'urgent@company.com'
        },
        options: { priority: 10 }
      },
      {
        email: {
          to: 'normal@example.com',
          subject: 'Normal Priority Email',
          body: 'This is a normal priority message',
          from: 'info@company.com'
        },
        options: { priority: 5 }
      },
      {
        email: {
          to: 'low-priority@example.com',
          subject: 'Low Priority Email',
          body: 'This is a low priority message',
          from: 'newsletter@company.com'
        },
        options: { priority: 1 }
      }
    ];
    
    // Add emails to queue
    for (const { email, options } of queueEmails) {
      await this.emailQueue.addEmail(email, options);
    }
    
    this.logger.info('Added emails to queue', {
      queueSize: this.emailQueue.getStats().queueSize
    });
    
    // Process queue for a limited time
    const processingPromise = this.emailQueue.startProcessing();
    
    await new Promise(resolve => {
      setTimeout(() => {
        this.emailQueue.stopProcessing();
        const finalStats = this.emailQueue.getStats();
        this.logger.info('✅ Queue processing completed', finalStats);
        resolve();
      }, 8000);
    });
  }

  /**
   * Demo 6: Monitoring and status
   */
  async demoMonitoring() {
    this.logger.info('=== Demo 6: Monitoring & Status ===');
    
    const serviceStatus = this.emailService.getStatus();
    const queueStats = this.emailQueue.getStats();
    
    this.logger.info('📊 Service Status', {
      currentProvider: serviceStatus.providers[serviceStatus.currentProvider]?.name,
      totalProviders: serviceStatus.providers.length,
      sentEmails: serviceStatus.sentEmails,
      rateLimitRemaining: serviceStatus.rateLimiter.remaining,
      uptime: `${Math.floor(serviceStatus.uptime)}s`
    });
    
    this.logger.info('📬 Queue Statistics', {
      processed: queueStats.processed,
      failed: queueStats.failed,
      pending: queueStats.pending,
      queueSize: queueStats.queueSize
    });
    
    // Provider health check
    for (const [index, provider] of serviceStatus.providers.entries()) {
      this.logger.info(`Provider ${index + 1}: ${provider.name}`, {
        healthy: provider.isHealthy,
        failureRate: `${(provider.failureRate * 100).toFixed(1)}%`,
        circuitBreaker: provider.circuitBreaker.state,
        latency: `${provider.latency}ms`
      });
    }
  }

  /**
   * Send a single email with error handling
   */
  async sendEmail(email, options = {}) {
    try {
      const result = await this.emailService.sendEmail(email, options);
      this.logger.info('Email sent', {
        to: email.to,
        messageId: result.messageId,
        provider: result.provider
      });
      return result;
    } catch (error) {
      this.logger.error('Email failed', {
        to: email.to,
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }

  /**
   * Add email to queue
   */
  async queueEmail(email, options = {}) {
    const id = await this.emailQueue.addEmail(email, options);
    this.logger.info('Email queued', {
      id,
      to: email.to,
      priority: options.priority || 0
    });
    return id;
  }

  /**
   * Get comprehensive status
   */
  getStatus() {
    return {
      service: this.emailService.getStatus(),
      queue: this.emailQueue.getStats(),
      environment: this.environment,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Demo application entry point
 */
async function runDemo() {
  const environment = process.env.NODE_ENV || 'development';
  const app = new EmailServiceApp(environment);
  
  try {
    await app.runDemo();
  } catch (error) {
    console.error('Demo failed:', error.message);
    process.exit(1);
  }
}

// Export classes and functions
export { EmailServiceApp, runDemo };

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo().catch(console.error);
}
