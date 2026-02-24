import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Rate limits (strict)
const RATE_LIMITS = {
  anonymous: { perDay: 1, perHour: 1 },
  registered: { perDay: 3, perHour: 2 },
  verified: { perDay: 10, perHour: 5 }
};

// Valid US states (prevent injection via state field)
const VALID_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
];

/**
 * Sanitize and validate input
 */
function sanitizeInput(input: string): string {
  // Remove any SQL-like patterns, HTML tags, and dangerous characters
  return input
    .trim()
    .replace(/[<>'"\\;]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100); // Max length
}

function validateCity(city: string): boolean {
  // City should be 2-50 characters, alphanumeric with spaces, hyphens, apostrophes
  const cityRegex = /^[a-zA-Z0-9\s\-']{2,50}$/;
  return cityRegex.test(city);
}

function validateState(state: string): boolean {
  return VALID_STATES.includes(state);
}

/**
 * Get client IP address (for rate limiting)
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIP || 'unknown';
}

/**
 * Check rate limits for user/IP
 */
async function checkRateLimit(
  userId: string | null,
  userIP: string,
  city: string,
  state: string
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  if (!supabase) {
    return { allowed: false, reason: 'Database not configured' };
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Determine user tier
  const tier = userId ? 'registered' : 'anonymous';
  const limits = RATE_LIMITS[tier];

  // Check IP-based limits (prevents abuse)
  const { count: ipHourlyCount } = await supabase
    .from('scrape_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_ip', userIP)
    .gte('created_at', oneHourAgo.toISOString());

  if (ipHourlyCount && ipHourlyCount >= 5) {
    return { allowed: false, reason: 'IP rate limit exceeded (5 scrapes per hour)' };
  }

  // Check user-based limits
  if (userId) {
    const { count: userDailyCount } = await supabase
      .from('scrape_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneDayAgo.toISOString());

    if (userDailyCount && userDailyCount >= limits.perDay) {
      return { 
        allowed: false, 
        reason: `Daily limit reached (${limits.perDay} scrapes per day)`,
        remaining: 0
      };
    }

    const { count: userHourlyCount } = await supabase
      .from('scrape_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo.toISOString());

    if (userHourlyCount && userHourlyCount >= limits.perHour) {
      return { 
        allowed: false, 
        reason: `Hourly limit reached (${limits.perHour} scrapes per hour)`,
        remaining: limits.perHour - (userHourlyCount || 0)
      };
    }
  } else {
    // Anonymous user limits
    const { count: anonDailyCount } = await supabase
      .from('scrape_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('user_ip', userIP)
      .is('user_id', null)
      .gte('created_at', oneDayAgo.toISOString());

    if (anonDailyCount && anonDailyCount >= limits.perDay) {
      return { 
        allowed: false, 
        reason: `Daily limit reached (${limits.perDay} scrape per day for anonymous users)`,
        remaining: 0
      };
    }
  }

  // Check geographic deduplication (same city/state scraped in last 24 hours)
  const { data: recentScrape } = await supabase
    .from('scrape_jobs')
    .select('id, job_id, created_at, result')
    .eq('city', city)
    .eq('state', state)
    .in('status', ['completed', 'processing'])
    .gte('created_at', oneDayAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentScrape) {
    const hoursAgo = Math.round((now.getTime() - new Date(recentScrape.created_at).getTime()) / (1000 * 60 * 60));
    return {
      allowed: false,
      reason: `This area was scraped ${hoursAgo} hour(s) ago. Please try again later.`,
      remaining: 0
    };
  }

  return { allowed: true };
}

/**
 * Generate unique job ID
 */
function generateJobId(): string {
  return `scrape_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * POST: Request a scrape
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
    const { city, state, userId } = body;

    // Validate required fields
    if (!city || !state) {
      return NextResponse.json(
        { error: 'City and state are required' },
        { status: 400 }
      );
    }

    // Sanitize inputs (prevent injection)
    const sanitizedCity = sanitizeInput(city);
    const sanitizedState = sanitizeInput(state);

    // Validate inputs
    if (!validateCity(sanitizedCity)) {
      return NextResponse.json(
        { error: 'Invalid city format. City must be 2-50 characters, alphanumeric with spaces, hyphens, or apostrophes only.' },
        { status: 400 }
      );
    }

    if (!validateState(sanitizedState)) {
      return NextResponse.json(
        { error: 'Invalid state. Please select a valid US state.' },
        { status: 400 }
      );
    }

    // Get client IP
    const userIP = getClientIP(request);

    // Validate userId if provided (must be UUID format)
    let validatedUserId: string | null = null;
    if (userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return NextResponse.json(
          { error: 'Invalid user ID format' },
          { status: 400 }
        );
      }
      validatedUserId = userId;
    }

    // Check rate limits
    const rateLimitCheck = await checkRateLimit(validatedUserId, userIP, sanitizedCity, sanitizedState);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: rateLimitCheck.reason || 'Rate limit exceeded',
          remaining: rateLimitCheck.remaining
        },
        { status: 429 }
      );
    }

    // Generate unique job ID
    const jobId = generateJobId();

    // Create job in database (using parameterized query via Supabase - no SQL injection)
    const { data: job, error: insertError } = await supabase
      .from('scrape_jobs')
      .insert({
        user_id: validatedUserId,
        user_ip: userIP,
        city: sanitizedCity,
        state: sanitizedState,
        status: 'queued',
        job_id: jobId
      })
      .select()
      .single();

    if (insertError) {
      console.error('[REQUEST SCRAPE] Database error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create scrape job' },
        { status: 500 }
      );
    }

    // Trigger background worker (non-blocking)
    // In production, you might want to use a proper job queue (BullMQ, etc.)
    // For now, we'll trigger it asynchronously
    fetch(`${request.nextUrl.origin}/api/petreunion/scrape-worker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId })
    }).catch(err => {
      console.error('[REQUEST SCRAPE] Failed to trigger worker:', err);
      // Don't fail the request - worker will pick it up on next poll
    });

    return NextResponse.json({
      success: true,
      jobId: job.job_id,
      status: 'queued',
      message: 'Your scrape request has been queued!',
      estimatedTime: '2-5 minutes',
      city: sanitizedCity,
      state: sanitizedState
    });

  } catch (error: any) {
    console.error('[REQUEST SCRAPE] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to request scrape' },
      { status: 500 }
    );
  }
}

/**
 * GET: Check job status
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Validate jobId format (prevent injection)
    if (!/^scrape_\d+_[a-z0-9]+$/.test(jobId)) {
      return NextResponse.json(
        { error: 'Invalid job ID format' },
        { status: 400 }
      );
    }

    // Get job status (parameterized query - no SQL injection)
    const { data: job, error } = await supabase
      .from('scrape_jobs')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        jobId: job.job_id,
        status: job.status,
        city: job.city,
        state: job.state,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        result: job.result,
        error: job.error,
        sheltersScraped: job.shelters_scraped,
        petsFound: job.pets_found,
        petsSaved: job.pets_saved
      }
    });

  } catch (error: any) {
    console.error('[REQUEST SCRAPE] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get job status' },
      { status: 500 }
    );
  }
}

