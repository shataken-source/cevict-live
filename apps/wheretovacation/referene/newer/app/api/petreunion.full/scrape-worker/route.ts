import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Process a single scrape job
 */
async function processScrapeJob(job: any) {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  const { job_id, city, state, id } = job;

  console.log(`[SCRAPE WORKER] Processing job ${job_id} for ${city}, ${state}`);

  try {
    // Update status to processing
    await supabase
      .from('scrape_jobs')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', id);

    // Call the existing scrape endpoint
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://petreunion-final.vercel.app';
    const response = await fetch(`${baseUrl}/api/petreunion/scrape-unscanned-shelters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maxShelters: 10, // Limit for user requests
        maxPetsPerShelter: 20,
        city: city,
        state: state
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Update job with results
      await supabase
        .from('scrape_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: {
            success: true,
            sheltersScraped: data.sheltersScraped || 0,
            totalPetsFound: data.totalPetsFound || 0,
            totalPetsSaved: data.totalPetsSaved || 0,
            errors: data.errors || []
          },
          shelters_scraped: data.sheltersScraped || 0,
          pets_found: data.totalPetsFound || 0,
          pets_saved: data.totalPetsSaved || 0
        })
        .eq('id', id);

      console.log(`[SCRAPE WORKER] ✓ Job ${job_id} completed: ${data.totalPetsSaved || 0} pets saved`);
    } else {
      throw new Error(data.error || 'Scraping failed');
    }

  } catch (error: any) {
    console.error(`[SCRAPE WORKER] Error processing job ${job_id}:`, error);

    // Update job with error
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: error.message || 'Unknown error occurred'
      })
      .eq('id', id);
  }
}

/**
 * POST: Process a specific job (triggered by request-scrape endpoint)
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Validate jobId format
    if (!/^scrape_\d+_[a-z0-9]+$/.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      );
    }

    // Get the job (parameterized query)
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'queued')
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found or already processed' },
        { status: 404 }
      );
    }

    // Process the job asynchronously (don't block)
    processScrapeJob(job).catch(err => {
      console.error('[SCRAPE WORKER] Async processing error:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Job processing started'
    });

  } catch (error: any) {
    console.error('[SCRAPE WORKER] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process job' },
      { status: 500 }
    );
  }
}

/**
 * GET: Poll for queued jobs and process them
 * This can be called by a cron job or scheduled task
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get up to 3 queued jobs (process in small batches)
    const { data: jobs, error } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(3);

    if (error) {
      throw error;
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No queued jobs',
        processed: 0
      });
    }

    // Process jobs sequentially (to avoid overwhelming server)
    let processed = 0;
    for (const job of jobs) {
      try {
        await processScrapeJob(job);
        processed++;
        // Small delay between jobs
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`[SCRAPE WORKER] Failed to process job ${job.job_id}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} job(s)`,
      processed
    });

  } catch (error: any) {
    console.error('[SCRAPE WORKER] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process jobs' },
      { status: 500 }
    );
  }
}

