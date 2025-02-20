"use client"

import { useState, useRef, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Paperclip, X, FileText, File, ImageIcon, Eye, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { processFile } from "@/lib/file-processor"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { FileDropZone } from "@/components/file-drop-zone"

interface ProcessedFile extends File {
  imageUrl?: string
  imageAnalysis?: string
  metadata?: {
    type: string
    size: number
    lastModified: number
    name: string
    isReference?: boolean
    error?: string
    summary?: string
  }
}

interface RichTextareaProps {
  value: string
  onChange: (value: string) => void
  onFilesSelected?: (files: ProcessedFile[]) => void
  className?: string
  placeholder?: string
  selectedModel?: string
  clearAttachments?: boolean
  onSubmit?: () => void
  isSubmitting?: boolean
}

export function RichTextarea({ value, onChange, onFilesSelected, className, placeholder, selectedModel = 'openai', clearAttachments = false, onSubmit, isSubmitting = false }: RichTextareaProps) {
  const [attachments, setAttachments] = useState<ProcessedFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmitting && onSubmit && value.trim()) {
        onSubmit();
      }
    }
  };

  // Clear attachments only when explicitly told to do so
  useEffect(() => {
    if (clearAttachments) {
      // Clear all object URLs before removing attachments
      attachments.forEach((file) => {
        if (file.imageUrl) {
          URL.revokeObjectURL(file.imageUrl)
        }
      })
      setAttachments([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      onFilesSelected?.([])
    }
  }, [clearAttachments, onFilesSelected, attachments])

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      attachments.forEach((file) => {
        if (file.imageUrl) {
          URL.revokeObjectURL(file.imageUrl)
        }
      })
    }
  }, [attachments])

  const handleFilesSelected = async (file: File) => {
    try {
      const processed = await processFile(file)
      if (processed.metadata) {
        onFilesSelected([processed as ProcessedFile])
      }
    } catch (error) {
      console.error('Error processing file:', error)
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
      await handleFilesSelected(files[0])
    }
  }

  const handleDrop = async (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files)
    await handleFilesSelected(files[0])
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    await handleFilesSelected(files[0])
  }

  const removeAttachment = (index: number) => {
    const file = attachments[index]
    if (file.imageUrl) {
      URL.revokeObjectURL(file.imageUrl)
    }
    setAttachments((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase()
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-blue-500" />
    if (type === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />
    if (type.includes("word") || type.includes("officedocument")) return <FileText className="h-4 w-4 text-blue-600" />
    if (type.includes("excel") || type.includes("spreadsheet")) return <FileText className="h-4 w-4 text-green-600" />
    if (type === "text/plain" || file.name.toLowerCase().endsWith('.txt')) return <FileText className="h-4 w-4 text-gray-600" />
    return <File className="h-4 w-4 text-gray-500" />
  }

  const getFileLabel = (file: File) => {
    const type = file.type.toLowerCase()
    if (type.includes("word") || type.includes("officedocument.wordprocessing")) return "Word Document"
    if (type.includes("excel") || type.includes("spreadsheet")) return "Spreadsheet"
    if (type === "application/pdf") return "PDF Document"
    if (type === "text/plain") return "Text Document"
    return file.type || "Unknown Type"
  }

  return (
    <div className="space-y-2 w-full">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          placeholder={placeholder}
          className={cn(
            "resize-none overflow-hidden font-mono text-sm w-full",
            "min-h-[100px] bg-background border rounded-md",
            "pr-20",
            "idm2-discussion-input",
            className
          )}
        />
        <div className="absolute right-2 bottom-2 flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-emerald-100"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach files (images, PDFs, Word docs, etc.)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-100"
                  onClick={() => onSubmit?.()}
                  disabled={isSubmitting || isProcessing || !value.trim()}
                >
                  {isSubmitting ? (
                    <div className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send message (or press Enter)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {isProcessing && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          Processing file...
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="group relative flex items-center gap-2 bg-secondary/50 hover:bg-secondary/70 transition-colors rounded-lg px-3 py-1.5"
            >
              {file.type.startsWith("image/") && file.imageUrl ? (
                <div className="relative">
                  <img
                    src={file.imageUrl}
                    alt={file.name}
                    className="h-8 w-8 object-cover rounded"
                  />
                  {file.imageAnalysis && (
                    <div className="absolute left-0 right-0 bottom-full mb-2 hidden group-hover:block z-10">
                      <div className="bg-black/90 text-white text-xs p-2 rounded shadow-lg">
                        {file.imageAnalysis}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                getFileIcon(file)
              )}
              <div className="flex flex-col">
                <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs text-muted-foreground">{getFileLabel(file)}</span>
                {file.metadata?.summary && (
                  <div className="absolute left-0 right-0 bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-black/90 text-white text-xs p-2 rounded shadow-lg max-w-xs">
                      {file.metadata.summary}
                    </div>
                  </div>
                )}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-secondary/90"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove this attachment</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

