"use client"

import { useState, useRef, useEffect } from "react"
import { RichTextarea } from "./rich-textarea"
import { Button } from "@/components/ui/button"
import { Send, Bot, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type FileReference } from "@/lib/file-processor"

interface Message {
  id: string
  content: string
  type: "user" | "assistant"
  timestamp: string
  files?: FileReference[]
  imageUrls?: string[]
  imageAnalysis?: string[]
  codeUpdate?: boolean
}

interface PluginDiscussionProps {
  messages: Message[]
  onSendMessage: (content: string, files?: File[]) => Promise<void>
  className?: string
  onCodeUpdate?: (code: string) => void
  selectedModel?: string
  revertBySteps?: (steps: number) => boolean
  revertToVersion?: (versionId: string) => void
  codeVersions?: { id: string; version: string; timestamp: string }[]
}

export function PluginDiscussion({ 
  messages, 
  onSendMessage, 
  onCodeUpdate, 
  className, 
  selectedModel = 'openai',
  revertBySteps,
  revertToVersion,
  codeVersions
}: PluginDiscussionProps) {
  const [inputValue, setInputValue] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if ((!inputValue.trim() && files.length === 0) || isSubmitting) return

    setIsSubmitting(true)
    try {
      // Check for version control commands
      const goBackMatch = inputValue.toLowerCase().match(/(?:go back|revert|undo)\s*(?:to\s*v?(\d+(?:\.\d+)?)|(\d+)\s*(?:steps?|versions?)?(?:\s*back)?)/i)
      
      if (goBackMatch && (revertBySteps || revertToVersion)) {
        const versionNumber = goBackMatch[1] // Specific version number
        const steps = goBackMatch[2] // Number of steps back
        
        if (versionNumber && codeVersions && revertToVersion) {
          // Find version by number
          const version = codeVersions.find(v => v.version.toLowerCase() === `v${versionNumber.toLowerCase()}`)
          if (version) {
            revertToVersion(version.id)
            await onSendMessage(`Reverted to version ${version.version}`)
          } else {
            await onSendMessage(`Version v${versionNumber} not found`)
          }
        } else if (steps && revertBySteps) {
          // Revert by number of steps
          const success = revertBySteps(parseInt(steps))
          if (success) {
            await onSendMessage(`Successfully reverted back ${steps} version${steps === "1" ? "" : "s"}`)
          } else {
            await onSendMessage("Unable to revert. No previous version available.")
          }
        }
      } else {
        await onSendMessage(inputValue, files)
      }
      
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
      <div className="text-2xl font-bold pl-5">Plugin Discussion and Change</div>
      <div className="mt-[47px] mb-4 pl-5">
        <RichTextarea
          value={inputValue}
          onChange={setInputValue}
          onFilesSelected={setFiles}
          placeholder="Describe the changes needed..."
          className="min-h-[100px]"
          selectedModel={selectedModel}
        />
        <div className="flex justify-end mt-2">
          <Button onClick={handleSubmit} disabled={isSubmitting || (!inputValue.trim() && files.length === 0)}>
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                Generating response...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Respond
              </>
            )}
          </Button>
        </div>
      </div>
      <Card className="flex-1 overflow-hidden pl-5">
        <div className="h-full overflow-y-auto p-4">
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
                  
                  {/* Display images with analysis */}
                  {message.imageUrls && message.imageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-4 mt-2">
                      {message.imageUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Attached image ${index + 1}`}
                            className="max-w-[200px] h-auto rounded-lg"
                          />
                          {message.imageAnalysis && message.imageAnalysis[index] && (
                            <div className="absolute left-0 right-0 bottom-full mb-2 hidden group-hover:block z-10">
                              <div className="bg-black/90 text-white text-xs p-2 rounded shadow-lg">
                                {message.imageAnalysis[index]}
                              </div>
                            </div>
                          )}
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

