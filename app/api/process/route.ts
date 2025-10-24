import { NextRequest, NextResponse } from 'next/server'
import { processTweets } from '@/lib/tweetProcessor'

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json()

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      )
    }

    const results = await processTweets(data)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process tweets', details: (error as Error).message },
      { status: 500 }
    )
  }
}
