import { strict as assert } from 'assert';
import { test, describe } from 'node:test';
import { Logger } from '../src/Logger.js';

describe('Logger', () => {
  test('should create logger with default level', () => {
    const logger = new Logger();
    assert.equal(logger.level, 'info');
  });

  test('should create logger with custom level', () => {
    const logger = new Logger('debug');
    assert.equal(logger.level, 'debug');
  });

  test('should have correct log levels', () => {
    const logger = new Logger();
    assert.deepEqual(logger.levels, { error: 0, warn: 1, info: 2, debug: 3 });
  });

  test('should log messages correctly', () => {
    const logger = new Logger('debug');
    
    // Mock console.log to capture output
    const originalLog = console.log;
    let capturedArgs = [];
    console.log = (...args) => {
      capturedArgs = args;
    };
    
    logger.info('Test message', { key: 'value' });
    
    assert.ok(capturedArgs.length >= 2);
    assert.ok(capturedArgs[0].includes('INFO: Test message'));
    assert.ok(typeof capturedArgs[1] === 'object');
    assert.equal(capturedArgs[1].key, 'value');
    
    // Restore console.log
    console.log = originalLog;
  });

  test('should respect log level filtering', () => {
    const logger = new Logger('warn');
    
    const originalLog = console.log;
    let logCalled = false;
    console.log = () => { logCalled = true; };
    
    logger.debug('This should not be logged');
    assert.equal(logCalled, false);
    
    logger.warn('This should be logged');
    assert.equal(logCalled, true);
    
    console.log = originalLog;
  });
});
