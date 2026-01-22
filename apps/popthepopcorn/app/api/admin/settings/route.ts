import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { getAllSettings, updateSetting } from '@/lib/settings'

/**
 * GET /api/admin/settings
 * Get all settings (for admin display)
 */
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await getAllSettings()
    return NextResponse.json({ settings })
  } catch (error: unknown) {
    console.error('[API] Error fetching settings:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: 'Internal server error',
      message: errorMessage,
    }, { status: 500 })
  }
}

/**
 * PUT /api/admin/settings
 * Update a setting
 */
export async function PUT(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { key, value, description, category } = body

    if (!key) {
      return NextResponse.json({
        error: 'Bad request',
        message: 'Setting key is required',
      }, { status: 400 })
    }

    const success = await updateSetting(key, value || '', description, category)

    if (!success) {
      return NextResponse.json({
        error: 'Failed to update setting',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Setting ${key} updated successfully`,
    })
  } catch (error: unknown) {
    console.error('[API] Error updating setting:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      error: 'Internal server error',
      message: errorMessage,
    }, { status: 500 })
  }
}
