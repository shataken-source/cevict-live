/**
 * Simulation Worker
 * Processes heavy Monte Carlo simulations in background using BullMQ
 * Prevents long-running request timeouts
 */

import { Worker, Job } from 'bullmq';
import { SimulationInputSchema, validateSimulationInput } from '../app/lib/schemas/simulation';
import { SimulationEngine, SimulationResult } from '../app/lib/simulation-engine';

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
};

// Maximum simulation time (30 seconds kill switch)
const MAX_SIMULATION_TIME_MS = 30000;

/**
 * Run Monte Carlo logic with timeout protection
 */
async function runMonteCarloLogic(input: ReturnType<typeof validateSimulationInput>) {
  const startTime = Date.now();

  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Simulation exceeded maximum time limit of ${MAX_SIMULATION_TIME_MS}ms`));
    }, MAX_SIMULATION_TIME_MS);
  });

  // Create simulation promise
  const simulationPromise = (async () => {
    const engine = new SimulationEngine();
    const result = await engine.simulate(
      input.gameId,
      input.iterations,
      undefined, // customParams
      input.seed
    );
    return result;
  })();

  // Race between simulation and timeout
  return Promise.race([simulationPromise, timeoutPromise]) as Promise<SimulationResult & { seed: number }>;
}

/**
 * Simulation Worker
 * Processes simulation jobs from the queue
 */
const simulationWorker = new Worker(
  'simulation-queue',
  async (job: Job) => {
    const jobId = job.id;
    console.log(`[Simulation Worker] Processing job ${jobId}...`);

    try {
      // Validate input
      await job.updateProgress(5);
      const validatedData = validateSimulationInput(job.data);

      // Progress tracking
      await job.updateProgress(10);

      // Run simulation with timeout protection
      const results = await runMonteCarloLogic(validatedData);

      await job.updateProgress(100);

      console.log(`[Simulation Worker] Job ${jobId} completed successfully`);

      // Return results (stored in Redis for API to fetch)
      return {
        ...results,
        jobId,
        processedAt: new Date().toISOString(),
        iterations: validatedData.iterations,
        seed: validatedData.seed,
      };
    } catch (error: any) {
      console.error(`[Simulation Worker] Job ${jobId} failed:`, error.message);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.SIMULATION_WORKER_CONCURRENCY || '5'), // Run 5 simulations at once
    limiter: {
      max: 10, // Max 10 jobs per interval
      duration: 60000, // Per minute
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours for debugging
    },
  }
);

// Worker event handlers
simulationWorker.on('completed', (job) => {
  console.log(`[Simulation Worker] Job ${job.id} completed`);
});

simulationWorker.on('failed', (job, err) => {
  console.error(`[Simulation Worker] Job ${job?.id} failed:`, err.message);
});

simulationWorker.on('error', (err) => {
  console.error('[Simulation Worker] Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Simulation Worker] SIGTERM received, closing worker...');
  await simulationWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Simulation Worker] SIGINT received, closing worker...');
  await simulationWorker.close();
  process.exit(0);
});

export default simulationWorker;

