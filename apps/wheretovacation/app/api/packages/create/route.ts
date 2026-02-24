import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, getSupabaseAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, items, pricing } = body

    if (!name || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Require authenticated user so we can associate the package
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const admin = getSupabaseAdminClient()
    if (!admin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Save package to database (vacation_packages table)
    const subtotal = Number(pricing?.subtotal ?? 0)
    const discount = Number(pricing?.discount ?? 0)
    const total = Number(pricing?.total ?? subtotal - discount)

    const { data, error } = await admin
      .from('vacation_packages')
      .insert({
        user_id: user.id,
        name,
        description: null,
        items,
        subtotal,
        discount,
        total,
        status: 'saved',
      })
      .select('id, name, subtotal, discount, total, status, created_at')
      .maybeSingle()

    if (error) {
      console.error('[packages/create] Insert error:', error.message)
      return NextResponse.json(
        { error: 'Failed to save package' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      package: data,
      message: 'Package saved successfully. You can now proceed to booking.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create package', details: error.message },
      { status: 500 }
    )
  }
}
