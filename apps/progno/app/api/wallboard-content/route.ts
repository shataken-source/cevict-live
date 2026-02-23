import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const htmlPath = path.join(process.cwd(), 'cevict-tv-wallboard', 'index.html')
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8')
    
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load wallboard' }, { status: 500 })
  }
}
