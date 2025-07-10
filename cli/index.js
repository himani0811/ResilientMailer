#!/usr/bin/env node

/**
 * Command Line Interface for the Email Service
 */

import { EmailService } from '../src/EmailService.js';
import { EmailQueue } from '../src/EmailQueue.js';
import { getConfig, getQueueConfig } from '../config/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

// CLI Commands
const commands = {
  send: sendEmail,
  queue: queueEmail,
  status: showStatus,
  test: runTest,
  help: showHelp
};

async function main() {
  if (!command || !commands[command]) {
    showHelp();
    process.exit(1);
  }
  
  try {
    await commands[command](args.slice(1));
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function sendEmail(args) {
  const options = parseArgs(args);
  
  if (!options.to || !options.subject || !options.body) {
    console.error('❌ Required: --to, --subject, --body');
    process.exit(1);
  }
  
  const config = getConfig(options.env || 'development');
  const emailService = new EmailService(config);
  
  const email = {
    to: options.to,
    subject: options.subject,
    body: options.body,
    from: options.from || 'noreply@example.com'
  };
  
  console.log('📧 Sending email...');
  console.log(`   To: ${email.to}`);
  console.log(`   Subject: ${email.subject}`);
  
  const result = await emailService.sendEmail(email);
  
  console.log('✅ Email sent successfully!');
  console.log(`   Message ID: ${result.messageId}`);
  console.log(`   Provider: ${result.provider}`);
  console.log(`   Timestamp: ${result.timestamp}`);
}

async function queueEmail(args) {
  const options = parseArgs(args);
  
  if (!options.to || !options.subject || !options.body) {
    console.error('❌ Required: --to, --subject, --body');
    process.exit(1);
  }
  
  const config = getConfig(options.env || 'development');
  const queueConfig = getQueueConfig(options.env || 'development');
  
  const queue = new EmailQueue({
    emailServiceOptions: config,
    ...queueConfig
  });
  
  const email = {
    to: options.to,
    subject: options.subject,
    body: options.body,
    from: options.from || 'noreply@example.com'
  };
  
  const queueOptions = {
    priority: parseInt(options.priority) || 0,
    maxAttempts: parseInt(options.maxAttempts) || 3
  };
  
  console.log('📬 Adding email to queue...');
  
  const id = await queue.addEmail(email, queueOptions);
  
  console.log(`✅ Email queued with ID: ${id}`);
  console.log(`   Priority: ${queueOptions.priority}`);
  console.log(`   Max Attempts: ${queueOptions.maxAttempts}`);
  
  if (options.process) {
    console.log('🔄 Starting queue processing...');
    
    // Process for a limited time
    const processingPromise = queue.startProcessing();
    
    setTimeout(() => {
      queue.stopProcessing();
      console.log('⏹️  Queue processing stopped');
      console.log('📊 Final stats:', queue.getStats());
    }, parseInt(options.timeout) || 10000);
    
    await processingPromise;
  }
}

async function showStatus(args) {
  const options = parseArgs(args);
  const config = getConfig(options.env || 'development');
  const emailService = new EmailService(config);
  
  console.log('📊 Email Service Status\n');
  
  const status = emailService.getStatus();
  
  console.log('🔧 Configuration:');
  console.log(`   Environment: ${options.env || 'development'}`);
  console.log(`   Max Retries: ${emailService.maxRetries}`);
  console.log(`   Rate Limit: ${emailService.rateLimiter.limit} per ${emailService.rateLimiter.window}ms`);
  
  console.log('\n📡 Providers:');
  status.providers.forEach((provider, index) => {
    const isCurrent = index === status.currentProvider;
    console.log(`   ${isCurrent ? '→' : ' '} ${provider.name}`);
    console.log(`     Health: ${provider.isHealthy ? '✅' : '❌'}`);
    console.log(`     Failure Rate: ${(provider.failureRate * 100).toFixed(1)}%`);
    console.log(`     Circuit Breaker: ${provider.circuitBreaker.state}`);
  });
  
  console.log('\n📈 Statistics:');
  console.log(`   Sent Emails: ${status.sentEmails}`);
  console.log(`   Rate Limit Remaining: ${status.rateLimiter.remaining}`);
  console.log(`   Uptime: ${Math.floor(status.uptime)}s`);
}

async function runTest(args) {
  const options = parseArgs(args);
  const config = getConfig('test');
  
  console.log('🧪 Running Email Service Test\n');
  
  const emailService = new EmailService(config);
  
  const testEmails = [
    {
      to: 'test1@example.com',
      subject: 'Test Email 1',
      body: 'This is a test email',
      from: 'test@example.com'
    },
    {
      to: 'test2@example.com',
      subject: 'Test Email 2',
      body: 'This is another test email',
      from: 'test@example.com'
    }
  ];
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const email of testEmails) {
    try {
      const result = await emailService.sendEmail(email);
      console.log(`✅ Sent to ${email.to} via ${result.provider}`);
      successCount++;
    } catch (error) {
      console.log(`❌ Failed to send to ${email.to}: ${error.message}`);
      failureCount++;
    }
  }
  
  console.log(`\n📊 Test Results:`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failures: ${failureCount}`);
  
  // Test idempotency
  console.log('\n🔄 Testing idempotency...');
  const result1 = await emailService.sendEmail(testEmails[0]);
  const result2 = await emailService.sendEmail(testEmails[0]);
  
  if (result1.messageId === result2.messageId) {
    console.log('✅ Idempotency test passed');
  } else {
    console.log('❌ Idempotency test failed');
  }
}

function showHelp() {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
  );
  
  console.log(`${packageJson.name} v${packageJson.version}`);
  console.log(packageJson.description);
  console.log();
  console.log('Usage: node cli/index.js <command> [options]');
  console.log();
  console.log('Commands:');
  console.log('  send     Send an email immediately');
  console.log('  queue    Add an email to the queue');
  console.log('  status   Show service status');
  console.log('  test     Run a quick test');
  console.log('  help     Show this help message');
  console.log();
  console.log('Send Options:');
  console.log('  --to <email>         Recipient email address');
  console.log('  --subject <subject>  Email subject');
  console.log('  --body <body>        Email body');
  console.log('  --from <email>       Sender email address');
  console.log('  --env <env>          Environment (development, production, test)');
  console.log();
  console.log('Queue Options:');
  console.log('  --priority <num>     Email priority (higher = sent first)');
  console.log('  --max-attempts <num> Maximum retry attempts');
  console.log('  --process            Start processing queue');
  console.log('  --timeout <ms>       Processing timeout (default: 10000)');
  console.log();
  console.log('Examples:');
  console.log('  node cli/index.js send --to user@example.com --subject "Hello" --body "Test message"');
  console.log('  node cli/index.js queue --to user@example.com --subject "Hello" --body "Test" --priority 5');
  console.log('  node cli/index.js status --env production');
  console.log('  node cli/index.js test');
}

function parseArgs(args) {
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];
    
    if (key && value) {
      options[key] = value;
    } else if (key) {
      options[key] = true;
    }
  }
  
  return options;
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main, commands };
