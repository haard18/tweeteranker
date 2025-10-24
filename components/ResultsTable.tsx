'use client'

import React from 'react'
import { downloadFile, exportToCSV, exportToJSON } from '@/lib/exportUtils'

export interface RatingResult {
  replyId: string
  tweetId: string
  originalTweetText: string
  replyText: string
  rating: number | null
  error?: string
}

interface ResultsTableProps {
  data: RatingResult[]
}

export default function ResultsTable({ data }: ResultsTableProps) {
  const handleExportCSV = () => {
    const csv = exportToCSV(data)
    downloadFile(csv, 'tweetrater-results.csv', 'text/csv')
  }

  const handleExportJSON = () => {
    const json = exportToJSON(data)
    downloadFile(json, 'tweetrater-results.json', 'application/json')
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No results yet. Upload a CSV file to get started.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Export as CSV
        </button>
        <button
          onClick={handleExportJSON}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Export as JSON
        </button>
      </div>

      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Reply ID
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Original Tweet
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Reply Tweet
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                className={`border-b ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-blue-50 transition-colors`}
              >
                <td className="px-6 py-3 text-sm text-gray-700 font-mono">
                  {row.replyId}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700 max-w-xs truncate">
                  {row.originalTweetText || '—'}
                </td>
                <td className="px-6 py-3 text-sm text-gray-700 max-w-xs truncate">
                  {row.replyText}
                </td>
                <td className="px-6 py-3 text-center">
                  {row.error ? (
                    <span className="text-red-600 text-sm font-medium">Error</span>
                  ) : row.rating !== null ? (
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-900 font-bold text-sm">
                      {row.rating}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm">
                  {row.error ? (
                    <span className="text-red-600">{row.error}</span>
                  ) : (
                    <span className="text-green-600">✓ Complete</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>{data.length}</strong> results processed.{' '}
          <strong>{data.filter(r => !r.error).length}</strong> successful,{' '}
          <strong>{data.filter(r => r.error).length}</strong> with errors.
        </p>
      </div>
    </div>
  )
}
