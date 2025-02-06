"use client"

import { useState, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Paperclip, X, FileText, File, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { processFile } from "@/lib/file-processor"

interface RichTextareaProps {
  value: string
  onChange: (value: string) => void
  onFilesSelected?: (files: File[]) => void
  className?: string
  placeholder?: string
}

export function RichTextarea({ value, onChange, onFilesSelected, className, placeholder }: RichTextareaProps) {
  const [attachments, setAttachments] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true)
    try {
      const processedFiles = []
      for (const file of files) {
        try {
          const result = await processFile(file)
          if (result.text) {
            onChange((prev) => prev + (prev ? "\n\n" : "") + result.text)
          }
          processedFiles.push(file)
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error)
        }
      }
      setAttachments((prev) => [...prev, ...processedFiles])
      onFilesSelected?.(processedFiles)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData.items)
    const files = items
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null)

    if (files.length > 0) {
      event.preventDefault()
      await handleFiles(files)
    }
  }

  const handleDrop = async (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files)
    await handleFiles(files)
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    await handleFiles(files)
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (file.type === "application/pdf") return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  return (
    <div className="space-y-2 w-full">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          placeholder={placeholder}
          className={cn("pr-10", className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-secondary/50 hover:bg-secondary/70 transition-colors rounded-lg px-3 py-1.5"
            >
              {getFileIcon(file)}
              <span className="text-sm truncate max-w-[200px]">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 hover:bg-secondary/90"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
      />
    </div>
  )
}

