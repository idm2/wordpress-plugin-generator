"use client"

import { useState } from "react"
import { RichTextarea } from "./rich-textarea"
import { Button } from "@/components/ui/button"
import { Send, Bot } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface RevisionHistoryProps {
  revisions: Array<{
    id: string
    message: string
    response?: string
    timestamp: string
  }>
  onRequestRevision: (message: string, files?: File[]) => Promise<void>
}

export function RevisionHistory({ revisions, onRequestRevision }: RevisionHistoryProps) {
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim() && files.length === 0) return

    setIsSubmitting(true)
    try {
      await onRequestRevision(message, files)
      setMessage("")
      setFiles([])
    } catch (error) {
      console.error("Failed to submit revision:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {revisions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No revisions yet. Generate a plugin to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {revisions.map((revision) => (
              <div key={revision.id} className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="bg-primary/10 rounded-lg px-4 py-2 flex-1">
                    <p className="text-sm">{revision.message}</p>
                  </div>
                </div>
                {revision.response && (
                  <div className="flex items-start gap-2 ml-4">
                    <Bot className="h-4 w-4 mt-2" />
                    <div className="bg-secondary/50 rounded-lg px-4 py-2 flex-1">
                      <p className="text-sm">{revision.response}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-4">
        <RichTextarea
          value={message}
          onChange={setMessage}
          onFilesSelected={setFiles}
          placeholder="Describe the changes needed..."
          className="min-h-[100px]"
        />
        <div className="flex justify-end mt-2">
          <Button onClick={handleSubmit} disabled={isSubmitting || (!message.trim() && files.length === 0)}>
            <Send className="h-4 w-4 mr-2" />
            Request Revision
          </Button>
        </div>
      </div>
    </div>
  )
}

