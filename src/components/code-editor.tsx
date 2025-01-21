"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { Light as SyntaxHighlighter } from "react-syntax-highlighter"
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript"
import php from "react-syntax-highlighter/dist/esm/languages/hljs/php"
import css from "react-syntax-highlighter/dist/esm/languages/hljs/css"
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/hljs"
import type { FileStructure } from "@/types/shared"

SyntaxHighlighter.registerLanguage("javascript", js)
SyntaxHighlighter.registerLanguage("php", php)
SyntaxHighlighter.registerLanguage("css", css)

interface CodeEditorProps {
  selectedFile: string | null
  fileStructure: FileStructure[]
  onCodeChange?: (newCode: string) => void
}

export function CodeEditor({ selectedFile, fileStructure, onCodeChange }: CodeEditorProps) {
  const [code, setCode] = useState<string>("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const content = getFileContent(selectedFile)
    setCode(content || "")
  }, [selectedFile, fileStructure])

  const getFileContent = (path: string | null): string => {
    if (!path) return ""

    const parts = path.split("/")
    let current: FileStructure | undefined = fileStructure[0]

    for (let i = 1; i < parts.length; i++) {
      if (!current) return ""
      if (current.type === "file") return current.content || ""
      current = current.children?.find((item) => item.name === parts[i])
    }

    return current?.content || ""
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
    setCode(newCode)
    onCodeChange?.(newCode)
  }

  const getLanguage = (fileName: string | null): string => {
    if (!fileName) return "text"
    if (fileName.endsWith(".php")) return "php"
    if (fileName.endsWith(".js")) return "javascript"
    if (fileName.endsWith(".css")) return "css"
    return "text"
  }

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const highlighterElement = e.currentTarget.previousSibling as HTMLElement
    if (highlighterElement) {
      highlighterElement.scrollTop = e.currentTarget.scrollTop
      highlighterElement.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  return (
    <div className="relative h-full overflow-hidden">
      {selectedFile ? (
        <>
          <SyntaxHighlighter
            language={getLanguage(selectedFile)}
            style={tomorrow}
            customStyle={{
              margin: 0,
              padding: "1rem",
              height: "100%",
              fontSize: "0.875rem",
              background: "transparent",
              pointerEvents: "none",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: "auto",
            }}
          >
            {code}
          </SyntaxHighlighter>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={handleCodeChange}
            onScroll={handleScroll}
            className="absolute top-0 left-0 w-full h-full bg-transparent text-transparent caret-black resize-none p-4 font-mono text-sm leading-normal overflow-auto"
            spellCheck={false}
            aria-label={`Code editor for ${selectedFile}`}
          />
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Select a file to view and edit its contents
        </div>
      )}
    </div>
  )
}

