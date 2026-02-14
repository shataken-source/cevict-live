#!/usr/bin/env node

/**
 * Test Runner for Autonomous Operations
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const SoundPlayer = require('../notifications/sound-player');
const FrozenDetector = require('../monitoring/frozen-detector');

const execAsync = promisify(exec);

class TestRunner {
  constructor() {
    this.soundPlayer = new SoundPlayer({ enabled: true });
    this.frozenDetector = new FrozenDetector();
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log('[TEST] Running all tests...');
    this.frozenDetector.start();

    try {
      // Run build test
      await this.testBuild();
      
      // Run type check
      await this.testTypes();
      
      console.log('[TEST] All tests passed!');
      await this.soundPlayer.notifyFinished('All tests passed');
    } catch (error) {
      console.error('[TEST] Tests failed:', error.message);
      await this.soundPlayer.notifyError(error);
      throw error;
    } finally {
      this.frozenDetector.stop();
    }
  }

  /**
   * Test build
   */
  async testBuild() {
    console.log('[TEST] Testing build...');
    this.frozenDetector.ping();

    try {
      const { stdout, stderr } = await execAsync('pnpm run build', {
        cwd: path.join(__dirname, '../../..'),
        timeout: 300000,
        maxBuffer: 10 * 1024 * 1024
      });

      if (stderr && stderr.includes('error')) {
        throw new Error('Build has errors');
      }

      console.log('[TEST] Build test passed');
      return true;
    } catch (error) {
      console.error('[TEST] Build test failed:', error.message);
      throw error;
    }
  }

  /**
   * Test TypeScript types
   */
  async testTypes() {
    console.log('[TEST] Testing TypeScript types...');
    this.frozenDetector.ping();

    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
        cwd: path.join(__dirname, '../../..'),
        timeout: 60000
      });

      if (stderr && stderr.includes('error')) {
        throw new Error('TypeScript errors found');
      }

      console.log('[TEST] Type check passed');
      return true;
    } catch (error) {
      console.error('[TEST] Type check failed:', error.message);
      throw error;
    }
  }
}

// CLI
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAll().catch(error => {
    console.error('[TEST] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;












