/**
 * Simulation Queue Manager
 * Manages BullMQ queue for async simulation processing
 */

import { Queue } from 'bullmq';
import { SimulationInputSchema } from './schemas/simulation';

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
};

// Create simulation queue
export const simulationQueue = new Queue('simulation-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
});

/**
 * Add simulation job to queue
 */
export async function enqueueSimulation(
  gameId: string,
  iterations: number,
  customParams?: any,
  seed?: number
): Promise<{ jobId: string; status: 'queued' }> {
  // Basic validation (full validation happens in worker)
  if (!gameId || typeof gameId !== 'string') {
    throw new Error('gameId is required and must be a string');
  }

  if (!Number.isInteger(iterations) || iterations < 100 || iterations > 100000) {
    throw new Error('iterations must be an integer between 100 and 100,000');
  }

  // Add job to queue (worker will do full validation)
  const job = await simulationQueue.add(
    'simulate',
    {
      gameId,
      iterations,
      customParams,
      seed: seed || Math.floor(Math.random() * 1000000),
    },
    {
      jobId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    }
  );

  return {
    jobId: job.id!,
    status: 'queued' as const,
  };
}

/**
 * Get simulation job status
 */
export async function getSimulationStatus(jobId: string): Promise<{
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress?: number;
  result?: any;
  error?: string;
}> {
  const job = await simulationQueue.getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const state = await job.getState();

  return {
    status: state as any,
    progress: job.progress as number,
    result: job.returnvalue,
    error: job.failedReason,
  };
}

/**
 * Wait for simulation to complete (with timeout)
 */
export async function waitForSimulation(
  jobId: string,
  timeoutMs: number = 30000
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await getSimulationStatus(jobId);

    if (status.status === 'completed') {
      return status.result;
    }

    if (status.status === 'failed') {
      throw new Error(status.error || 'Simulation failed');
    }

    // Wait 500ms before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Simulation timeout after ${timeoutMs}ms`);
}

