export interface ExportData {
  replyId: string
  tweetId: string
  originalTweetText: string
  replyText: string
  rating: number | null
  replyUrl?: string
  error?: string
}

export function exportToCSV(data: ExportData[]): string {
  const headers = ['replyId', 'tweetId', 'originalTweetText', 'replyText', 'rating', 'replyUrl']
  const rows = [headers]

  for (const item of data) {
    rows.push([
      escapeCSV(item.replyId),
      escapeCSV(item.tweetId),
      escapeCSV(item.originalTweetText),
      escapeCSV(item.replyText),
      String(item.rating ?? ''),
      escapeCSV(item.replyUrl || ''),
    ])
  }

  return rows.map(row => row.join(',')).join('\n')
}

function escapeCSV(value: string): string {
  if (!value) return '""'
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value
}

export function exportToJSON(data: ExportData[]): string {
  return JSON.stringify(data, null, 2)
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
