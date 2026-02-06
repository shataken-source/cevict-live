import { NextRequest, NextResponse } from 'next/server'
import { getBotCoordinator } from '@/lib/bots/coordinator'

// GET - Get bot system status
export async function GET() {
  const coordinator = getBotCoordinator()
  
  return NextResponse.json({
    dashboard: coordinator.getDashboard(),
    bots: coordinator.getBotStatuses(),
    timestamp: new Date().toISOString()
  })
}

// POST - Control bot system
export async function POST(request: NextRequest) {
  const coordinator = getBotCoordinator()
  const body = await request.json()
  const { action, params } = body

  try {
    switch (action) {
      case 'start':
        coordinator.start(params?.mode || 'supervised')
        return NextResponse.json({ 
          success: true, 
          message: `Bot system started in ${params?.mode || 'supervised'} mode` 
        })

      case 'stop':
        coordinator.stop()
        return NextResponse.json({ 
          success: true, 
          message: 'Bot system stopped' 
        })

      case 'setMode':
        if (!params?.mode) {
          return NextResponse.json({ error: 'Mode required' }, { status: 400 })
        }
        coordinator.setMode(params.mode)
        return NextResponse.json({ 
          success: true, 
          message: `Mode set to ${params.mode}` 
        })

      case 'approveRepair':
        if (!params?.actionId) {
          return NextResponse.json({ error: 'Action ID required' }, { status: 400 })
        }
        const approved = coordinator.repair.approveRepair(params.actionId)
        return NextResponse.json({ 
          success: approved, 
          message: approved ? 'Repair approved' : 'Repair not found' 
        })

      case 'rejectRepair':
        if (!params?.actionId) {
          return NextResponse.json({ error: 'Action ID required' }, { status: 400 })
        }
        const rejected = coordinator.repair.rejectRepair(params.actionId)
        return NextResponse.json({ 
          success: rejected, 
          message: rejected ? 'Repair rejected' : 'Repair not found' 
        })

      case 'approveAll':
        coordinator.approveAll()
        return NextResponse.json({ 
          success: true, 
          message: 'All pending actions approved' 
        })

      case 'getState':
        return NextResponse.json(coordinator.getSystemState())

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

