/**
 * Health Check Endpoint
 * Returns health status of the application and dependencies
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPool } from '@/lib/connectionPool';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const health: {
    status: 'ok' | 'degraded' | 'down';
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    checks: {
      database: { status: 'ok' | 'error'; latency?: number; error?: string };
      storage: { status: 'ok' | 'error'; error?: string };
      memory: { status: 'ok' | 'warning'; usage: any };
    };
  } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: { status: 'ok' },
      storage: { status: 'ok' },
      memory: { status: 'ok', usage: process.memoryUsage() }
    }
  };

  // Check database
  try {
    const dbStart = Date.now();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      health.checks.database = {
        status: 'error',
        error: 'Database credentials not configured'
      };
      health.status = 'degraded';
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from('_health_check').select('1').limit(1);
      
      if (error && error.code !== '42P01') { // Table doesn't exist is OK
        health.checks.database = {
          status: 'error',
          latency: Date.now() - dbStart,
          error: error.message
        };
        health.status = 'degraded';
      } else {
        health.checks.database = {
          status: 'ok',
          latency: Date.now() - dbStart
        };
      }
    }
  } catch (error: any) {
    health.checks.database = {
      status: 'error',
      error: error.message
    };
    health.status = 'degraded';
  }

  // Check connection pool if available
  try {
    const pool = getPool();
    const poolHealth = await pool.healthCheck();
    if (!poolHealth.healthy) {
      health.status = 'degraded';
    }
  } catch (error) {
    // Pool not initialized is OK
  }

  // Check memory
  const memoryUsage = process.memoryUsage();
  const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  if (memoryPercent > 90) {
    health.checks.memory.status = 'warning';
    if (health.status === 'ok') health.status = 'degraded';
  }

  const responseTime = Date.now() - startTime;
  const statusCode = health.status === 'down' ? 503 : health.status === 'degraded' ? 200 : 200;

  return NextResponse.json(
    {
      ...health,
      responseTime
    },
    { status: statusCode }
  );
}












