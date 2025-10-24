'use client'

import React, { useEffect, useRef } from 'react'

interface LogViewerProps {
  logs: string[]
}

export default function LogViewer({ logs }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  const getLogColor = (log: string): string => {
    if (log.includes('✓') || log.includes('✅')) return 'text-green-600'
    if (log.includes('✗') || log.includes('❌')) return 'text-red-600'
    if (log.includes('⚠') || log.includes('[WARN]')) return 'text-yellow-600'
    if (log.includes('[ERROR]')) return 'text-red-700'
    if (log.includes('→')) return 'text-blue-600'
    if (log.includes('←')) return 'text-blue-500'
    if (log.includes('📊')) return 'text-purple-600'
    return 'text-gray-700'
  }

  return (
    <div
      ref={containerRef}
      className="bg-white text-gray-100 p-4 rounded-lg font-mono text-sm overflow-y-auto max-h-96 space-y-1"
    >
      {logs.length === 0 ? (
        <div className="text-gray-500">Waiting for logs...</div>
      ) : (
        logs.map((log, index) => (
          <div key={index} className={`${getLogColor(log)}`}>
            {log}
          </div>
        ))
      )}
    </div>
  )
}
