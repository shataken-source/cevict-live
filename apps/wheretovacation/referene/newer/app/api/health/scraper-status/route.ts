// Scraper Health Check and Status Monitoring
// Monitors all scraper endpoints and reports their health

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface ScraperStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  lastRun: Date | null;
  lastRunAgeHours: number;
  successRate: number;
  averagePetsFound: number;
  errorMessage?: string;
}

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({
        overallHealth: 'unknown',
        scrapers: [],
        timestamp: new Date().toISOString(),
        error: 'Database not configured'
      });
    }

    const scrapers = [
      { name: 'facebook', table: 'scraper_logs', typeColumn: 'source' },
      { name: 'autonomous-discovery', table: 'scraper_logs', typeColumn: 'source' },
      { name: 'shelter-scraper', table: 'scraper_logs', typeColumn: 'source' },
    ];

    const statuses: ScraperStatus[] = [];

    for (const scraper of scrapers) {
      try {
        // Get recent runs (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: logs, error } = await supabase
          .from(scraper.table)
          .select('*')
          .eq(scraper.typeColumn, scraper.name)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          // Table might not exist
          statuses.push({
            name: scraper.name,
            status: 'unknown',
            lastRun: null,
            lastRunAgeHours: Infinity,
            successRate: 0,
            averagePetsFound: 0,
            errorMessage: 'Logs table not found',
          });
          continue;
        }

        if (!logs || logs.length === 0) {
          statuses.push({
            name: scraper.name,
            status: 'warning',
            lastRun: null,
            lastRunAgeHours: Infinity,
            successRate: 0,
            averagePetsFound: 0,
            errorMessage: 'No recent runs found',
          });
          continue;
        }

        const lastRun = new Date(logs[0].created_at);
        const lastRunAgeHours = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);

        // Calculate success rate
        const successful = logs.filter(l => l.status === 'success' || l.status === 'completed').length;
        const successRate = (successful / logs.length) * 100;

        // Calculate average pets found
        const petsFound = logs
          .map(l => l.pets_found || l.count || 0)
          .filter(n => typeof n === 'number');
        const averagePetsFound = petsFound.length > 0
          ? petsFound.reduce((a, b) => a + b, 0) / petsFound.length
          : 0;

        // Determine status
        let status: ScraperStatus['status'] = 'healthy';
        let errorMessage: string | undefined;

        if (lastRunAgeHours > 48) {
          status = 'error';
          errorMessage = `Last run was ${Math.round(lastRunAgeHours)} hours ago`;
        } else if (lastRunAgeHours > 24) {
          status = 'warning';
          errorMessage = `Last run was ${Math.round(lastRunAgeHours)} hours ago`;
        }

        if (successRate < 50) {
          status = status === 'healthy' ? 'warning' : 'error';
          errorMessage = `Low success rate: ${Math.round(successRate)}%`;
        }

        // Check for recent errors
        const recentErrors = logs
          .slice(0, 5)
          .filter(l => l.status === 'error' || l.status === 'failed');
        if (recentErrors.length >= 3) {
          status = 'error';
          errorMessage = `${recentErrors.length} recent failures`;
        }

        statuses.push({
          name: scraper.name,
          status,
          lastRun,
          lastRunAgeHours: Math.round(lastRunAgeHours * 100) / 100,
          successRate: Math.round(successRate * 100) / 100,
          averagePetsFound: Math.round(averagePetsFound * 100) / 100,
          errorMessage,
        });
      } catch (err: any) {
        statuses.push({
          name: scraper.name,
          status: 'error',
          lastRun: null,
          lastRunAgeHours: Infinity,
          successRate: 0,
          averagePetsFound: 0,
          errorMessage: err.message,
        });
      }
    }

    // Overall health
    const healthyCount = statuses.filter(s => s.status === 'healthy').length;
    const overallHealth = healthyCount === statuses.length ? 'healthy' :
      healthyCount >= statuses.length / 2 ? 'warning' : 'error';

    return NextResponse.json({
      overallHealth,
      scrapers: statuses,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        overallHealth: 'error',
        error: `Error checking scraper status: ${error.message}`,
        scrapers: [],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

