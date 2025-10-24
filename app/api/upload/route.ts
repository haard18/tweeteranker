import { NextRequest, NextResponse } from 'next/server'
import { parseCSV } from '@/lib/csvParser'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    const buffer = await file.arrayBuffer()
    const text = new TextDecoder().decode(buffer)
    const rows = parseCSV(text)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      rowCount: rows.length,
      data: rows,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    )
  }
}
