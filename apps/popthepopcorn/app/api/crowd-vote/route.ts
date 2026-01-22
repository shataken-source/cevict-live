import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limiter'
import { addSecurityHeaders } from '@/lib/security-headers'

/**
 * POST /api/crowd-vote
 * Users vote on drama score (1-10) for crowd-sourced probability
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(`crowd-vote:${ip}`, RATE_LIMITS.publicWrite)

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: rateLimit.retryAfter,
      },
      { status: 429 }
    )
    response.headers.set('Retry-After', (rateLimit.retryAfter || 60).toString())
    response.headers.set('X-RateLimit-Limit', RATE_LIMITS.publicWrite.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString())
    return addSecurityHeaders(response)
  }

  try {
    const body = await request.json()
    const { headlineId, dramaScore } = body

    if (!headlineId || !dramaScore) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'headlineId and dramaScore are required',
      }, { status: 400 })
    }

    if (dramaScore < 1 || dramaScore > 10) {
      return NextResponse.json({
        error: 'Invalid drama score',
        message: 'dramaScore must be between 1 and 10',
      }, { status: 400 })
    }

    // Get IP address for duplicate prevention
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

    // Check if user already voted
    const { data: existing } = await supabase
      .from('crowd_drama_votes')
      .select('id, drama_score')
      .eq('headline_id', headlineId)
      .eq('ip_address', ipAddress)
      .single()

    if (existing) {
      // Update existing vote
      const { error: updateError } = await supabase
        .from('crowd_drama_votes')
        .update({ drama_score: dramaScore })
        .eq('id', existing.id)

      if (updateError) {
        return NextResponse.json({
          error: 'Failed to update vote',
          message: updateError.message,
        }, { status: 500 })
      }
    } else {
      // Insert new vote
      const { error: insertError } = await supabase
        .from('crowd_drama_votes')
        .insert({
          headline_id: headlineId,
          ip_address: ipAddress,
          drama_score: dramaScore,
        })

      if (insertError) {
        return NextResponse.json({
          error: 'Failed to add vote',
          message: insertError.message,
        }, { status: 500 })
      }
    }

    // Get updated crowd stats
    const { data: votes } = await supabase
      .from('crowd_drama_votes')
      .select('drama_score')
      .eq('headline_id', headlineId)

    const avgScore = votes && votes.length > 0
      ? votes.reduce((sum, v) => sum + v.drama_score, 0) / votes.length
      : dramaScore

    const response = NextResponse.json({
      success: true,
      crowdAverage: Math.round(avgScore * 10) / 10,
      voteCount: votes?.length || 1,
      userVote: dramaScore,
    })
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', RATE_LIMITS.publicWrite.maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString())
    
    return addSecurityHeaders(response)
  } catch (error: any) {
    console.error('[API] Error in crowd-vote route:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
    }, { status: 500 })
  }
}

/**
 * GET /api/crowd-vote?headlineId=...
 * Get crowd voting stats for a headline
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const headlineId = searchParams.get('headlineId')

    // Validate headlineId
    const { validateRequest, headlineIdSchema } = await import('@/lib/input-validation')
    const validation = validateRequest(headlineIdSchema, headlineId)
    
    if (!validation.success) {
      const response = NextResponse.json(
        {
          error: 'Validation failed',
          message: validation.error,
        },
        { status: 400 }
      )
      return addSecurityHeaders(response)
    }

    const { data: votes, error } = await supabase
      .from('crowd_drama_votes')
      .select('drama_score')
      .eq('headline_id', headlineId)

    if (error) {
      console.error('[API] Error fetching crowd votes:', error)
      // Return empty stats instead of error - votes are optional
      return NextResponse.json({
        crowdAverage: 0,
        voteCount: 0,
        votes: [],
        warning: error.message,
      }, { status: 200 })
    }

    const avgScore = votes && votes.length > 0
      ? votes.reduce((sum, v) => sum + v.drama_score, 0) / votes.length
      : 0

    const response = NextResponse.json({
      crowdAverage: Math.round(avgScore * 10) / 10,
      voteCount: votes?.length || 0,
      votes: votes || [],
    })
    return addSecurityHeaders(response)
  } catch (error: unknown) {
    console.error('[API] Error fetching crowd votes:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const response = NextResponse.json({
      error: 'Internal server error',
      message: errorMessage,
    }, { status: 500 })
    return addSecurityHeaders(response)
  }
}
