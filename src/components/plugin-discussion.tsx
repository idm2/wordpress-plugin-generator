"use client"

import { useState, useRef, useEffect } from "react"
import { RichTextarea } from "./rich-textarea"
import { Button } from "@/components/ui/button"
import { Send, Bot, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  content: string
  type: "user" | "assistant"
  timestamp: string
  files?: File[]
  codeUpdate?: string
}

interface PluginDiscussionProps {
  messages: Message[]
  onSendMessage: (content: string, files?: File[]) => Promise<void>
  className?: string
  onCodeUpdate?: (code: string) => void
}

export function PluginDiscussion({ messages, onSendMessage, onCodeUpdate, className }: PluginDiscussionProps) {
  const [inputValue, setInputValue] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if ((!inputValue.trim() && files.length === 0) || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSendMessage(inputValue, files)
      setInputValue("")
      setFiles([])
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    })
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="text-2xl font-bold mb-6">Plugin Discussion and Change</div>
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b p-4 bg-background">
          <RichTextarea
            value={inputValue}
            onChange={setInputValue}
            onFilesSelected={setFiles}
            placeholder="Describe the changes needed..."
            className="min-h-[100px]"
          />
          <div className="flex justify-end mt-2">
            <Button onClick={handleSubmit} disabled={isSubmitting || (!inputValue.trim() && files.length === 0)}>
              <Send className="h-4 w-4 mr-2" />
              Respond
            </Button>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto p-4">
          <div className="space-y-4">
            {[...messages].reverse().map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-3", message.type === "assistant" ? "flex-row" : "flex-row-reverse")}
              >
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-background">
                  {message.type === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div
                  className={cn(
                    "flex-1 space-y-2 overflow-hidden rounded-lg px-4 py-2.5",
                    message.type === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground",
                  )}
                >
                  <p className="leading-normal whitespace-pre-wrap">{message.content}</p>
                  {message.files && message.files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-full bg-background/10 px-3 py-1 text-xs"
                        >
                          {file.name}
                        </div>
                      ))}
                    </div>
                  )}
                  {message.codeUpdate && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Code updated:</span> Changes applied to plugin
                    </div>
                  )}
                  <div
                    className={cn(
                      "text-xs",
                      message.type === "assistant" ? "text-muted-foreground" : "text-primary-foreground/80",
                    )}
                  >
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

