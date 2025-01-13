'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Paperclip, Image, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import mammoth from 'mammoth'

interface RichTextareaProps {
  value: string
  onChange: (value: string) => void
  onFilesSelected: (files: File[]) => void
  placeholder?: string
  className?: string
  required?: boolean
}

export function RichTextarea({
  value,
  onChange,
  onFilesSelected,
  placeholder,
  className = '',
  required = false
}: RichTextareaProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const appendContent = useCallback((newContent: string) => {
    const updatedValue = value ? value + '\n' + newContent : newContent
    onChange(updatedValue)
  }, [onChange, value])

  const clearFiles = useCallback(() => {
    setFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const clearComponent = useCallback(() => {
    setFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  useEffect(() => {
    if (value === '') {
      clearComponent()
    }
  }, [value, clearComponent])

  const processImage = async (file: File): Promise<string> => {
    try {
      const base64Image = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          const base64Data = base64.split(',')[1]
          resolve(base64Data)
        }
        reader.readAsDataURL(file)
      })

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract only the main request or instruction from this image, ignoring any UI elements or surrounding context. Respond with only the extracted text."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${base64Image}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: 500
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to process image')
      }

      const data = await response.json()
      return data.choices[0].message.content.trim()
    } catch (error) {
      console.error('Error processing image:', error)
      return `Error processing image: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  const processWordDocument = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      return result.value.trim()
    } catch (error) {
      console.error('Error processing Word document:', error)
      return `Error processing document: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  const processFiles = async (newFiles: File[]) => {
    setProcessing(true)
    try {
      setFiles(newFiles)
      
      for (const file of newFiles) {
        let content = ''
        
        if (file.type.startsWith('image/')) {
          content = await processImage(file)
          appendContent(content)
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          content = await processWordDocument(file)
          appendContent(content)
        } else if (file.type === 'text/plain') {
          const text = await file.text()
          appendContent(text.trim())
        } else {
          content = `Attached: ${file.name}`
          appendContent(content)
        }
      }

      onFilesSelected(newFiles)
    } catch (error) {
      console.error('Error processing files:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files)
      await processFiles(newFiles)
      return
    }

    const text = e.dataTransfer.getData('text')
    if (text) {
      appendContent(text)
    }
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.files)
    if (files.length > 0) {
      e.preventDefault()
      await processFiles(files)
    }
  }

  const handleAttachClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    await processFiles(newFiles)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (fileToRemove: File) => {
    setFiles(prev => prev.filter(f => f !== fileToRemove))
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative rounded-lg border ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-input'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          required={required}
          className={`min-h-[100px] w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        />
        <div className="absolute bottom-2 right-2 flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleAttachClick}
            disabled={processing}
          >
            <Paperclip className="h-4 w-4" />
            <span className="sr-only">Attach files</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleAttachClick}
            disabled={processing}
          >
            <Image className="h-4 w-4" />
            <span className="sr-only">Attach image</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleAttachClick}
            disabled={processing}
          >
            <FileText className="h-4 w-4" />
            <span className="sr-only">Attach document</span>
          </Button>
        </div>
      </div>
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <Alert key={`${file.name}-${index}`} className="flex items-center justify-between py-2">
              <AlertDescription>
                {file.name}
              </AlertDescription>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeFile(file)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            </Alert>
          ))}
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileInput}
        accept="image/*,.pdf,.doc,.docx,.txt"
        multiple
      />
    </div>
  )
}

