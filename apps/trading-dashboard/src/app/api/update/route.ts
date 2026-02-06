import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

// Simple in-memory store with file backup
const DATA_FILE = path.join(process.cwd(), '.dashboard-data.json')

interface DashboardData {
  stats: any
  trades: any[]
  lastUpdate: string
}

function loadData(): DashboardData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf8')
      return JSON.parse(content)
    }
  } catch (e) {
    console.error('Failed to load dashboard data:', e)
  }
  return {
    stats: null,
    trades: [],
    lastUpdate: new Date().toISOString()
  }
}

function saveData(data: DashboardData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    console.error('Failed to save dashboard data:', e)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = loadData()

    // Update stats
    if (body.stats) {
      data.stats = {
        ...body.stats,
        lastUpdate: new Date().toISOString()
      }
    }

    // Add trades
    if (body.trades && Array.isArray(body.trades)) {
      data.trades = [...body.trades, ...data.trades].slice(0, 100) // Keep last 100
    }

    // Add single trade
    if (body.trade) {
      data.trades = [body.trade, ...data.trades].slice(0, 100)
    }

    data.lastUpdate = new Date().toISOString()
    saveData(data)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json(
      { error: 'Failed to update data' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const data = loadData()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 }
    )
  }
}

