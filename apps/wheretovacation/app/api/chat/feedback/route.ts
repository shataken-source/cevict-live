import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, getSupabaseAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface FeedbackBody {
  conversation_id?: string
  helpful?: boolean
}

export async function POST(request: NextRequest) {
  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  let body: FeedbackBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const conversationId = (body.conversation_id || '').trim()
  if (!conversationId) {
    return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })
  }

  const helpful = !!body.helpful
  const user = await getServerUser()

  // Update conversation row
  const { error: convoError } = await admin
    .from('chatbot_conversations')
    .update({ was_helpful: helpful })
    .eq('id', conversationId)

  if (convoError) {
    console.error('[chat/feedback] update conversation error', convoError)
  }

  // Insert feedback record
  const { error: fbError } = await admin.from('chatbot_feedback').insert({
    conversation_id: conversationId,
    marked_helpful: helpful,
    reviewed_by: user?.id ?? null,
  })

  if (fbError) {
    console.error('[chat/feedback] insert feedback error', fbError)
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })
  }

  // Log event for personalization
  if (user?.id) {
    try {
      await admin
        .from('user_events')
        .insert({
          user_id: user.id,
          event_type: 'chat_feedback',
          payload: { conversation_id: conversationId, helpful },
        })
    } catch {
      // non-critical — ignore
    }
  }

  return NextResponse.json({ ok: true })
}

