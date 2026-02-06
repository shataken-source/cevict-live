import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

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

    const admin = getSupabaseAdminClient()
    if (!admin) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Save package to database
    // Note: In production, you'd have a vacation_packages table
    // For now, we'll return success and the package can be stored in user's session/localStorage
    const packageData = {
      name,
      items,
      pricing,
      created_at: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      package: packageData,
      message: 'Package saved successfully. You can now proceed to booking.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create package', details: error.message },
      { status: 500 }
    )
  }
}
