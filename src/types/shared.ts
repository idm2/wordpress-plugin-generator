export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface FileStructure {
  name: string
  type: "file" | "folder"
  content?: string
  path?: string
  children?: FileStructure[]
}

export interface FileReference {
  name: string
  type: string
  content?: string
  summary?: string
  isReference: boolean
}

export interface Message {
  id: string
  content: string
  type: "user" | "assistant"
  timestamp: string
  files?: FileReference[]
  imageUrls?: string[]
  imageAnalysis?: string[]
  codeUpdate?: boolean
}

export interface CodeVersion {
  id: string
  version: string
  code: string
  description?: string
  timestamp?: string
}

export interface ProcessedFile extends File {
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

