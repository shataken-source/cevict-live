import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/reactions
 * Add emoji reaction to a headline (Gen Z style)
 * Reactions: 🔥 (fire/hype), 🧢 (cap/fake), 🧐 (interesting), 🍿 (drama), 📈 (hype), 📉 (panic), 🎭 (satire)
 */
export async function POST(request: NextRequest) {
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

    return NextResponse.json({
      success: true,
      reactionCounts,
    })
  } catch (error: any) {
    console.error('[API] Error in reactions route:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
    }, { status: 500 })
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

    if (!headlineId) {
      return NextResponse.json({
        error: 'Missing headlineId',
      }, { status: 400 })
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

    return NextResponse.json({
      reactionCounts,
    })
  } catch (error: any) {
    console.error('[API] Error fetching reactions:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
    }, { status: 500 })
  }
}
