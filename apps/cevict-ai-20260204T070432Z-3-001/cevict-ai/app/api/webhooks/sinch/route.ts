import { NextRequest, NextResponse } from 'next/server'

/**
 * Sinch Inbound SMS Webhook Handler
 * =================================
 * Receives SMS replies and triggers Guardian Pulse check-in.
 * 
 * Endpoint: POST /api/webhooks/sinch
 * Configure this URL in your Sinch Dashboard.
 */

// Environment variables
const OWNER_NUMBER = process.env.MY_PERSONAL_NUMBER || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface SinchInboundSMS {
  // Standard fields
  from?: string
  to?: string
  body?: string
  // Alternative field names
  from_?: string
  text?: string
  message?: string
  // Metadata
  id?: string
  received_at?: string
  type?: string
}

export async function POST(request: NextRequest) {
  try {
    const payload: SinchInboundSMS = await request.json()
    
    console.log('[Sinch Webhook] Received:', JSON.stringify(payload))
    
    // Extract sender and message
    const sender = payload.from || payload.from_ || ''
    const body = (payload.body || payload.text || payload.message || '').trim().toUpperCase()
    
    // Log the incoming message
    await logWebhookEvent(payload, sender, body)
    
    // Verify sender is the owner
    if (sender !== OWNER_NUMBER) {
      console.log(`[Sinch Webhook] Unauthorized sender: ${sender}`)
      return NextResponse.json({
        success: false,
        message: 'Unauthorized sender'
      }, { status: 401 })
    }
    
    // Process commands
    if (body === 'GOTIT') {
      // Reset the Guardian timer
      const success = await updateCheckIn()
      
      if (success) {
        console.log('[Sinch Webhook] ✅ Check-in confirmed, timer reset')
        return NextResponse.json({
          success: true,
          action: 'check_in_reset',
          message: 'Timer reset successfully'
        })
      } else {
        return NextResponse.json({
          success: false,
          message: 'Failed to update check-in'
        }, { status: 500 })
      }
    }
    
    if (body === 'STATUS') {
      const status = await getGuardianStatus()
      
      return NextResponse.json({
        success: true,
        action: 'status_request',
        status
      })
    }
    
    // Unknown command
    return NextResponse.json({
      success: false,
      message: `Unknown command: ${body}. Reply GOTIT or STATUS.`
    })
    
  } catch (error) {
    console.error('[Sinch Webhook] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed'
    }, { status: 500 })
  }
}

// Health check for webhook
export async function GET() {
  return NextResponse.json({
    service: 'Guardian Pulse - Sinch Webhook',
    status: 'active',
    timestamp: new Date().toISOString(),
    commands: ['GOTIT', 'STATUS']
  })
}

/**
 * Updates the last check-in timestamp in Supabase
 */
async function updateCheckIn(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('[Guardian] Supabase not configured, using mock')
    return true
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/system_config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        config_key: 'guardian_last_checkin',
        value: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    })
    
    return response.ok
  } catch (error) {
    console.error('[Guardian] Failed to update check-in:', error)
    return false
  }
}

/**
 * Gets the current Guardian status
 */
async function getGuardianStatus(): Promise<object> {
  const now = new Date()
  let lastCheckin = now
  let hoursSinceCheckin = 0
  
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/system_config?config_key=eq.guardian_last_checkin&select=value`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          lastCheckin = new Date(data[0].value)
          hoursSinceCheckin = (now.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60)
        }
      }
    } catch (error) {
      console.error('[Guardian] Failed to get status:', error)
    }
  }
  
  const timeoutHours = 24
  const status = hoursSinceCheckin >= timeoutHours ? 'TRIGGERED' :
                 hoursSinceCheckin >= 12 ? 'WARNING' : 'ACTIVE'
  
  return {
    status,
    hours_since_checkin: Math.round(hoursSinceCheckin * 10) / 10,
    hours_remaining: Math.max(0, Math.round((timeoutHours - hoursSinceCheckin) * 10) / 10),
    last_checkin: lastCheckin.toISOString(),
    timeout_hours: timeoutHours
  }
}

/**
 * Logs webhook events to Supabase
 */
async function logWebhookEvent(payload: any, sender: string, body: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return
  
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/guardian_pulse_log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        event_type: 'webhook_received',
        timestamp: new Date().toISOString(),
        details: {
          sender,
          body,
          raw_payload: payload
        }
      })
    })
  } catch (error) {
    console.error('[Guardian] Failed to log event:', error)
  }
}

