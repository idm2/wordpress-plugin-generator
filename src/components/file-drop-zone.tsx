'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { FolderOpen } from 'lucide-react'

interface FileDropZoneProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function FileDropZone({ onFileSelect, disabled = false }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return
    
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.json')) {
      onFileSelect(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative ${isDragging ? 'opacity-70' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
        id="load-plugin-input"
      />
      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
      >
        <FolderOpen className="mr-2 h-4 w-4" />
        Load
      </Button>
      {isDragging && (
        <div className="absolute inset-0 border-2 border-dashed border-primary rounded-lg bg-background/50 flex items-center justify-center">
          <span className="text-sm">Drop plugin state file here</span>
        </div>
      )}
    </div>
  )
} 