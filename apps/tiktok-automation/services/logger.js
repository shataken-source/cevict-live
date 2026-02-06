/**
 * Structured Logger
 * 
 * Logs to console and optionally to files
 */

const fs = require('fs');
const path = require('path');
const { resolveProjectPath } = require('../config/loader');

class Logger {
  constructor(logDir = null) {
    this.logDir = logDir ? resolveProjectPath(logDir) : null;
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (this.logDir && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFile() {
    if (!this.logDir) return null;
    const today = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `tiktok-automation-${today}.log`);
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  writeToFile(message) {
    const logFile = this.getLogFile();
    if (logFile) {
      try {
        fs.appendFileSync(logFile, message + '\n', 'utf8');
      } catch (error) {
        console.error('Failed to write to log file:', error.message);
      }
    }
  }

  info(message, data = null) {
    const formatted = this.formatMessage('INFO', message, data);
    console.log(formatted);
    this.writeToFile(formatted);
  }

  warn(message, data = null) {
    const formatted = this.formatMessage('WARN', message, data);
    console.warn(formatted);
    this.writeToFile(formatted);
  }

  error(message, error = null) {
    const formatted = this.formatMessage('ERROR', message, error ? { message: error.message, stack: error.stack } : null);
    console.error(formatted);
    this.writeToFile(formatted);
  }

  debug(message, data = null) {
    if (process.env.DEBUG === 'true') {
      const formatted = this.formatMessage('DEBUG', message, data);
      console.log(formatted);
      this.writeToFile(formatted);
    }
  }
}

module.exports = Logger;
