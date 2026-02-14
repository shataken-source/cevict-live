import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { exec } from 'child_process'
import path from 'path'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 })
  }
  try {
    const { path: appPath, port } = await request.json()
    if (!appPath || typeof appPath !== 'string') {
      return NextResponse.json({ success: false, error: 'path required' }, { status: 400 })
    }
    const baseDir = process.env.LAUNCHPAD_APPS_PATH || process.env.PROJECTS_BASE_PATH || path.join(process.cwd(), 'apps')
    const safePath = appPath.replace(/[<>:"|?*]/g, '').replace(/\.\./g, '')
    const fullPath = path.join(baseDir, safePath)
    const command = `start powershell -NoExit -Command "cd ${fullPath}; npm run dev"`
    exec(command)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
