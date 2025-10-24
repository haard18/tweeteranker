'use client'

import React, { useState } from 'react'
import toast from 'react-hot-toast'

interface UploadFormProps {
  onUpload: (data: Record<string, string>[]) => void
  isProcessing: boolean
}

export default function UploadForm({ onUpload, isProcessing }: UploadFormProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      processFile(files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Upload failed')
        return
      }

      toast.success(`Uploaded ${result.rowCount} rows`)
      onUpload(result.data)
    } catch (error) {
      toast.error('Error uploading file')
      console.error(error)
    }
  }

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-white hover:border-gray-400'
      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        type="file"
        accept=".csv"
        onChange={handleChange}
        className="hidden"
        id="file-input"
        disabled={isProcessing}
      />
      <label htmlFor="file-input" className="cursor-pointer block">
        <div className="mb-2 text-4xl">📁</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Drop your CSV file here
        </h3>
        <p className="text-gray-600">
          or click to browse your computer
        </p>
        <p className="text-sm text-gray-500 mt-2">
          CSV should contain columns: replyId, tweetId, replyText, and optionally originalTweetText
        </p>
      </label>
    </div>
  )
}
