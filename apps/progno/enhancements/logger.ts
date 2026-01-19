// Simple console-based logger (winston replacement)
// To use winston: npm install winston

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'];
const currentLevelIndex = LOG_LEVELS.indexOf(LOG_LEVEL);

function shouldLog(level: string): boolean {
  return LOG_LEVELS.indexOf(level) <= currentLevelIndex;
}

function formatMessage(level: string, message: string): string {
  return `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`;
}

export const logger = {
  error: (message: string) => {
    if (shouldLog('error')) console.error(formatMessage('error', message));
  },
  warn: (message: string) => {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message));
  },
  info: (message: string) => {
    if (shouldLog('info')) console.log(formatMessage('info', message));
  },
  debug: (message: string) => {
    if (shouldLog('debug')) console.log(formatMessage('debug', message));
  },
};

export function withLogging<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  functionName: string
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    logger.info(`[${functionName}] Starting`);
    
    try {
      const result = await fn(...args);
      logger.info(`[${functionName}] Success - ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      logger.error(`[${functionName}] Failed - ${error}`);
      throw error;
    }
  }) as T;
}
