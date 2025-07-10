#!/usr/bin/env node

/**
 * Test runner script for the email service
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTests() {
  console.log('🧪 Running Email Service Tests\n');
  
  const testFiles = [
    'tests/Logger.test.js',
    'tests/CircuitBreaker.test.js',
    'tests/RateLimiter.test.js',
    'tests/MockEmailProvider.test.js',
    'tests/EmailService.test.js',
    'tests/EmailQueue.test.js'
  ];
  
  for (const testFile of testFiles) {
    console.log(`\n📋 Running ${testFile}...`);
    
    try {
      await runTestFile(testFile);
      console.log(`✅ ${testFile} passed`);
    } catch (error) {
      console.error(`❌ ${testFile} failed:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('\n🎉 All tests passed!');
}

function runTestFile(testFile) {
  return new Promise((resolve, reject) => {
    const testProcess = spawn('node', ['--test', testFile], {
      cwd: join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    testProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(errorOutput || output));
      }
    });
  });
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}
