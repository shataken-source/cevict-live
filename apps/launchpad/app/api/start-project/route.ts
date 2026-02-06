import { NextResponse } from 'next/server'
import { exec } from 'child_process'

export async function POST(request: Request) {
  try {
    const { path, port } = await request.json()
    
    const baseDir = 'C:\\gcc\\cevict-app\\cevict-monorepo\\apps'
    const command = `start powershell -NoExit -Command "cd ${baseDir}\\${path}; npm run dev"`
    
    exec(command)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
