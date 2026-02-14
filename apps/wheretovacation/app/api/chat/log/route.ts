import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, getSupabaseAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface LogBody {
  bot?: string
  platform?: string
  session_id?: string
  message?: string
  response?: string
  sentiment?: 'positive' | 'neutral' | 'negative' | null
  confidence_score?: number | null
  escalated?: boolean
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  const admin = getSupabaseAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  let body: LogBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const user = await getServerUser()

  const sessionId = String(body.session_id || '').trim()
  const message = String(body.message || '').trim()
  const response = String(body.response || '').trim()
  const bot = (body.bot || 'finn').trim()
  const platform = (body.platform || 'wtv').trim()

  if (!sessionId || !message || !response) {
    return NextResponse.json({ error: 'session_id, message, and response are required' }, { status: 400 })
  }

  const sentiment =
    body.sentiment && ['positive', 'neutral', 'negative'].includes(body.sentiment)
      ? body.sentiment
      : null

  const confidence = typeof body.confidence_score === 'number' ? body.confidence_score : null
  const escalated = !!body.escalated
  const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {}

  const { error } = await admin.from('chatbot_conversations').insert({
    user_id: user?.id ?? null,
    platform,
    bot,
    session_id: sessionId,
    message,
    response,
    sentiment,
    confidence_score: confidence,
    escalated,
    metadata,
  })

  if (error) {
    console.error('[chat/log] insert error', error)
    return NextResponse.json({ error: 'Failed to log chat' }, { status: 500 })
  }

  // Also log a lightweight user_event for personalization
  if (user?.id) {
    await admin
      .from('user_events')
      .insert({
        user_id: user.id,
        event_type: 'chat_conversation',
        payload: {
          platform,
          bot,
          session_id: sessionId,
          sentiment,
          escalated,
        },
      })
      .catch(() => {
        // best-effort, ignore failures
      })
  }

  return NextResponse.json({ ok: true })
}

