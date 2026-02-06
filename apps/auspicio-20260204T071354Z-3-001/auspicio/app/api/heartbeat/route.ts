// API Route for System Heartbeat
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock system status for the Forge interface
    const systemStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        buildEngine: 'online',
        aiAgents: 'online',
        database: 'connected',
        bubbleEngine: 'active'
      },
      metrics: {
        uptime: '2h 34m',
        activeBubbles: 2,
        totalAgents: 6,
        processingQueue: 0
      },
      version: '1.0.0'
    };

    return NextResponse.json({
      success: true,
      ...systemStatus,
      message: 'System heartbeat successful'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Heartbeat failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 'unhealthy'
    }, { status: 500 });
  }
}
