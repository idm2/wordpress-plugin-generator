import { WordPressConnection } from "@/components/wordpress-connector";

export interface ChangelogEntry {
  id: string
  date: string
  description: string
  files?: string[]
  aiResponse?: string
  codeChanges?: string
  llmUsed?: string
}

export interface PluginDetails {
  name: string
  uri: string
  description: string
  version: string
  author: string
}

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
  content: string
  summary: string
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
  description: string
  timestamp: string
  fileChanges?: FileChange[]
}

export interface FileChange {
  path: string
  added: number
  deleted: number
  content: string
  previousContent?: string
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
    content?: string
    summary?: string
  }
}

export interface CompletePluginState {
  id: string
  name: string
  code: string
  description: string
  date: string
  pluginDetails: PluginDetails | null
  messages: Message[]
  codeVersions: CodeVersion[]
  currentVersionIndex: number
  fileStructure: FileStructure[]
  changelog: ChangelogEntry[]
  wordpressConnection?: WordPressConnection | null
}

