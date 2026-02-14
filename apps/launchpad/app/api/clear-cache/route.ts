import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execPromise = promisify(exec)

export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 })
  }
  try {
    const baseDir = process.env.LAUNCHPAD_APPS_PATH || process.env.PROJECTS_BASE_PATH || path.join(process.cwd(), 'apps')
    const projects = ['prognostication', 'cevict', 'progno', 'petreunion']
    
    for (const project of projects) {
      try {
        await execPromise(`cd ${path.join(baseDir, project)} && rmdir /s /q .next 2>nul & rmdir /s /q node_modules\\.cache 2>nul`)
      } catch (error) {
        // Ignore errors for projects that don't exist
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
