import { Logger } from './src/Logger.js';

const logger = new Logger('debug');

// Test what gets logged
const originalLog = console.log;
let capturedArgs = [];
console.log = (...args) => {
  capturedArgs = args;
  originalLog('CAPTURED:', args);
};

logger.info('Test message', { key: 'value' });

console.log = originalLog;
console.log('Final captured args:', capturedArgs);
