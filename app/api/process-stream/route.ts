    import { NextRequest, NextResponse } from 'next/server'
import { processTweetsWithLogs } from '@/lib/tweetProcessor'

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json()

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      )
    }

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder()
    const customReadable = new ReadableStream({
      async start(controller) {
        try {
          // Send initial message
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'start', message: 'Processing started' })}\n\n`
            )
          )

          // Process tweets and stream logs
          const results = await processTweetsWithLogs(data, (log) => {
            // Send each log entry as a Server-Sent Event
            const logEntry = {
              type: 'log',
              timestamp: new Date().toISOString(),
              message: log,
            }
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(logEntry)}\n\n`)
            )
          })

          // Send final results
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'complete',
                results,
              })}\n\n`
            )
          )

          controller.close()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: errorMessage,
              })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new NextResponse(customReadable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Streaming error:', error)
    return NextResponse.json(
      { error: 'Failed to start processing', details: (error as Error).message },
      { status: 500 }
    )
  }
}
