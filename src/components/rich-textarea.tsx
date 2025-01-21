"use client"

import React, { useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Paperclip, X } from "lucide-react"

interface RichTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  onFilesSelected?: (files: File[]) => void
  onChange?: (value: string) => void
}

export function RichTextarea({ className, onFilesSelected, onChange, ...props }: RichTextareaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles(files)
    onFilesSelected?.(files)
  }

  const handleRemoveFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
    onFilesSelected?.(newFiles)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(event.target.value)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          onChange={handleTextChange}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      </div>

      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs">
              <img
                src={URL.createObjectURL(file) || "/placeholder.svg"}
                className="h-4 w-4 rounded-full object-cover"
                alt={`Preview of ${file.name}`}
              />
              <span>{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={() => handleRemoveFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} multiple />
    </div>
  )
}

