import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, email, alertTypes, customKeywords } = await request.json()

    if (!phoneNumber && !email) {
      return NextResponse.json({ error: 'Phone number or email required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_alerts')
      .insert({
        phone_number: phoneNumber || null,
        email: email || null,
        alert_types: alertTypes || [],
        custom_keywords: customKeywords || [],
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating alert:', error)
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in alerts API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching alerts:', error)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    return NextResponse.json({ alerts: data || [] })
  } catch (error) {
    console.error('Error in alerts API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
