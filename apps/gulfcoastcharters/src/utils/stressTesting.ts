import { supabase } from '@/lib/supabase';

export interface StressTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errors: Array<{ message: string; count: number }>;
}

export async function runStressTest(
  concurrentUsers: number = 100,
  requestsPerUser: number = 10
): Promise<StressTestResult> {
  const startTime = Date.now();
  const responseTimes: number[] = [];
  const errors: Map<string, number> = new Map();
  let successCount = 0;
  let failCount = 0;

  const makeRequest = async () => {
    const reqStart = Date.now();
    try {
      const { error } = await supabase.from('charters').select('*').limit(10);
      const reqTime = Date.now() - reqStart;
      responseTimes.push(reqTime);
      if (error) throw error;
      successCount++;
    } catch (error: unknown) {

      failCount++;
      const msg = (error as Error)?.message || 'Unknown error';

      errors.set(msg, (errors.get(msg) || 0) + 1);
    }
  };

  const userPromises = Array.from({ length: concurrentUsers }, async () => {
    const requests = Array.from({ length: requestsPerUser }, () => makeRequest());
    await Promise.all(requests);
  });

  await Promise.all(userPromises);

  const totalTime = (Date.now() - startTime) / 1000;
  const totalRequests = concurrentUsers * requestsPerUser;

  return {
    totalRequests,
    successfulRequests: successCount,
    failedRequests: failCount,
    averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    minResponseTime: Math.min(...responseTimes),
    maxResponseTime: Math.max(...responseTimes),
    requestsPerSecond: totalRequests / totalTime,
    errors: Array.from(errors.entries()).map(([message, count]) => ({ message, count }))
  };
}
