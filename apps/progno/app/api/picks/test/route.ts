import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const testPicks = [
      {
        sport: 'BASKETBALL NBA',
        home_team: 'Los Angeles Lakers',
        away_team: 'Boston Celtics',
        pick: 'Los Angeles Lakers',
        pick_type: 'MONEYLINE',
        odds: -150,
        confidence: 75,
        game_time: new Date().toISOString(),
        is_premium: true,
        analysis: 'Lakers favored at home. Strong recent performance.'
      },
      {
        sport: 'AMERICANFOOTBALL NFL',
        home_team: 'Kansas City Chiefs',
        away_team: 'Buffalo Bills',
        pick: 'Kansas City Chiefs',
        pick_type: 'MONEYLINE',
        odds: -200,
        confidence: 80,
        game_time: new Date().toISOString(),
        is_premium: true,
        analysis: 'Chiefs strong favorites. High confidence pick.'
      },
      {
        sport: 'ICEHOCKEY NHL',
        home_team: 'Tampa Bay Lightning',
        away_team: 'Florida Panthers',
        pick: 'Tampa Bay Lightning',
        pick_type: 'MONEYLINE',
        odds: -110,
        confidence: 65,
        game_time: new Date().toISOString(),
        is_premium: false,
        analysis: 'Close matchup. Lightning slight edge at home.'
      }
    ]

    const { data, error } = await supabase.from('picks').insert(testPicks).select()
    if (error) throw error

    return NextResponse.json({ message: 'Test picks created!', picks: data, count: data.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { error } = await supabase.from('picks').delete().gte('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
    return NextResponse.json({ message: 'All picks deleted!' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
