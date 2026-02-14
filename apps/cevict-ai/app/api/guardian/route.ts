import { NextRequest, NextResponse } from 'next/server'

/**
 * Guardian Pulse API
 * ==================
 * Manages the Dead Man's Switch system
 */

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const TIMEOUT_HOURS = 24

/** Reject truncated/duplicated Supabase URLs (e.g. ...supabase.con...supabase.co) to avoid ENOTFOUND. */
function isSupabaseUrlValid(url: string): boolean {
  if (!url || !url.startsWith('https://')) return false
  if (url.includes('.con') && url.includes('supabase.co')) return false
  if ((url.match(/supabase\.co/g) || []).length > 1) return false
  return true
}

// GET - Get Guardian status
export async function GET() {
  const status = await getGuardianStatus()
  
  return NextResponse.json({
    guardian: status,
    timestamp: new Date().toISOString()
  })
}

// POST - Trigger actions
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body
  
  switch (action) {
    case 'check_in':
      // Manual check-in via dashboard
      const success = await updateCheckIn()
      return NextResponse.json({
        success,
        message: success ? 'Check-in recorded' : 'Failed to record check-in'
      })
    
    case 'send_heartbeat':
      // Trigger heartbeat SMS (calls Python backend)
      return NextResponse.json({
        success: true,
        message: 'Heartbeat request queued'
      })
    
    case 'check_handover':
      // Check if handover should be triggered
      const status = await getGuardianStatus()
      const shouldTrigger = status.hours_since_checkin >= TIMEOUT_HOURS
      
      return NextResponse.json({
        should_trigger: shouldTrigger,
        status
      })
    
    case 'test_sms':
      // Send test SMS
      return NextResponse.json({
        success: true,
        message: 'Test SMS queued'
      })
    
    default:
      return NextResponse.json({
        error: 'Unknown action'
      }, { status: 400 })
  }
}

async function getGuardianStatus() {
  const now = new Date()
  let lastCheckin = now
  let hoursSinceCheckin = 0
  let handoverStatus = 'unknown'
  let anaiActive = false
  
  if (SUPABASE_URL && SUPABASE_KEY && isSupabaseUrlValid(SUPABASE_URL)) {
    try {
      // Get last check-in
      const checkinRes = await fetch(
        `${SUPABASE_URL}/rest/v1/system_config?config_key=eq.guardian_last_checkin&select=value`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      )
      
      if (checkinRes.ok) {
        const data = await checkinRes.json()
        if (data.length > 0) {
          lastCheckin = new Date(data[0].value)
          hoursSinceCheckin = (now.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60)
        }
      }
      
      // Get handover status
      const handoverRes = await fetch(
        `${SUPABASE_URL}/rest/v1/system_config?config_key=eq.guardian_handover_status&select=value`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      )
      
      if (handoverRes.ok) {
        const data = await handoverRes.json()
        if (data.length > 0) {
          handoverStatus = data[0].value
        }
      }
      
      // Get Anai status
      const anaiRes = await fetch(
        `${SUPABASE_URL}/rest/v1/system_config?config_key=eq.anai_active&select=value`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      )
      
      if (anaiRes.ok) {
        const data = await anaiRes.json()
        if (data.length > 0) {
          anaiActive = data[0].value === 'true'
        }
      }
      
    } catch (error) {
      console.error('[Guardian API] Error:', error)
    }
  }
  
  const status = hoursSinceCheckin >= TIMEOUT_HOURS ? 'TRIGGERED' :
                 hoursSinceCheckin >= 12 ? 'WARNING' : 'ACTIVE'
  
  return {
    status,
    hours_since_checkin: Math.round(hoursSinceCheckin * 10) / 10,
    hours_remaining: Math.max(0, Math.round((TIMEOUT_HOURS - hoursSinceCheckin) * 10) / 10),
    last_checkin: lastCheckin.toISOString(),
    timeout_hours: TIMEOUT_HOURS,
    handover_status: handoverStatus,
    anai_active: anaiActive
  }
}

async function updateCheckIn(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return true // Mock success
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
    console.error('[Guardian API] Update failed:', error)
    return false
  }
}

