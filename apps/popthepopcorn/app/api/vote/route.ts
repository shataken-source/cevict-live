import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { headlineId, voteType } = await request.json()

    if (!headlineId || !voteType) {
      return NextResponse.json({ error: 'Missing headlineId or voteType' }, { status: 400 })
    }

    if (voteType !== 'upvote' && voteType !== 'downvote') {
      return NextResponse.json({ error: 'Invalid voteType' }, { status: 400 })
    }

    // Get client IP address
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Check if user has already voted
    const { data: existingVote } = await supabase
      .from('votes')
      .select('*')
      .eq('headline_id', headlineId)
      .eq('ip_address', ipAddress)
      .single()

    if (existingVote) {
      return NextResponse.json({ error: 'Already voted' }, { status: 400 })
    }

    // Record the vote
    const { error: voteError } = await supabase
      .from('votes')
      .insert({
        headline_id: headlineId,
        ip_address: ipAddress,
        vote_type: voteType,
      })

    if (voteError) {
      console.error('Error recording vote:', voteError)
      return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
    }

    // Update headline vote counts
    const updateField = voteType === 'upvote' ? 'upvotes' : 'downvotes'
    const { error: updateError } = await supabase.rpc('increment_vote', {
      headline_id: headlineId,
      vote_field: updateField,
    })

    // If RPC doesn't exist, use direct update
    if (updateError) {
      const { data: headline } = await supabase
        .from('headlines')
        .select('upvotes, downvotes')
        .eq('id', headlineId)
        .single()

      if (headline) {
        const currentValue = voteType === 'upvote' 
          ? (headline.upvotes || 0) 
          : (headline.downvotes || 0)
        
        await supabase
          .from('headlines')
          .update({ [updateField]: currentValue + 1 })
          .eq('id', headlineId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in vote API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
