'use client'

import { useState, useRef, ReactNode } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  multiple?: boolean
  icon?: ReactNode
}

export function FileUpload({ 
  onFilesSelected, 
  accept = '*', 
  multiple = true,
  icon = <Upload className="h-4 w-4" />
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    onFilesSelected(files)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    onFilesSelected(files)
  }

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-4 text-center ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileInput}
        accept={accept}
        multiple={multiple}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        className="w-full h-24 flex flex-col items-center justify-center gap-2"
      >
        {icon}
        <div className="text-sm">
          <span className="font-semibold">Click to upload</span> or drag and drop
        </div>
        <div className="text-xs text-gray-500">
          Support for images, PDFs, and documents
        </div>
      </Button>
    </div>
  )
}

