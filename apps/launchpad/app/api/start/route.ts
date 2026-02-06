import { exec } from 'child_process'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const {path} = await req.json()
  exec(`cd C:\\gcc\\cevict-app\\cevict-monorepo\\apps\\${path} && start npm run dev`)
  return NextResponse.json({success: true})
}
