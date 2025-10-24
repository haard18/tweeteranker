'use client'

import React, { useState } from 'react'
import toast from 'react-hot-toast'
import UploadForm from '@/components/UploadForm'
import ResultsTable, { RatingResult } from '@/components/ResultsTable'
import ProgressIndicator from '@/components/ProgressIndicator'
import LogViewer from '@/components/LogViewer'

interface CSVRow {
  [key: string]: string | undefined
}

export default function Page() {
  const [uploadedData, setUploadedData] = useState<CSVRow[]>([])
  const [results, setResults] = useState<RatingResult[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' })

  const handleUpload = async (data: CSVRow[]) => {
    setUploadedData(data)
    setResults([])
    setLogs([])
    
    // Auto-process after upload
    await processData(data)
  }

  const processData = async (data: CSVRow[]) => {
    setIsProcessing(true)
    setResults([])
    setLogs([])
    setProgress({ current: 0, total: data.length, status: 'Starting...' })

    try {
      const response = await fetch('/api/process-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      })

      if (!response.ok) {
        toast.error('Failed to start processing')
        setIsProcessing(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (!reader) {
        toast.error('Failed to read response stream')
        setIsProcessing(false)
        return
      }

      // Process Server-Sent Events
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6) // Remove 'data: '
              const event = JSON.parse(jsonStr)

              if (event.type === 'log') {
                // Add log entry
                setLogs((prevLogs) => [...prevLogs, event.message])
              } else if (event.type === 'complete') {
                // Processing complete
                setResults(event.results)
                const successful = event.results.filter((r: RatingResult) => !r.error).length
                const failed = event.results.filter((r: RatingResult) => r.error).length
                toast.success(`Processing complete: ${successful} successful, ${failed} failed`)
                setProgress({
                  current: data.length,
                  total: data.length,
                  status: 'Complete!',
                })
              } else if (event.type === 'error') {
                toast.error(`Processing error: ${event.error}`)
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e)
            }
          }
        }
      }
    } catch (error) {
      toast.error('Error processing data')
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🐦 TweetRater
          </h1>
          <p className="text-lg text-gray-600">
            Upload your tweet replies and get AI-powered quality ratings
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Upload CSV
          </h2>
          <UploadForm onUpload={handleUpload} isProcessing={isProcessing} />
        </div>

        {/* Logs Section */}
        {logs.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Processing Logs
            </h2>
            <LogViewer logs={logs} />
          </div>
        )}

        {/* Progress Section */}
        {isProcessing && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-8">
            <ProgressIndicator
              current={progress.current}
              total={progress.total}
              status={progress.status}
            />
          </div>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Results
            </h2>
            <ResultsTable data={results} />
          </div>
        )}

        {/* Empty State */}
        {!isProcessing && uploadedData.length === 0 && results.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <p className="text-blue-900">
              👆 Start by uploading a CSV file with your tweet data
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
