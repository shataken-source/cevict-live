import { NextRequest } from 'next/server'
import { getBotCoordinator } from '@/lib/bots/coordinator'

// Server-Sent Events for real-time bot updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const coordinator = getBotCoordinator()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const initialData = JSON.stringify({
        type: 'init',
        data: coordinator.getDashboard()
      })
      controller.enqueue(encoder.encode(`data: ${initialData}\n\n`))

      // Poll for updates every 2 seconds
      const interval = setInterval(() => {
        try {
          const update = JSON.stringify({
            type: 'update',
            data: coordinator.getDashboard(),
            timestamp: new Date().toISOString()
          })
          controller.enqueue(encoder.encode(`data: ${update}\n\n`))
        } catch (error) {
          clearInterval(interval)
          controller.close()
        }
      }, 2000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

