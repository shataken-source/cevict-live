/**
 * Frozen Code Detection System
 * Monitors for infinite loops and frozen operations
 */

const fs = require('fs');
const path = require('path');

const HEARTBEAT_FILE = path.join(__dirname, '../monitoring/heartbeat.json');
const FROZEN_THRESHOLD = 30000; // 30 seconds
const HEARTBEAT_INTERVAL = 5000; // 5 seconds

class FrozenDetector {
  constructor(options = {}) {
    this.threshold = options.threshold || FROZEN_THRESHOLD;
    this.interval = options.interval || HEARTBEAT_INTERVAL;
    this.heartbeatTimer = null;
    this.lastHeartbeat = Date.now();
    this.isFrozen = false;
    this.onFrozenCallback = null;
  }

  /**
   * Start monitoring for frozen code
   */
  start() {
    this.updateHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.checkFrozen();
      this.updateHeartbeat();
    }, this.interval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Update heartbeat timestamp
   */
  updateHeartbeat() {
    this.lastHeartbeat = Date.now();
    try {
      fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify({
        timestamp: this.lastHeartbeat,
        isFrozen: this.isFrozen,
        threshold: this.threshold
      }, null, 2));
    } catch (error) {
      console.error('[FROZEN-DETECTOR] Failed to write heartbeat:', error.message);
    }
  }

  /**
   * Check if code is frozen
   */
  checkFrozen() {
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
    
    if (timeSinceLastHeartbeat > this.threshold && !this.isFrozen) {
      this.isFrozen = true;
      console.error(`[FROZEN-DETECTOR] Code appears frozen! No heartbeat for ${timeSinceLastHeartbeat}ms`);
      
      if (this.onFrozenCallback) {
        this.onFrozenCallback();
      }
      
      return true;
    } else if (timeSinceLastHeartbeat <= this.threshold && this.isFrozen) {
      this.isFrozen = false;
      console.log('[FROZEN-DETECTOR] Code resumed');
    }
    
    return this.isFrozen;
  }

  /**
   * Manually signal that code is still running
   */
  ping() {
    this.updateHeartbeat();
  }

  /**
   * Set callback for when frozen state is detected
   */
  onFrozen(callback) {
    this.onFrozenCallback = callback;
  }

  /**
   * Get current status
   */
  getStatus() {
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
    return {
      isFrozen: this.isFrozen,
      timeSinceLastHeartbeat,
      threshold: this.threshold,
      lastHeartbeat: this.lastHeartbeat
    };
  }
}

module.exports = FrozenDetector;












