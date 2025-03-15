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
      if (!isSubmitting && onSubmit && (value.trim() || attachments.length > 0)) {
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

  // Watch for changes to the value prop
  useEffect(() => {
    // If the value is empty, clear the attachments
    if (value === "") {
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
  }, [value, onFilesSelected]);

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
      setIsProcessing(true)
      
      const processed = await processFile(file)
      
      // Add to attachments
      const processedFile = Object.assign(file, processed) as ProcessedFile
      setAttachments(prev => [...prev, processedFile])
      
      // Notify parent
      onFilesSelected?.([...attachments, processedFile])
    } catch (error) {
      console.error('Error processing file:', error)
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
      await handleFilesSelected(files[0])
    }
  }

  const handleDrop = async (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) {
      await handleFilesSelected(files[0])
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      await handleFilesSelected(files[0])
    }
  }

  const removeAttachment = (index: number) => {
    const file = attachments[index]
    if (file.imageUrl) {
      URL.revokeObjectURL(file.imageUrl)
    }
    
    const newAttachments = attachments.filter((_, i) => i !== index)
    setAttachments(newAttachments)
    onFilesSelected?.(newAttachments)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getFileIcon = (file: File) => {
    const type = file.type || ''
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    
    if (type.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return <ImageIcon className="h-4 w-4 text-blue-500" />
    }
    if (type === "application/pdf" || extension === 'pdf') {
      return <FileText className="h-4 w-4 text-red-500" />
    }
    if (type.includes("word") || type.includes("officedocument") || ['doc', 'docx'].includes(extension)) {
      return <FileText className="h-4 w-4 text-blue-600" />
    }
    if (type.includes("excel") || type.includes("spreadsheet") || ['xls', 'xlsx'].includes(extension)) {
      return <FileText className="h-4 w-4 text-green-600" />
    }
    if (type === "text/plain" || extension === 'txt') {
      return <FileText className="h-4 w-4 text-gray-600" />
    }
    return <File className="h-4 w-4 text-gray-500" />
  }

  const getFileLabel = (file: File) => {
    const type = file.type || ''
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    
    if (type.includes("word") || type.includes("officedocument.wordprocessing") || ['doc', 'docx'].includes(extension)) {
      return "Word Document"
    }
    if (type.includes("excel") || type.includes("spreadsheet") || ['xls', 'xlsx'].includes(extension)) {
      return "Spreadsheet"
    }
    if (type === "application/pdf" || extension === 'pdf') {
      return "PDF Document"
    }
    if (type === "text/plain" || extension === 'txt') {
      return "Text Document"
    }
    if (type.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return "Image"
    }
    return type || "Unknown Type"
  }

  return (
    <div className="plugin-discussion-input-wrapper">
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
                  className="h-6 w-6 p-0 hover:bg-purple-50"
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
                  className={cn(
                    "h-6 w-6 p-0",
                    isSubmitting || isProcessing || (!value.trim() && attachments.length === 0)
                      ? "text-purple-200 hover:bg-purple-50"
                      : "text-purple-600 hover:bg-purple-50"
                  )}
                  onClick={() => onSubmit?.()}
                  disabled={isSubmitting || isProcessing || (!value.trim() && attachments.length === 0)}
                >
                  {isSubmitting ? (
                    <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
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
              {file.imageUrl && (file.type?.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.name.split('.').pop()?.toLowerCase() || '')) ? (
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
        accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
      />
    </div>
  )
}

