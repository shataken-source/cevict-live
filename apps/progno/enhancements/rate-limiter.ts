// Simple rate limiter (bottleneck replacement)
// To use bottleneck: npm install bottleneck

interface SimpleLimiter {
  schedule: <T>(fn: () => Promise<T>) => Promise<T>;
}

function createSimpleLimiter(options: {
  minTime?: number;
  maxConcurrent?: number;
}): SimpleLimiter {
  const { minTime = 100, maxConcurrent = 5 } = options;
  let lastRun = 0;
  let running = 0;
  const queue: Array<() => void> = [];

  function processQueue() {
    while (running < maxConcurrent && queue.length > 0) {
      const next = queue.shift();
      if (next) next();
    }
  }

  return {
    schedule: async <T>(fn: () => Promise<T>): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const run = async () => {
          const now = Date.now();
          const wait = Math.max(0, lastRun + minTime - now);
          
          if (wait > 0) {
            await new Promise(r => setTimeout(r, wait));
          }
          
          running++;
          lastRun = Date.now();
          
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            running--;
            processQueue();
          }
        };

        if (running < maxConcurrent) {
          run();
        } else {
          queue.push(() => run());
        }
      });
    }
  };
}

export const scoutLimiter = createSimpleLimiter({
  minTime: 100,
  maxConcurrent: 5,
});

export async function withRateLimit<T>(
  fn: () => Promise<T>,
  limiter: SimpleLimiter = scoutLimiter
): Promise<T> {
  return limiter.schedule(() => fn());
}
