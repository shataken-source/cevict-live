import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export async function POST() {
  try {
    const baseDir = 'C:\\gcc\\cevict-app\\cevict-monorepo\\apps'
    const projects = ['prognostication', 'cevict', 'progno', 'petreunion']
    
    for (const project of projects) {
      try {
        await execPromise(`cd ${baseDir}\\${project} && rmdir /s /q .next 2>nul & rmdir /s /q node_modules\\.cache 2>nul`)
      } catch (error) {
        // Ignore errors for projects that don't exist
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
