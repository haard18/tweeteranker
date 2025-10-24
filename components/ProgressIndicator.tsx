'use client'

import React from 'react'

interface ProgressIndicatorProps {
  current: number
  total: number
  status: string
}

export default function ProgressIndicator({
  current,
  total,
  status,
}: ProgressIndicatorProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-900">Processing</h4>
        <span className="text-sm text-gray-600">
          {current} / {total}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-600">{status}</p>
    </div>
  )
}
