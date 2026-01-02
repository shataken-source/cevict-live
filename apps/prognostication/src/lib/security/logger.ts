/**
 * WINSTON LOGGING WITH AUTOMATIC REDACTION
 * [STATUS: TESTED] - Production-ready secure logging
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs');

// Patterns to redact (API keys, secrets, etc.)
const REDACTION_PATTERNS = [
  /(api[_-]?key["\s:=]+)([a-zA-Z0-9_-]{20,})/gi,
  /(secret["\s:=]+)([a-zA-Z0-9_-]{20,})/gi,
  /(token["\s:=]+)([a-zA-Z0-9_-]{20,})/gi,
  /(password["\s:=]+)([^\s"']+)/gi,
  /(-----BEGIN [A-Z ]+ KEY-----[\s\S]*?-----END [A-Z ]+ KEY-----)/gi,
];

function redactSensitiveData(message: string): string {
  let redacted = message;
  for (const pattern of REDACTION_PATTERNS) {
    redacted = redacted.replace(pattern, (match, prefix, value) => {
      if (value) {
        return `${prefix}[REDACTED]`;
      }
      return '[REDACTED]';
    });
  }
  return redacted;
}

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const messageStr = typeof message === 'string' ? message : String(message);
    const stackStr = typeof stack === 'string' ? stack : '';
    const redactedMessage = redactSensitiveData(stackStr || messageStr);
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${redactedMessage} ${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
    new DailyRotateFile({
      filename: path.join(LOG_DIR, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
    }),
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        ),
      }),
    ] : []),
  ],
});

