import { NextRequest, NextResponse } from 'next/server'
import { captureEmailForPDF } from '@/lib/email-capture'

/**
 * API route for PDF download email capture
 * POST /api/download
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const result = await captureEmailForPDF(email)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to process request' },
        { status: 500 }
      )
    }

    // In production, this would:
    // 1. Generate PDF download link
    // 2. Send email with link
    // 3. Return success

    return NextResponse.json({
      success: true,
      message: 'Download link sent to your email',
    })
  } catch (error) {
    console.error('[Download API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
