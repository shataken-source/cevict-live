import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limiter'
import { addSecurityHeaders } from '@/lib/security-headers'

/**
 * POST /api/reactions
 * Add emoji reaction to a headline (Gen Z style)
 * Reactions: 🔥 (fire/hype), 🧢 (cap/fake), 🧐 (interesting), 🍿 (drama), 📈 (hype), 📉 (panic), 🎭 (satire)
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(`reactions:${ip}`, RATE_LIMITS.publicWrite)

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
    const { headlineId, reactionType } = body

    if (!headlineId || !reactionType) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'headlineId and reactionType are required',
      }, { status: 400 })
    }

    const validReactions = ['🔥', '🧢', '🧐', '🍿', '📈', '📉', '🎭']
    if (!validReactions.includes(reactionType)) {
      return NextResponse.json({
        error: 'Invalid reaction',
        message: `Reaction must be one of: ${validReactions.join(', ')}`,
      }, { status: 400 })
    }

    // Get IP address for duplicate prevention
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

    // Check if reaction already exists
    const { data: existing } = await supabase
      .from('reactions')
      .select('id')
      .eq('headline_id', headlineId)
      .eq('ip_address', ipAddress)
      .eq('reaction_type', reactionType)
      .single()

    if (existing) {
      // Remove reaction (toggle off)
      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('id', existing.id)

      if (deleteError) {
        return NextResponse.json({
          error: 'Failed to remove reaction',
          message: deleteError.message,
        }, { status: 500 })
      }

      // Get updated reaction counts
      const { data: reactions } = await supabase
        .from('reactions')
        .select('reaction_type')
        .eq('headline_id', headlineId)

      const reactionCounts = reactions?.reduce((acc, r) => {
        acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      return NextResponse.json({
        success: true,
        removed: true,
        reactionCounts,
      })
    }

    // Add reaction
    const { error: insertError } = await supabase
      .from('reactions')
      .insert({
        headline_id: headlineId,
        ip_address: ipAddress,
        reaction_type: reactionType,
      })

    if (insertError) {
      // If unique constraint violation, reaction already exists (race condition)
      if (insertError.code === '23505') {
        // Get current reactions
        const { data: reactions } = await supabase
          .from('reactions')
          .select('reaction_type')
          .eq('headline_id', headlineId)

        const reactionCounts = reactions?.reduce((acc, r) => {
          acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}

        return NextResponse.json({
          success: true,
          reactionCounts,
        })
      }

      return NextResponse.json({
        error: 'Failed to add reaction',
        message: insertError.message,
      }, { status: 500 })
    }

    // Get updated reaction counts
    const { data: reactions } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('headline_id', headlineId)

    const reactionCounts = reactions?.reduce((acc, r) => {
      acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const response = NextResponse.json({
      success: true,
      reactionCounts,
    })
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    return addSecurityHeaders(response)
  } catch (error: unknown) {
    console.error('[API] Error in reactions route:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const response = NextResponse.json({
      error: 'Internal server error',
      message: errorMessage,
    }, { status: 500 })
    return addSecurityHeaders(response)
  }
}

/**
 * GET /api/reactions?headlineId=...
 * Get reaction counts for a headline
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

    const { data: reactions, error } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('headline_id', headlineId)

    if (error) {
      console.error('[API] Error fetching reactions:', error)
      // Return empty counts instead of error - reactions are optional
      return NextResponse.json({
        reactionCounts: {},
        warning: error.message,
      }, { status: 200 })
    }

    const reactionCounts = reactions?.reduce((acc, r) => {
      acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const response = NextResponse.json({
      reactionCounts,
    })
    return addSecurityHeaders(response)
  } catch (error: unknown) {
    console.error('[API] Error fetching reactions:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const response = NextResponse.json({
      error: 'Internal server error',
      message: errorMessage,
    }, { status: 500 })
    return addSecurityHeaders(response)
  }
}
