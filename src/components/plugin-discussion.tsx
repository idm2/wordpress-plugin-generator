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
  onSendMessage: (content: string, files?: File[]) => Promise<boolean | void>
  className?: string
  onCodeUpdate?: (code: string) => void
  selectedModel?: string
  revertBySteps?: (steps: number) => boolean
  revertToVersion?: (versionId: string) => void
  codeVersions?: { id: string; version: string; timestamp: string }[]
  initialDescription?: string
  onInitialDescriptionChange?: (description: string) => void
  onFilesSelected?: (files: File[]) => void
}

export function PluginDiscussion({ 
  messages, 
  onSendMessage, 
  onCodeUpdate, 
  className, 
  selectedModel = 'openai',
  revertBySteps,
  revertToVersion,
  codeVersions,
  initialDescription = "",
  onInitialDescriptionChange,
  onFilesSelected
}: PluginDiscussionProps) {
  const [inputValue, setInputValue] = useState(initialDescription)
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shouldClearAttachments, setShouldClearAttachments] = useState(false)
  const prevMessagesLengthRef = useRef(messages.length)
  
  // Determine if this is the initial message based on messages array length
  // This ensures the placeholder text changes after the first message is sent
  const isInitialMessage = messages.length === 0

  // Update inputValue when initialDescription changes
  useEffect(() => {
    if (initialDescription) {
      setInputValue(initialDescription);
    }
  }, [initialDescription]);

  // Update parent component when input value changes
  useEffect(() => {
    // Skip calling onInitialDescriptionChange on every keypress
    if (onInitialDescriptionChange) {
      // Use a debounce mechanism to avoid calling on every keypress
      const debounceTimer = setTimeout(() => {
        onInitialDescriptionChange(inputValue);
      }, 500); // Wait 500ms after typing stops before updating
      
      // Clean up the timer if the component unmounts or inputValue changes again
      return () => clearTimeout(debounceTimer);
    }
  }, [inputValue, onInitialDescriptionChange]);

  // Update parent component when files change
  useEffect(() => {
    if (onFilesSelected) {
      onFilesSelected(files);
    }
  }, [files, onFilesSelected]);

  // Add a useEffect to watch for new messages from the AI
  useEffect(() => {
    // Check if a new message was added
    if (messages.length > prevMessagesLengthRef.current) {
      // If the last message is from the assistant, clear the input
      if (messages.length > 0 && messages[messages.length - 1].type === "assistant") {
        // Force clear the input
        setInputValue("");
        setFiles([]);
        setShouldClearAttachments(true);
        setTimeout(() => setShouldClearAttachments(false), 100);
      }
    }
    
    // Update the ref
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  const handleSubmit = async () => {
    if ((!inputValue.trim() && files.length === 0) || isSubmitting) return

    // Store the current input value and files
    const currentInputValue = inputValue;
    const currentFiles = [...files];

    // Clear the input immediately
    setInputValue("");
    setFiles([]);
    setShouldClearAttachments(true);
    setTimeout(() => setShouldClearAttachments(false), 100);

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
        try {
          // Call onSendMessage with the stored input value and files
          await onSendMessage(currentInputValue, currentFiles);
        } catch (error) {
          console.error("Error sending message:", error);
        }
      }
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
    <div className={cn("plugin-discussion plugin-discussion-container h-full flex flex-col", className)}>
      <div className="plugin-discussion-input-container px-6 flex-shrink-0">
        <RichTextarea
          value={inputValue}
          onChange={setInputValue}
          onFilesSelected={setFiles}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          placeholder={isInitialMessage ? "Describe your plugin..." : "Request updates to your plugin..."}
          className="plugin-discussion-input"
          selectedModel={selectedModel}
          clearAttachments={shouldClearAttachments}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <Card className="plugin-discussion-messages bg-transparent border-none h-full">
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "plugin-discussion-message my-6", 
                    message.type === "assistant" ? "flex-row" : "flex-row-reverse"
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-background mb-2.5">
                    {message.type === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div
                    className={cn(
                      "plugin-discussion-message-content p-4 rounded-lg",
                      message.type === "assistant" ? "bg-[#F5F5F5]" : "bg-[rgb(131,131,131)] text-white",
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
                              className="max-w-[200px] max-h-[200px] h-auto rounded-lg object-cover border border-gray-200 hover:shadow-lg transition-all"
                              onClick={() => window.open(url, '_blank')}
                              style={{ cursor: 'pointer' }}
                            />
                            {message.imageAnalysis && message.imageAnalysis[index] && (
                              <div className="absolute left-0 right-0 bottom-full mb-2 hidden group-hover:block z-10">
                                <div className="bg-black/90 text-white text-xs p-2 rounded shadow-lg max-w-[300px]">
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
                        message.type === "assistant" ? "text-gray-500" : "text-gray-300",
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
    </div>
  )
}

