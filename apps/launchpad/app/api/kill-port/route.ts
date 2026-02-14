import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ success: false, error: 'Sign in required' }, { status: 401 })
  }
  try {
    const { port } = await request.json()
    
    const command = `powershell -Command "$process = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if ($process) { Stop-Process -Id $process -Force }"`
    
    await execPromise(command)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
