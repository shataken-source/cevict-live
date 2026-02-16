import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { email, source = 'unknown' } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email required' },
        { status: 400 }
      )
    }

    // Insert into email_subscribers table
    const { error } = await supabase
      .from('email_subscribers')
      .upsert({
        email: email.toLowerCase(),
        source,
        subscribed_at: new Date().toISOString(),
        status: 'active'
      }, {
        onConflict: 'email'
      })

    if (error) {
      console.error('[Subscribe] Error:', error)
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Subscribed successfully'
    })

  } catch (error) {
    console.error('[Subscribe] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
