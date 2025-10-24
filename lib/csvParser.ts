export interface CSVRow {
  replyId: string
  userId?: string
  username?: string
  createdAt?: string
  platform?: string
  url?: string
  tweetId: string
  repliedToUsername?: string
  replyText: string
  hasImage?: string
  isEnriched?: string
  submissionDelay?: string
  originalTweetText?: string
  ranking?: string
  [key: string]: string | undefined
}

export function parseCSV(text: string): CSVRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV parsing - handle quoted values
    const values = parseCSVLine(line)
    const row: CSVRow = {
      replyId: '',
      tweetId: '',
      replyText: '',
    }

    headers.forEach((header, index) => {
      row[header] = values[index]?.trim()
    })

    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}
