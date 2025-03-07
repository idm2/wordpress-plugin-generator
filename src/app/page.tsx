"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Download, Eye, RefreshCw, Code, Save, FolderOpen, FileText, Loader2, Wand2, Settings2 } from "lucide-react"
import { OpenAI } from "openai"
import { AdminDetailsModal } from "@/components/admin-details-modal"
import FileExplorer from "@/components/file-explorer"
import { CodeEditor } from "@/components/code-editor"
import { RevisionModal } from "@/components/revision-modal"
import { Changelog } from "@/components/changelog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { RichTextarea } from "@/components/rich-textarea"
import { PluginDetailsModal, type PluginDetails } from "@/components/plugin-details-modal"
import { PreviewModal } from "@/components/preview-modal"
import { createWordPressInstance, installPlugin, deleteWordPressInstance } from "@/lib/instawp"
import mammoth from "mammoth"
import { CodeSnippetModal } from "@/components/code-snippet-modal"
import { ModelSelector } from "@/components/ModelSelector"
import { PluginDiscussion } from "@/components/plugin-discussion"
import { processFile } from "@/lib/file-processor"
import type { FileReference, FileStructure, Message, ChatMessage, CodeVersion, ProcessedFile, CompletePluginState } from "@/types/shared"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VersionUpdateModal } from "@/components/version-update-modal"
import { config } from "@/config/env"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { FileDropZone } from '@/components/file-drop-zone'
import { v4 as uuidv4 } from 'uuid'
import { generateResponse } from "@/lib/ollama"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { generateFileChanges } from "@/lib/diff-utils"
import { DiffViewModal } from "@/components/diff-view-modal"
import { cleanupGeneratedCode, cleanAndFormatCode } from '@/lib/code-cleanup'

interface ChangelogEntry {
  id: string
  date: string
  description: string
  files?: string[]
  aiResponse?: string
  codeChanges?: string
  llmUsed?: string
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})

export default function PluginGenerator() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [revisionDescription, setRevisionDescription] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const [pluginName, setPluginName] = useState("my-plugin")
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileStructure, setFileStructure] = useState<FileStructure[]>([])
  const [previewSiteId, setPreviewSiteId] = useState<string | null>(null)
  const [isCreatingPreview, setIsCreatingPreview] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [revisionFiles, setRevisionFiles] = useState<File[]>([])
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])
  const [showPluginDetailsModal, setShowPluginDetailsModal] = useState(false)
  const [pluginDetails, setPluginDetails] = useState<PluginDetails | null>(null)
  const [hasFilledDetails, setHasFilledDetails] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isCodeSnippetModalOpen, setIsCodeSnippetModalOpen] = useState(false)
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [isRevisionInputActive, setIsRevisionInputActive] = useState(false)
  const [selectedModel, setSelectedModel] = useState<string>("anthropic")
  const [messages, setMessages] = useState<Message[]>([])
  const [codeVersions, setCodeVersions] = useState<CodeVersion[]>([])
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(-1)
  const [showVersionUpdateModal, setShowVersionUpdateModal] = useState(false)
  const [pendingCodeUpdate, setPendingCodeUpdate] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [generatedPlugin, setGeneratedPlugin] = useState(false)
  const tempMessageIdRef = useRef<string | null>(null)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const isInitialRender = useRef(true)
  const [showDiffModal, setShowDiffModal] = useState(false)
  const [selectedVersionForDiff, setSelectedVersionForDiff] = useState<string | null>(null)
  const [selectedFileForDiff, setSelectedFileForDiff] = useState<string | null>(null)

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (previewSiteId) {
        deleteSite(previewSiteId)
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      if (previewSiteId) {
        deleteSite(previewSiteId)
      }
    }
  }, [previewSiteId])

  const deleteSite = async (siteId: string) => {
    try {
      await deleteWordPressInstance(siteId)
      console.log("Preview site deleted successfully")
    } catch (error) {
      console.error("Error deleting preview site:", error)
    }
  }

  // Helper function to update a file in the structure
  const updateFileInStructure = (structure: FileStructure[], filePath: string, content: string) => {
    const parts = filePath.split('/');
    const fileName = parts.pop() || '';
    
    let current = structure;
    let currentPath = '';
    
    // Navigate to the correct folder
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      let folder = current.find(item => item.type === 'folder' && item.name === part);
      
      if (!folder) {
        folder = {
          name: part,
          type: 'folder',
          path: currentPath,
          children: []
        };
        current.push(folder);
      }
      
      if (!folder.children) {
        folder.children = [];
      }
      
      current = folder.children;
    }
    
    // Update or create the file
    const filePath2 = currentPath ? `${currentPath}/${fileName}` : fileName;
    const existingFile = current.find(item => item.type === 'file' && item.name === fileName);
    
    if (existingFile) {
      existingFile.content = content;
    } else {
      current.push({
        name: fileName,
        type: 'file',
        content,
        path: filePath2
      });
    }
  }

  // Helper function to add a file to the structure
  const addFileToStructure = (structure: FileStructure[], filePath: string, content: string) => {
    const parts = filePath.split('/');
    const fileName = parts.pop() || '';
    
    let current = structure;
    let currentPath = '';
    
    // Create folders as needed
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      let folder = current.find(item => item.type === 'folder' && item.name === part);
      
      if (!folder) {
        folder = {
          name: part,
          type: 'folder',
          path: currentPath,
          children: []
        };
        current.push(folder);
      }
      
      if (!folder.children) {
        folder.children = [];
      }
      
      current = folder.children;
    }
    
    // Add the file
    const filePath2 = currentPath ? `${currentPath}/${fileName}` : fileName;
    current.push({
      name: fileName,
      type: 'file',
      content,
      path: filePath2
    });
  }

  const parseCodeToFileStructure = (code: string): FileStructure[] => {
    // Create a new structure from the code
    const structure: FileStructure[] = [];
    
    // Try to parse using file markers first
    const fileMarkerRegex = /\/\*\s*FILE:\s*([^\s]+)\s*\*\/\s*([^]*?)(?=\/\*\s*FILE:|$)/g;
    let match;
    let foundFiles = false;
    
    while ((match = fileMarkerRegex.exec(code)) !== null) {
      foundFiles = true;
      const filePath = match[1].trim();
      const fileContent = match[2].trim();
      
      // Add the file to the structure
      addFileToStructure(structure, filePath, fileContent);
    }
    
    // If no files were found with markers, try to identify PHP files
    if (!foundFiles) {
      // Look for PHP files
      const phpFileRegex = /(?:\/\*\*[\s\S]*?\*\/\s*)?(?:\/\*[\s\S]*?\*\/\s*)?(<\?php[\s\S]*?(?:\?>|$))/g;
      let phpMatch;
      
      while ((phpMatch = phpFileRegex.exec(code)) !== null) {
        const phpContent = phpMatch[0];
        
        // Try to extract the plugin name from the content
        const pluginNameMatch = phpContent.match(/Plugin Name:\s*([^\r\n]+)/);
        const pluginName = (pluginNameMatch ? pluginNameMatch[1].trim() : pluginDetails?.name || 'plugin').toLowerCase().replace(/\s+/g, '-');
        
        // Determine the file name based on content
        let fileName = `${pluginName}.php`;
        
        // Check if it's an admin class
        if (phpContent.includes('class Admin') || phpContent.includes('admin-specific')) {
          fileName = `admin/class-${pluginName}-admin.php`;
        } 
        // Check if it's a public class
        else if (phpContent.includes('class Public') || phpContent.includes('public-facing')) {
          fileName = `public/class-${pluginName}-public.php`;
        }
        // Check if it's an includes file
        else if (phpContent.includes('class Activator') || phpContent.includes('class Deactivator') || phpContent.includes('class I18n') || phpContent.includes('class Loader')) {
          const classMatch = phpContent.match(/class\s+([A-Za-z0-9_]+)/);
          if (classMatch) {
            const className = classMatch[1].toLowerCase();
            fileName = `includes/class-${pluginName}-${className}.php`;
          }
        }
        
        // Add the file to the structure
        addFileToStructure(structure, fileName, phpContent);
      }
    }
    
    // If still no files were found, create a default structure with a single file
    if (structure.length === 0) {
      const pluginName = pluginDetails?.name || 'plugin';
      const mainFile = `${pluginName}.php`;
      
      structure.push({
        name: mainFile,
        type: 'file',
        content: code,
        path: mainFile
      });
    }
    
    return structure;
  }

  const addCodeVersion = (code: string, description: string = '', versionNumber?: string) => {
    const versionString = versionNumber || `v${(codeVersions.length + 1).toString().padStart(2, '0')}`
    
    // Generate file structure for the new code
    const newStructure = parseCodeToFileStructure(code)
    
    // Get the previous file structure
    const previousStructure = codeVersions.length > 0 ? parseCodeToFileStructure(codeVersions[codeVersions.length - 1].code) : null
    
    // Generate file changes
    const fileChanges = generateFileChanges(previousStructure, newStructure)
    
    console.log('Generated file changes:', fileChanges);
    
    const versionEntry: CodeVersion = {
      id: Date.now().toString(),
      version: versionString,
      code,
      timestamp: new Date().toISOString(),
      description,
      fileChanges
    }
    
    const updatedVersions = [...codeVersions, versionEntry]
    setCodeVersions(updatedVersions)
    setCurrentVersionIndex(updatedVersions.length - 1)
    
    // Update plugin details with new version
    if (pluginDetails && versionNumber) {
      setPluginDetails({
        ...pluginDetails,
        version: versionNumber
      })
    }
    
    // Add a message to indicate the new version
    const versionMessage: Message = {
      id: Date.now().toString(),
      content: `Created version ${versionEntry.version} (${new Date(versionEntry.timestamp).toLocaleString()})${description ? `: ${description}` : ''}`,
      type: "assistant",
      timestamp: new Date().toISOString(),
      codeUpdate: true
    }
    setMessages(prev => [versionMessage, ...prev])
  }

  const revertToVersion = (versionId: string) => {
    const versionIndex = codeVersions.findIndex(v => v.id === versionId)
    if (versionIndex !== -1) {
      const version = codeVersions[versionIndex]
      setGeneratedCode(version.code)
      createFileStructure(version.code)
      setCurrentVersionIndex(versionIndex)
      
      // Add a message to indicate the reversion
      const revertMessage: Message = {
        id: Date.now().toString(),
        content: `Reverted to ${version.version} (${new Date(version.timestamp).toLocaleString()})`,
        type: "assistant",
        timestamp: new Date().toISOString(),
        codeUpdate: true
      }
      setMessages(prev => [revertMessage, ...prev])
    }
  }

  const revertBySteps = (steps: number) => {
    const targetIndex = currentVersionIndex - steps
    if (targetIndex >= 0 && targetIndex < codeVersions.length) {
      const version = codeVersions[targetIndex]
      setGeneratedCode(version.code)
      createFileStructure(version.code)
      setCurrentVersionIndex(targetIndex)
      
      // Add a message to indicate the reversion
      const revertMessage: Message = {
        id: Date.now().toString(),
        content: `Reverted back ${steps} version${steps === 1 ? '' : 's'} to ${version.version} (${new Date(version.timestamp).toLocaleString()})`,
        type: "assistant",
        timestamp: new Date().toISOString(),
        codeUpdate: true
      }
      setMessages(prev => [revertMessage, ...prev])
      return true
    }
    return false
  }

  const generateCode = async () => {
    if (!description && attachedFiles.length === 0) {
      setShowValidationModal(true)
      return
    }

    if (!hasFilledDetails) {
      setShowPluginDetailsModal(true)
      return
    }

    if (!pluginDetails) {
      setError("Please fill in plugin details first")
      return
    }

    setLoading(true)
    setError(null)
    setIsStreaming(false)

    try {
      let fullRequest = description

      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          // Cast to ProcessedFile to access imageUrl and imageAnalysis
          const processedFile = file as unknown as ProcessedFile;
          
          if (processedFile.imageUrl && processedFile.imageAnalysis) {
            // Handle image files with analysis
            fullRequest += `\n\nImage content (${file.name}): ${processedFile.imageAnalysis}`
          } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const arrayBuffer = await file.arrayBuffer()
            const result = await mammoth.extractRawText({ arrayBuffer })
            fullRequest += "\n" + result.value
          } else if (file.type === "text/plain") {
            const text = await file.text()
            fullRequest += "\n" + text
          } else if (processedFile.metadata?.content) {
            // Use metadata content if available
            fullRequest += `\n\n${processedFile.metadata.content}`
          }
        }
      }

      const messages = [
        {
          role: "system",
          content: `You are an expert WordPress plugin developer. Generate a complete, functional WordPress plugin. The response should be ONLY the plugin code, without any markdown formatting or explanation. The code must:
1. Start with the standard WordPress plugin header comment
2. Begin with <?php on the first line
3. Follow WordPress coding standards
4. Include proper security checks and initialization
5. Be production-ready and fully functional`,
        },
        {
          role: "user",
          content: `Create a WordPress plugin with these details:
Name: ${pluginDetails.name}
Plugin URI: ${pluginDetails.uri}
Description: ${pluginDetails.description}
Version: ${pluginDetails.version}
Author: ${pluginDetails.author}

Functionality: ${fullRequest}`,
        },
      ]

      let generatedCode = ""
      let tempCode = ""

      if (selectedModel === "openai") {
        if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
          throw new Error("OpenAI API key is not configured")
        }

        const openai = new OpenAI({
          apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
          dangerouslyAllowBrowser: true,
        })

        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })) as { role: "system" | "user" | "assistant"; content: string }[],
          stream: true,
        })

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            tempCode += content
            setGeneratedCode(tempCode)
          }
        }
        generatedCode = tempCode
      } else if (selectedModel === "anthropic") {
        setIsStreaming(true)
        const tempMessageId = tempMessageIdRef.current
        const response = await fetch("/api/anthropic", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
          }),
        })

        if (!response.ok) {
          const errorData = await response.text()
          throw new Error(`Anthropic API error: ${errorData || response.statusText}`)
        }

        // Handle streaming response
        const reader = response.body?.getReader()
        if (!reader) throw new Error("No response stream available")

        const decoder = new TextDecoder()
        tempCode = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(Boolean)

          for (const line of lines) {
            if (line.startsWith('event: chunk')) {
              try {
                const dataLine = lines.find(l => l.startsWith('data:'))
                if (dataLine) {
                  const data = JSON.parse(dataLine.slice(5))
                  if (data.text) {
                    tempCode += data.text
                    setGeneratedCode(tempCode)
                  }
                }
              } catch (e) {
                console.error('Error parsing chunk:', e)
              }
            } else if (line.startsWith('event: error')) {
              const dataLine = lines.find(l => l.startsWith('data:'))
              if (dataLine) {
                try {
                  const data = JSON.parse(dataLine.slice(5))
                  throw new Error(data.error || 'Unknown error')
                } catch (e) {
                  throw new Error('Error in stream: ' + e)
                }
              }
            } else if (line.startsWith('event: end')) {
              setIsStreaming(false)
            }
          }
        }
        
        generatedCode = tempCode
        setIsStreaming(false)
      } else if (selectedModel === "deepseek") {
        setIsStreaming(true)
        tempCode = ""
        
        try {
          const response = await fetch("/api/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages,
              model: selectedModel,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            let errorMessage = "Failed to generate code: " + response.status
            try {
              const errorJson = JSON.parse(errorText)
              errorMessage += " - " + (errorJson.error || errorText)
            } catch (e) {
              errorMessage += " - " + errorText
            }
            throw new Error(errorMessage)
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error("No response stream available")

          const decoder = new TextDecoder()
          let buffer = ""
          
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ""

            for (const line of lines) {
              const trimmedLine = line.trim()
              if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue

              try {
                const data = JSON.parse(trimmedLine.slice(6))
                if (data.content) {
                  tempCode += data.content
                  setGeneratedCode(tempCode)
                }
                if (data.error) {
                  throw new Error(data.error)
                }
              } catch (e) {
                console.error('Error parsing chunk:', e)
              }
            }
          }
          
          generatedCode = tempCode
        } catch (error) {
          console.error("DeepSeek API error:", error)
          throw error
        } finally {
          setIsStreaming(false)
        }
      } else {
        throw new Error(`Unsupported model: ${selectedModel}`)
      }

      // Clean up the generated code
      generatedCode = generatedCode
        .replace(/^```(?:php)?\s*|\s*```$/g, "")
        .replace(/^[\s\S]*?<\?php/, "<?php")
        .replace(/\n<\?php/g, "")
        .trim()

      if (!generatedCode.startsWith("<?php")) {
        generatedCode = "<?php\n" + generatedCode
      }

      setGeneratedCode(generatedCode)
      createFileStructure(generatedCode)
      addCodeVersion(generatedCode, description || 'Initial plugin generation')

      // After successful code generation, set generatedPlugin to true
      console.log("Setting generatedPlugin to true after successful code generation")
      setGeneratedPlugin(true)
    } catch (err) {
      console.error("Error generating code:", err)
      setError(`Error generating code: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
      setIsStreaming(false)
    }
  }

  const generateAIResponse = async (
    userMessage: string,
    currentCode: string,
  ): Promise<{ message: string; codeUpdate?: string }> => {
    let response = ""
    const systemMessage: ChatMessage = {
        role: "system",
      content: `You are a WordPress plugin development expert. Your task is to help create or modify WordPress plugins based on user requirements. Current plugin code:\n\n${currentCode}`,
    }
    const userMsg: ChatMessage = {
        role: "user",
        content: userMessage,
    }
    const messages: ChatMessage[] = [systemMessage, userMsg]

    try {
      if (selectedModel === "openai") {
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })) as { role: "system" | "user" | "assistant"; content: string }[],
        })
        response = completion.choices[0].message.content || ""
      } else if (selectedModel === "deepseek") {
        const result = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            model: selectedModel,
          }),
        })

        if (!result.ok) {
          throw new Error("Failed to generate response")
        }

        const data = await result.json()
        response = data.content
      } else {
        throw new Error(`Unsupported model: ${selectedModel}`)
      }

        return parseAIResponse(response)
    } catch (error) {
      console.error("Error generating response:", error)
      throw error
    }
  }

  const parseAIResponse = (response: string): { message: string; codeUpdate?: string } => {
    const codeBlockRegex = /```(?:php)?\s*([\s\S]*?)```/
    const match = response.match(codeBlockRegex)

    if (match) {
      let code = match[1]
        .replace(/^[\s\S]*?<\?php\s*/m, "<?php\n")
        .replace(/\n<\?php/g, "")
        .trim()
    
      // Clean up code to remove artifacts that could break WordPress plugins
      code = cleanAndFormatCode(code)

      const message = response.replace(codeBlockRegex, "").trim()

      if (!code.includes("Plugin Name:") && generatedCode.includes("Plugin Name:")) {
        const existingHeader = generatedCode.match(/\/\*[\s\S]*?\*\//)?.[0] || ""
        return {
          message,
          codeUpdate: `${existingHeader}\n\n${code}`,
        }
      }

      return {
        message,
        codeUpdate: code.startsWith("<?php") ? code : `<?php\n${code}`,
      }
    }

    return { message: response }
  }

  const createFileStructure = (code: string) => {
    if (!pluginDetails?.name) return

    const pluginName = pluginDetails.name
    const isTraditional = pluginDetails.structure === "traditional"

    const headerMatch = code.match(/\/\*[\s\S]*?\*\//)
    const pluginHeader = headerMatch ? headerMatch[0] : ""
    const mainCode = code.replace(headerMatch?.[0] || "", "").trim()
    const customFunctions = extractCustomFunctions(mainCode)

    const structure: FileStructure[] = [
      {
        name: pluginName,
        type: "folder",
        children: isTraditional
          ? [
          {
            name: "admin",
            type: "folder",
            children: [
                  {
                    name: `class-${pluginName.toLowerCase()}-admin.php`,
                    type: "file",
                    content: generateAdminClass(pluginName),
                    path: `${pluginName}/admin/class-${pluginName.toLowerCase()}-admin.php`
                  },
              {
                name: "css",
                type: "folder",
                    children: [
                      {
                        name: "index.php",
                        type: "file",
                        content: "<?php // Silence is golden",
                        path: `${pluginName}/admin/css/index.php`
                      }
                    ]
              },
              {
                name: "js",
                type: "folder",
                    children: [
                      {
                        name: "index.php",
                        type: "file",
                        content: "<?php // Silence is golden",
                        path: `${pluginName}/admin/js/index.php`
                      }
                    ]
                  },
                  {
                    name: "partials",
                    type: "folder",
                    children: [
                      {
                        name: "index.php",
                type: "file",
                        content: "<?php // Silence is golden",
                        path: `${pluginName}/admin/partials/index.php`
                      }
                    ]
                  }
                ]
          },
          {
            name: "includes",
            type: "folder",
            children: [
              {
                    name: `class-${pluginName.toLowerCase()}-activator.php`,
                type: "file",
                    content: generateActivatorClass(pluginName),
                    path: `${pluginName}/includes/class-${pluginName.toLowerCase()}-activator.php`
              },
              {
                    name: `class-${pluginName.toLowerCase()}-deactivator.php`,
                type: "file",
                    content: generateDeactivatorClass(pluginName),
                    path: `${pluginName}/includes/class-${pluginName.toLowerCase()}-deactivator.php`
                  },
                  {
                    name: `class-${pluginName.toLowerCase()}-i18n.php`,
                    type: "file",
                    content: generateI18nClass(pluginName),
                    path: `${pluginName}/includes/class-${pluginName.toLowerCase()}-i18n.php`
                  },
                  {
                    name: `class-${pluginName.toLowerCase()}-loader.php`,
                    type: "file",
                    content: generateLoaderClass(pluginName),
                    path: `${pluginName}/includes/class-${pluginName.toLowerCase()}-loader.php`
                  },
                  {
                    name: `class-${pluginName.toLowerCase()}.php`,
                    type: "file",
                    content: generateMainClass(pluginName),
                    path: `${pluginName}/includes/class-${pluginName.toLowerCase()}.php`
                  },
                  {
                    name: "index.php",
                    type: "file",
                    content: "<?php // Silence is golden",
                    path: `${pluginName}/includes/index.php`
                  }
                ]
              },
              {
                name: "languages",
                type: "folder",
                children: [
                  {
                    name: "index.php",
                    type: "file",
                    content: "<?php // Silence is golden",
                    path: `${pluginName}/languages/index.php`
                  },
                  {
                    name: `${pluginName.toLowerCase()}.pot`,
                    type: "file",
                    content: "",
                    path: `${pluginName}/languages/${pluginName.toLowerCase()}.pot`
                  }
                ]
          },
          {
            name: "public",
            type: "folder",
            children: [
                  {
                    name: `class-${pluginName.toLowerCase()}-public.php`,
                    type: "file",
                    content: generatePublicClass(pluginName),
                    path: `${pluginName}/public/class-${pluginName.toLowerCase()}-public.php`
                  },
              {
                name: "css",
                type: "folder",
                    children: [
                      {
                        name: "index.php",
                        type: "file",
                        content: "<?php // Silence is golden",
                        path: `${pluginName}/public/css/index.php`
                      }
                    ]
              },
              {
                name: "js",
                type: "folder",
                    children: [
                      {
                        name: "index.php",
                        type: "file",
                        content: "<?php // Silence is golden",
                        path: `${pluginName}/public/js/index.php`
                      }
                    ]
                  },
                  {
                    name: "partials",
                    type: "folder",
                    children: [
                      {
                        name: "index.php",
                type: "file",
                        content: "<?php // Silence is golden",
                        path: `${pluginName}/public/partials/index.php`
                      }
                    ]
                  }
                ]
              },
              {
                name: "index.php",
                type: "file",
                content: "<?php // Silence is golden",
                path: `${pluginName}/index.php`
              },
              {
                name: "LICENSE.txt",
            type: "file",
                content: generateLicenseContent(),
                path: `${pluginName}/LICENSE.txt`
              },
              {
                name: "README.txt",
                type: "file",
                content: generateReadmeContent(pluginName),
                path: `${pluginName}/README.txt`
              },
              {
                name: `${pluginName}.php`,
                type: "file",
                content: generateMainPluginFile(pluginHeader, customFunctions, pluginName),
                path: `${pluginName}/${pluginName}.php`
              },
              {
                name: "uninstall.php",
                type: "file",
                content: generateUninstallContent(),
                path: `${pluginName}/uninstall.php`
              }
            ]
          : [
              {
                name: `${pluginName}.php`,
                type: "file",
                content: code,
                path: `${pluginName}/${pluginName}.php`
              }
            ]
      }
    ]

    setFileStructure(structure)
    setSelectedFile(`${pluginName}/${pluginName}.php`)
  }

  // Helper functions to generate class files
  const generateMainPluginFile = (pluginHeader: string, customFunctions: string, pluginName: string) => {
    return `${pluginHeader}

if (!defined('WPINC')) {
  die;
}

define('${pluginName.toUpperCase()}_VERSION', '${pluginDetails?.version || '1.0.0'}');

${customFunctions}

/**
 * The code that runs during plugin activation.
 */
function activate_${pluginName.toLowerCase()}() {
  require_once plugin_dir_path(__FILE__) . 'includes/class-activator.php';
  ${pluginName}_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 */
function deactivate_${pluginName.toLowerCase()}() {
  require_once plugin_dir_path(__FILE__) . 'includes/class-deactivator.php';
  ${pluginName}_Deactivator::deactivate();
}

register_activation_hook(__FILE__, 'activate_${pluginName.toLowerCase()}');
register_deactivation_hook(__FILE__, 'deactivate_${pluginName.toLowerCase()}');

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require_once plugin_dir_path(__FILE__) . 'includes/class-loader.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-i18n.php';
require_once plugin_dir_path(__FILE__) . 'admin/class-admin.php';
require_once plugin_dir_path(__FILE__) . 'public/class-public.php';

/**
 * Begins execution of the plugin.
 */
function run_${pluginName.toLowerCase()}() {
  $plugin = new ${pluginName}_Loader();
  $plugin->run();
}
run_${pluginName.toLowerCase()}();`
  }

  const generateAdminClass = (pluginName: string) => {
    return `<?php
/**
 * The admin-specific functionality of the plugin.
 */
class ${pluginName}_Admin {
  private $plugin_name;
  private $version;

  public function __construct($plugin_name, $version) {
    $this->plugin_name = $plugin_name;
    $this->version = $version;
  }

  public function enqueue_styles() {
    wp_enqueue_style(
      $this->plugin_name,
      plugin_dir_url(__FILE__) . 'css/admin.css',
      array(),
      $this->version,
      'all'
    );
  }

  public function enqueue_scripts() {
    wp_enqueue_script(
      $this->plugin_name,
      plugin_dir_url(__FILE__) . 'js/admin.js',
      array('jquery'),
      $this->version,
      false
    );
  }
}`
  }

  const generatePublicClass = (pluginName: string) => {
    return `<?php
/**
 * The public-facing functionality of the plugin.
 */
class ${pluginName}_Public {
  private $plugin_name;
  private $version;

  public function __construct($plugin_name, $version) {
    $this->plugin_name = $plugin_name;
    $this->version = $version;
  }

  public function enqueue_styles() {
    wp_enqueue_style(
      $this->plugin_name,
      plugin_dir_url(__FILE__) . 'css/public.css',
      array(),
      $this->version,
      'all'
    );
  }

  public function enqueue_scripts() {
    wp_enqueue_script(
      $this->plugin_name,
      plugin_dir_url(__FILE__) . 'js/public.js',
      array('jquery'),
      $this->version,
      false
    );
  }
}`
  }

  const generateActivatorClass = (pluginName: string) => {
    return `<?php
/**
 * Fired during plugin activation.
 */
class ${pluginName}_Activator {
  public static function activate() {
    // Activation code here
  }
}`
  }

  const generateDeactivatorClass = (pluginName: string) => {
    return `<?php
/**
 * Fired during plugin deactivation.
 */
class ${pluginName}_Deactivator {
  public static function deactivate() {
    // Deactivation code here
  }
}`
  }

  const generateI18nClass = (pluginName: string) => {
    return `<?php
/**
 * Define the internationalization functionality.
 */
class ${pluginName}_i18n {
  public function load_plugin_textdomain() {
    load_plugin_textdomain(
      '${pluginName.toLowerCase()}',
      false,
      dirname(dirname(plugin_basename(__FILE__))) . '/languages/'
    );
  }
}`
  }

  const generateLoaderClass = (pluginName: string) => {
    return `<?php
/**
 * Register all actions and filters for the plugin.
 */
class ${pluginName}_Loader {
  protected $actions;
  protected $filters;

  public function __construct() {
    $this->actions = array();
    $this->filters = array();
  }

  public function add_action($hook, $component, $callback, $priority = 10, $accepted_args = 1) {
    $this->actions = $this->add($this->actions, $hook, $component, $callback, $priority, $accepted_args);
  }

  public function add_filter($hook, $component, $callback, $priority = 10, $accepted_args = 1) {
    $this->filters = $this->add($this->filters, $hook, $component, $callback, $priority, $accepted_args);
  }

  private function add($hooks, $hook, $component, $callback, $priority, $accepted_args) {
    $hooks[] = array(
      'hook'          => $hook,
      'component'     => $component,
      'callback'      => $callback,
      'priority'      => $priority,
      'accepted_args' => $accepted_args
    );
    return $hooks;
  }

  public function run() {
    foreach ($this->filters as $hook) {
      add_filter($hook['hook'], array($hook['component'], $hook['callback']), $hook['priority'], $hook['accepted_args']);
    }
    foreach ($this->actions as $hook) {
      add_action($hook['hook'], array($hook['component'], $hook['callback']), $hook['priority'], $hook['accepted_args']);
    }
  }
}`
  }

  const generateMainClass = (pluginName: string) => {
    return `<?php
/**
 * The core plugin class.
 */
class ${pluginName} {
  protected $loader;
  protected $plugin_name;
  protected $version;

  public function __construct() {
    if (defined('${pluginName.toUpperCase()}_VERSION')) {
      $this->version = ${pluginName.toUpperCase()}_VERSION;
    } else {
      $this->version = '1.0.0';
    }
    $this->plugin_name = '${pluginName.toLowerCase()}';

    $this->load_dependencies();
    $this->set_locale();
    $this->define_admin_hooks();
    $this->define_public_hooks();
  }

  private function load_dependencies() {
    require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-${pluginName.toLowerCase()}-loader.php';
    require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-${pluginName.toLowerCase()}-i18n.php';
    require_once plugin_dir_path(dirname(__FILE__)) . 'admin/class-${pluginName.toLowerCase()}-admin.php';
    require_once plugin_dir_path(dirname(__FILE__)) . 'public/class-${pluginName.toLowerCase()}-public.php';

    $this->loader = new ${pluginName}_Loader();
  }

  private function set_locale() {
    $plugin_i18n = new ${pluginName}_i18n();
    $this->loader->add_action('plugins_loaded', $plugin_i18n, 'load_plugin_textdomain');
  }

  private function define_admin_hooks() {
    $plugin_admin = new ${pluginName}_Admin($this->get_plugin_name(), $this->get_version());
    $this->loader->add_action('admin_enqueue_scripts', $plugin_admin, 'enqueue_styles');
    $this->loader->add_action('admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts');
  }

  private function define_public_hooks() {
    $plugin_public = new ${pluginName}_Public($this->get_plugin_name(), $this->get_version());
    $this->loader->add_action('wp_enqueue_scripts', $plugin_public, 'enqueue_styles');
    $this->loader->add_action('wp_enqueue_scripts', $plugin_public, 'enqueue_scripts');
  }

  public function run() {
    $this->loader->run();
  }

  public function get_plugin_name() {
    return $this->plugin_name;
  }

  public function get_loader() {
    return $this->loader;
  }

  public function get_version() {
    return $this->version;
  }
}`
  }

  const generateLicenseContent = () => {
    return `                    GNU GENERAL PUBLIC LICENSE
                       Version 2, June 1991

 Copyright (C) 1989, 1991 Free Software Foundation, Inc.,
 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA
 Everyone is permitted to copy and distribute verbatim copies
 of this license document, but changing it is not allowed.`
  }

  const generateReadmeContent = (pluginName: string) => {
    return `=== ${pluginName} ===
Contributors: (this should be a list of wordpress.org userid's)
Tags: comments, spam
Requires at least: 6.0
Tested up to: 6.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Here is a short description of the plugin.

== Description ==

This is the long description. No limit, and you can use Markdown (as well as in the following sections).

== Installation ==

1. Upload \`${pluginName}\` to the \`/wp-content/plugins/\` directory
2. Activate the plugin through the 'Plugins' menu in WordPress

== Changelog ==

= 1.0 =
* Initial release`
  }

  const generateUninstallContent = () => {
    return `<?php
// If uninstall not called from WordPress, then exit.
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}`
  }

  const handlePreview = async () => {
    if (!generatedCode || !pluginName) {
      setError("Please generate code and enter a plugin name before previewing.")
      return
    }

    setLoading(true)
    setError(null)
    setIsCreatingPreview(true)

    try {
      const instance = await createWordPressInstance(pluginName)
      await installPlugin(instance.id, generatedCode, pluginName)
      setPreviewUrl(instance.adminUrl)
      setPreviewSiteId(instance.id)
      setIsPreviewModalOpen(true)
    } catch (err) {
      console.error("Error creating preview:", err)
      setError(`Error creating preview site: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
      setIsCreatingPreview(false)
    }
  }

  const handleClosePreview = async () => {
    setIsPreviewModalOpen(false)
    if (previewSiteId) {
      try {
        await deleteWordPressInstance(previewSiteId)
        setPreviewSiteId(null)
        setPreviewUrl(null)
      } catch (error) {
        console.error("Error deleting preview site:", error)
      }
    }
  }

  const downloadPlugin = async () => {
    if (!generatedCode || !pluginName) {
      setError("Please generate code and enter a plugin name before downloading.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/generate/export-plugin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pluginName,
          code: generatedCode,
          structure: pluginDetails?.structure || "simplified"
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      if (blob.size === 0) {
        throw new Error("Received empty response from server")
      }

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${pluginName}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Download error:", err)
      setError(`Error downloading plugin: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!content.trim() && (!files || files.length === 0)) return

    const timestamp = new Date().toISOString()
    const messageId = uuidv4()
    const tempMessageId = uuidv4()
    tempMessageIdRef.current = tempMessageId

    let messageContent = content
    let imageUrls: string[] = []
    let imageAnalysis: string[] = []
    
    const userMessage: Message = {
      id: messageId,
      content: messageContent,
      type: "user",
      timestamp,
    }

    if (files && files.length > 0) {
      console.log("Processing files for message:", files.length, "files")
      const processedFiles: FileReference[] = []
      
      for (const file of files) {
        try {
          // Cast to ProcessedFile to access imageUrl and imageAnalysis
          const processed = file as unknown as ProcessedFile
          
          console.log("Processing file in handleSendMessage:", file.name, processed)
          
          // Add to processed files if metadata exists
          if (processed.metadata) {
            if (processed.metadata.content) {
              messageContent += "\n\nContent from " + file.name + ":\n" + processed.metadata.content
            }
            
            processedFiles.push({
              name: processed.metadata.name,
              type: processed.metadata.type,
              content: processed.metadata.content || "",
              summary: processed.metadata.summary || "",
              isReference: true
            })
          }
          
          // Handle image files
          if (processed.imageUrl) {
            console.log("Adding image URL to message:", processed.imageUrl)
            imageUrls.push(processed.imageUrl)
            
            if (processed.imageAnalysis) {
              console.log("Adding image analysis to message:", processed.imageAnalysis)
              imageAnalysis.push(processed.imageAnalysis)
            } else {
              // Add placeholder if no analysis
              imageAnalysis.push("No analysis available for this image")
            }
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error)
        }
      }
      
      userMessage.files = processedFiles
      userMessage.content = messageContent
      
      // Add image URLs and analysis to the message if present
      if (imageUrls.length > 0) {
        console.log("Adding image URLs to message:", imageUrls.length)
        userMessage.imageUrls = imageUrls
        
        if (imageAnalysis.length > 0) {
          userMessage.imageAnalysis = imageAnalysis
        }
      }
    }

    const tempMessage: Message = {
      id: tempMessageId,
      content: "",
      type: "assistant",
      timestamp: new Date().toISOString(),
    }
    
    setMessages(prev => {
      const uniqueMessages = Array.from(new Map(prev.map(msg => [msg.id, msg])).values())
      return [tempMessage, userMessage, ...uniqueMessages]
    })
    
    try {
      // Get the last 10 messages for context
      const recentMessages = messages.slice(0, 10).reverse()
      
      const conversationHistory: ChatMessage[] = [
        {
          role: "system" as const,
          content: `You are a WordPress plugin development expert. Your task is to help create or modify WordPress plugins based on user requirements. 
Remember previous interactions within this session.

Current plugin code:
${generatedCode}

Current plugin version: ${pluginDetails?.version || '1.0.0'}
Plugin name: ${pluginDetails?.name || pluginName}`,
        },
        ...recentMessages.map(msg => ({
          role: msg.type === "user" ? ("user" as const) : ("assistant" as const),
          content: msg.content
        })),
        {
          role: "user" as const,
          content: messageContent,
        }
      ]

      let tempResponse = ""
      let codeBlock = ""
      let isInCodeBlock = false
      let lastUpdateTime = Date.now()
      const updateInterval = 200

      if (selectedModel === "openai") {
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: conversationHistory,
          stream: true,
        })

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            tempResponse += content
            
            if (content.includes('```')) {
              isInCodeBlock = !isInCodeBlock
            } else if (isInCodeBlock) {
              codeBlock += content
            }
            
            const now = Date.now()
            if (now - lastUpdateTime >= updateInterval && tempMessageIdRef.current === tempMessageId) {
              setMessages(prev => {
                const uniqueMessages = Array.from(new Map(prev.map(msg => [msg.id, msg])).values())
                return uniqueMessages.map(msg => 
                  msg.id === tempMessageId 
                    ? { ...msg, content: tempResponse }
                    : msg
                )
              })
              lastUpdateTime = now
            }
          }
        }
      } else if (selectedModel === "anthropic") {
        const response = await fetch("/api/anthropic", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: conversationHistory,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Anthropic API error: ${errorData || response.statusText}`);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream available");

        const decoder = new TextDecoder();
        tempResponse = "";
        isInCodeBlock = false;
        codeBlock = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(Boolean);

          for (const line of lines) {
            if (line.startsWith('event: chunk')) {
              try {
                const dataLine = lines.find(l => l.startsWith('data:'));
                if (dataLine) {
                  const data = JSON.parse(dataLine.slice(5));
                  if (data.text) {
                    tempResponse += data.text;
                    
                    if (data.text.includes('```')) {
                      isInCodeBlock = !isInCodeBlock;
                    } else if (isInCodeBlock) {
                      codeBlock += data.text;
                    }
                    
                    const now = Date.now();
                    if (now - lastUpdateTime >= updateInterval && tempMessageIdRef.current === tempMessageId) {
                      setMessages(prev => {
                        const uniqueMessages = Array.from(new Map(prev.map(msg => [msg.id, msg])).values());
                        return uniqueMessages.map(msg => 
                          msg.id === tempMessageId 
                            ? { ...msg, content: tempResponse }
                            : msg
                        );
                      });
                      lastUpdateTime = now;
                    }
                  }
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            } else if (line.startsWith('event: error')) {
              const dataLine = lines.find(l => l.startsWith('data:'));
              if (dataLine) {
                try {
                  const data = JSON.parse(dataLine.slice(5));
                  throw new Error(data.error || 'Unknown error');
                } catch (e) {
                  throw new Error('Error in stream: ' + e);
                }
              }
            } else if (line.startsWith('event: end')) {
              setIsStreaming(false);
            }
          }
        }
      } else {
        throw new Error(`Unsupported model: ${selectedModel}`)
      }

      if (tempMessageIdRef.current === tempMessageId) {
        const parsedResponse = parseAIResponse(tempResponse)
        
        setMessages(prev => {
          const uniqueMessages = Array.from(new Map(prev.map(msg => [msg.id, msg])).values())
          return uniqueMessages.map(msg => 
            msg.id === tempMessageId 
              ? { 
                  ...msg, 
                  content: parsedResponse.message,
                  codeUpdate: !!parsedResponse.codeUpdate
                }
              : msg
          )
        })
        
        if (parsedResponse.codeUpdate) {
          handleCodeUpdate(parsedResponse.codeUpdate)
        }
      }
    } catch (error) {
      console.error("Error generating AI response:", error)
      if (tempMessageIdRef.current === tempMessageId) {
        setMessages(prev => {
          const uniqueMessages = Array.from(new Map(prev.map(msg => [msg.id, msg])).values())
          return uniqueMessages.map(msg => 
            msg.id === tempMessageId 
              ? {
                  ...msg,
                  content: error instanceof Error ? error.message : "An error occurred",
                }
              : msg
          )
        })
      }
    } finally {
      if (tempMessageIdRef.current === tempMessageId) {
        tempMessageIdRef.current = null
      }
    }
  }

  const handleSavePlugin = () => {
    if (!generatedCode || !pluginName) {
      setError("Please generate code and enter a plugin name before saving.")
      return
    }

    const completeState: CompletePluginState = {
      id: Date.now().toString(),
      name: pluginName,
      code: generatedCode,
      description: description,
      date: new Date().toISOString(),
      pluginDetails: pluginDetails,
      messages: messages,
      codeVersions: codeVersions,
      currentVersionIndex: currentVersionIndex,
      fileStructure: fileStructure,
      changelog: changelog
    }

    // Create a Blob from the state
    const stateBlob = new Blob([JSON.stringify(completeState, null, 2)], { type: 'application/json' })
    
    // Create download link
    const url = window.URL.createObjectURL(stateBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${pluginName}-state.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

    setError(null)
  }

  const handleLoadPlugin = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const state: CompletePluginState = JSON.parse(text)

      // Restore all state
      setPluginName(state.name)
      setGeneratedCode(state.code)
      setDescription(state.description)
      setPluginDetails(state.pluginDetails)
      setMessages(state.messages)
      setCodeVersions(state.codeVersions)
      setCurrentVersionIndex(state.currentVersionIndex)
      setFileStructure(state.fileStructure)
      setChangelog(state.changelog)
      
      // Set the selected file to the main plugin file
      setSelectedFile(`${state.name}/${state.name}.php`)
      
      // After successfully loading a plugin, set generatedPlugin to true
      setGeneratedPlugin(true)
    } catch (err) {
      console.error('Error loading plugin state:', err)
      setError('Failed to load plugin state file')
    }
  }

  const updateFileStructure = (
    structure: FileStructure[],
    path: string | null,
    newContent: string,
  ): FileStructure[] => {
    if (!path) return structure

    const parts = path.split("/")
    const updateRecursive = (items: FileStructure[]): FileStructure[] => {
      return items.map((item) => {
        if (item.name === parts[0]) {
          if (parts.length === 1 && item.type === "file") {
            return { ...item, content: newContent }
          } else if (item.type === "folder" && item.children) {
            return { ...item, children: updateRecursive(item.children) }
          }
        }
        return item
      })
    }

    return updateRecursive(structure)
  }

  const handleRevisionSubmit = async (description: string, files?: File[]) => {
    console.log("Starting revision submission with description:", description);
    setRevisionDescription(description)
    if (files) {
      console.log("Revision files:", files.map(f => f.name).join(", "));
      setRevisionFiles(files)
    }

    if (!description && (!files || files.length === 0)) {
      setError("Please enter a revision description or attach files.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      let fullRevisionRequest = `You are a WordPress plugin expert. Your task is to MODIFY the existing plugin code by ADDING the requested functionality while PRESERVING ALL existing functionality.

IMPORTANT:
1. DO NOT remove or replace existing features unless explicitly requested
2. Keep all existing functions and hooks
3. Add new functionality alongside existing code
4. Maintain the current plugin structure
5. Return the COMPLETE updated plugin code

Current plugin code:
${generatedCode}

Requested changes:
${description}

Your response must include:
1. A brief explanation of what you're adding/changing
2. How the new changes integrate with existing functionality
3. The complete updated plugin code that includes both existing and new features`

      console.log("Preparing revision request with current code length:", generatedCode.length);

      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const text = await processFile(file)
            if (text.metadata?.content) {
              fullRevisionRequest += "\n\nAdditional context from attached file:\n" + text.metadata.content
            }
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error)
            setError(`Error processing file ${file.name}. Please try again.`)
            return
          }
        }
      }

      console.log("Generating AI response for revision...");
      const aiResponse = await generateAIResponse(fullRevisionRequest, generatedCode)
      console.log("AI response received:", aiResponse ? "success" : "failed");
      
      let explanation = ""
      let updatedCode = ""

      // Parse the AI response to separate explanation from code
      if (aiResponse.message) {
        console.log("Parsing AI response message of length:", aiResponse.message.length);
        const parts = aiResponse.message.split("```")
        if (parts.length >= 3) {
          explanation = parts[0].trim()
          updatedCode = parts[1].replace(/^php\n/, '').trim()
          console.log("Successfully extracted code from response, code length:", updatedCode.length);
        } else {
          explanation = "Changes applied as requested."
          updatedCode = aiResponse.codeUpdate || aiResponse.message
          console.log("Using codeUpdate or full message as code, length:", updatedCode.length);
        }
      }

      if (updatedCode) {
        console.log("Setting generated code and creating file structure...");
        setGeneratedCode(updatedCode)
        createFileStructure(updatedCode)
        
        // Add a new version for this revision
        console.log("Adding new code version...");
        addCodeVersion(updatedCode, `${description}\n\nChanges made:\n${explanation}`)
        
        // Explicitly prompt for version update
        console.log("Storing pending code update and showing version modal...");
        setPendingCodeUpdate(updatedCode);
        setShowVersionUpdateModal(true);
      } else {
        console.error("No updated code received from AI response");
        setError("Failed to generate updated code. Please try again.");
        setLoading(false);
        return;
      }

      const newEntry: ChangelogEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        description: description,
        files: files?.map((f) => f.name),
        codeChanges: updatedCode,
        aiResponse: explanation,
        llmUsed: selectedModel,
      }
      setChangelog((prev) => [newEntry, ...prev])

      // Add a message to show the explanation
      const message: Message = {
        id: Date.now().toString(),
        content: `Changes applied:\n${explanation}`,
        type: "assistant",
        timestamp: new Date().toISOString(),
        codeUpdate: true
      }
      setMessages(prev => [...prev, message])

      setRevisionDescription("")
      setRevisionFiles([])
      setShowRevisionModal(false)
    } catch (err) {
      console.error("Error submitting revision:", err)
      setError(`Error submitting revision: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCodeUpdate = (code: string) => {
    if (!code) return;
    
    // Store the code update for later use
    setPendingCodeUpdate(code)
    
    // Show the version update modal
    setShowVersionUpdateModal(true)
  }

  const handleVersionUpdateSubmit = (newVersion: string) => {
    console.log("Version update submitted with new version:", newVersion);
    
    if (!pendingCodeUpdate) {
      console.error("No pending code update found when trying to update version");
      setError("No pending code update found. Please try again.");
      return;
    }
    
    // Update plugin details with new version
    if (pluginDetails) {
      console.log("Updating plugin details with new version:", newVersion);
      setPluginDetails({
        ...pluginDetails,
        version: newVersion
      })
    }
    
    // Update version in the plugin code header
    console.log("Updating version in plugin code header");
    const updatedCode = pendingCodeUpdate.replace(
      /Version:\s*([0-9]+\.?)+/,
      `Version: ${newVersion}`
    )
    
    // Apply the code update
    console.log("Applying code update, new code length:", updatedCode.length);
    setGeneratedCode(updatedCode)
    createFileStructure(updatedCode)
    
    // Add to version history
    console.log("Adding to version history");
    addCodeVersion(updatedCode, 'AI suggested edit', newVersion)
    
    // Clear the pending update
    setPendingCodeUpdate(null)
    
    // Close the modal
    setShowVersionUpdateModal(false)
    
    // Update messages to show the code was updated
    console.log("Updating messages to show code was updated");
    setMessages(prev => prev.map(msg => 
      msg.type === 'assistant' && !msg.codeUpdate 
        ? { ...msg, codeUpdate: true }
        : msg
    ))
    
    // Force refresh the file structure display
    console.log("Forcing refresh of file structure");
    // No need to force refresh as createFileStructure already updates the state
  }

  const extractCustomFunctions = (code: string) => {
    // Look for functions that aren't part of the standard plugin structure
    const functionMatches = code.match(/function\s+(?!activate_|deactivate_|run_)[\w_]+\s*\([^)]*\)\s*{[^}]*}/g) || []
    return functionMatches.join("\n\n")
  }

  // Add new function to distribute code updates
  const distributeCodeUpdates = (code: string) => {
    if (!pluginDetails || pluginDetails.structure !== "traditional") {
      return cleanAndFormatCode(code)
    }

    const pluginName = pluginDetails.name

    // Extract plugin header
    const headerMatch = code.match(/\/\*[\s\S]*?\*\//)
    const pluginHeader = headerMatch ? headerMatch[0] : ""
    
    // Extract the main functionality, excluding the header
    const mainCode = code.replace(headerMatch?.[0] || "", "").trim()

    // Extract admin-specific code
    const adminCode = extractFunctionsByPrefix(mainCode, "admin_")
    
    // Extract public-specific code
    const publicCode = extractFunctionsByPrefix(mainCode, "public_")
    
    // Extract custom functions that don't belong to admin or public
    const customFunctions = extractCustomFunctions(mainCode)

    // Update admin class file
    const adminClassPath = `${pluginName}/admin/class-admin.php`
    const adminClassContent = cleanAndFormatCode(generateAdminClass(pluginName))
    setFileContent(adminClassPath, adminClassContent)

    // Update public class file
    const publicClassPath = `${pluginName}/public/class-public.php`
    const publicClassContent = cleanAndFormatCode(generatePublicClass(pluginName))
    setFileContent(publicClassPath, publicClassContent)

    // Generate main plugin file
    return cleanAndFormatCode(generateMainPluginFile(pluginHeader, customFunctions, pluginName))
  }

  // Add helper function to extract functions by prefix
  const extractFunctionsByPrefix = (code: string, prefix: string) => {
    const functionRegex = new RegExp(`function\\s+${prefix}[\\w_]+\\s*\\([^)]*\\)\\s*{[^}]*}`, 'g')
    const matches = code.match(functionRegex) || []
    return matches.join("\n\n")
  }

  // Add setFileContent function
  const setFileContent = (path: string, content: string) => {
    const findAndUpdateFile = (files: FileStructure[]): FileStructure[] => {
      return files.map(file => {
        if (file.path === path) {
          return { ...file, content }
        }
        if (file.children) {
          return { ...file, children: findAndUpdateFile(file.children) }
        }
        return file
      })
    }

    setFileStructure(prev => findAndUpdateFile(prev))
  }

  // Function to handle viewing file changes
  const handleViewFileChanges = (filePath: string) => {
    setSelectedFileForDiff(filePath)
    setShowDiffModal(true)
  }

  // Function to handle viewing version changes
  const handleViewVersionChanges = (versionId: string) => {
    setSelectedVersionForDiff(versionId)
    setShowDiffModal(true)
  }

  // Get the current version's file changes
  const currentVersionFileChanges = currentVersionIndex >= 0 && codeVersions.length > 0
    ? codeVersions[currentVersionIndex]?.fileChanges || []
    : []

  // Calculate changes between current and previous version for display in file explorer
  const displayFileChanges = useMemo(() => {
    // If we're at the first version or have no versions, there are no changes to display
    if (currentVersionIndex <= 0 || codeVersions.length <= 1) {
      return [];
    }
    
    // Get changes from the current version
    return codeVersions[currentVersionIndex]?.fileChanges || [];
  }, [currentVersionIndex, codeVersions]);

  // Get the selected version for diff
  const selectedVersion = useMemo(() => {
    if (!selectedVersionForDiff) {
      return currentVersionIndex >= 0 && codeVersions.length > 0
        ? codeVersions[currentVersionIndex]
        : null
    }
    return codeVersions.find(v => v.id === selectedVersionForDiff) || null
  }, [codeVersions, currentVersionIndex, selectedVersionForDiff])

  // Add effect to load chat history from localStorage on mount
  useEffect(() => {
    // Check for force_new_session parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const forceNewSession = urlParams.get('force_new_session') === 'true';
    
    // Clear all localStorage if force_new_session is true
    if (forceNewSession) {
      console.log("Forcing new session, clearing localStorage");
      localStorage.clear();
      // Redirect to clean URL without the parameter
      window.history.replaceState({}, document.title, window.location.pathname);
      return; // Skip loading from localStorage
    }
    
    // Load saved state from localStorage
    const savedMessages = localStorage.getItem('messages')
    const savedCodeVersions = localStorage.getItem('codeVersions')
    const savedPluginDetails = localStorage.getItem('pluginDetails')
    const savedGeneratedCode = localStorage.getItem('generatedCode')
    
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages as string))
      } catch (e) {
        console.error("Error parsing saved messages:", e)
      }
    }
    
    if (savedCodeVersions) {
      try {
        const parsedVersions = JSON.parse(savedCodeVersions as string)
        setCodeVersions(parsedVersions)
        setCurrentVersionIndex(parsedVersions.length - 1)
      } catch (e) {
        console.error("Error parsing saved code versions:", e)
      }
    }
    
    if (savedPluginDetails) {
      try {
        const details = JSON.parse(savedPluginDetails as string)
        setPluginDetails(details)
        setPluginName(details.name)
      } catch (e) {
        console.error("Error parsing saved plugin details:", e)
      }
    }
    
    if (savedGeneratedCode) {
      try {
        setGeneratedCode(savedGeneratedCode as string)
        
        // Create file structure from the saved code
        try {
          createFileStructure(savedGeneratedCode as string)
        } catch (err) {
          console.error("Error creating file structure:", err)
        }
      } catch (e) {
        console.error("Error setting saved generated code:", e)
      }
    }
  }, [])

  // Add effect to save chat history to localStorage when it changes
  useEffect(() => {
    // Skip the first render to prevent overriding localStorage values during initialization
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    
    if (messages.length > 0) {
      localStorage.setItem("messages", JSON.stringify(messages))
    }
    
    if (codeVersions.length > 0) {
      localStorage.setItem("codeVersions", JSON.stringify(codeVersions))
    }
    
    if (pluginDetails) {
      localStorage.setItem("pluginDetails", JSON.stringify(pluginDetails))
    }
    
    if (generatedCode) {
      localStorage.setItem("generatedCode", generatedCode)
    }
    
    // Log the current state before saving to localStorage
    console.log("Saving generatedPlugin to localStorage:", generatedPlugin)
    localStorage.setItem("generatedPlugin", String(generatedPlugin))
  }, [messages, codeVersions, pluginDetails, generatedCode, generatedPlugin])

  // Add a new useEffect specifically for initializing generatedPlugin from localStorage
  useEffect(() => {
    // This will only run on the client after hydration is complete
    try {
      const savedValue = localStorage.getItem("generatedPlugin")
      console.log("Initial generatedPlugin value from localStorage:", savedValue)
      if (savedValue === "true") {
        setGeneratedPlugin(true)
      } else {
        // Explicitly set to false if not "true" to ensure button visibility
        setGeneratedPlugin(false)
        // Clear any potentially corrupted value
        localStorage.removeItem("generatedPlugin")
      }
    } catch (e) {
      console.error("Error reading generatedPlugin from localStorage:", e)
      // Ensure generatedPlugin is false if there's an error
      setGeneratedPlugin(false)
    }
  }, []) // Empty dependency array means this runs once after mount

  // Add event listener for the CONTINUE button in the plugin details modal
  useEffect(() => {
    // Function to handle clicks on the CONTINUE button
    const handleContinueButtonClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if the clicked element or any of its parents has the continue-generate-plugin-button class
      if (target.closest('.continue-generate-plugin-button')) {
        console.log('CONTINUE button clicked, will generate plugin');
        // Add a small delay to ensure the modal state is updated first
        setTimeout(() => {
          if (hasFilledDetails) {
            console.log('Generating plugin after CONTINUE button click');
            generateCode();
          }
        }, 100);
      }
    };

    // Add the event listener to the document
    document.addEventListener('click', handleContinueButtonClick, true);

    // Clean up the event listener when the component unmounts
    return () => {
      document.removeEventListener('click', handleContinueButtonClick, true);
    };
  }, [hasFilledDetails, generateCode]);

  // Update the setSelectedFile function to handle null values
  const handleFileSelect = (path: string) => {
    setSelectedFile(path)
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-between items-center p-4 flex-shrink-0">
        <h1 className="text-2xl font-bold">WordPress Plugin Generator</h1>
        <Button
          onClick={() => {
            // Clear localStorage and reload with force_new_session parameter
            localStorage.clear();
            window.location.href = window.location.pathname + '?force_new_session=true';
          }}
          variant="outline"
          size="sm"
        >
          New Session
        </Button>
      </div>
      <div className="flex flex-1 min-h-0">
        {/* Left Column - Chat Interface (40%) */}
        <div className="w-[40%] flex flex-col min-h-0 border-r">
          <div className="p-4 flex-shrink-0">
            <div className="mb-4">
              <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* EDIT DETAILS Button - Only show after plugin generation */}
              {hasFilledDetails && generatedPlugin && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowPluginDetailsModal(true)}
                        variant="outline"
                        size="sm"
                      >
                        <Settings2 className="h-4 w-4 mr-1" />
                        Edit Details
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit plugin details</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* START/GENERATE Button - Only show before plugin generation */}
              {!generatedPlugin && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          if (!description && attachedFiles.length === 0) {
                            setShowValidationModal(true)
                          } else if (hasFilledDetails) {
                            // If details are already filled, call generateCode directly
                            generateCode();
                          } else {
                            setShowPluginDetailsModal(true)
                          }
                        }}
                        disabled={loading || isCreatingPreview}
                        className={
                          !hasFilledDetails
                            ? "bg-black hover:bg-black/90 text-white"
                            : "bg-purple-600 hover:bg-purple-700 text-white"
                        }
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          </>
                        ) : (
                          hasFilledDetails ? "Generate" : "Start"
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {!description && attachedFiles.length === 0
                          ? "Please add a description or attach files first"
                          : "Generate your WordPress plugin"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <input
                type="file"
                accept=".json"
                onChange={handleLoadPlugin}
                className="hidden"
                id="load-plugin-input"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('load-plugin-input')?.click()}
                      disabled={loading}
                    >
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Load
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Load a previously saved plugin state</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={downloadPlugin} variant="outline" disabled={!generatedCode}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Download your plugin as an installable WordPress Plugin ZIP file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setIsCodeSnippetModalOpen(true)} variant="outline" disabled={!generatedCode}>
                        <Code className="h-4 w-4 mr-2" />
                        Snippet
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View a code snippet version of your plugin</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleSavePlugin} variant="outline" disabled={!generatedCode}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Save your plugin state to a file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          
          {/* Plugin Discussion - Chat Interface */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <PluginDiscussion
              messages={messages}
              onSendMessage={handleSendMessage}
              className="h-full"
              selectedModel={selectedModel}
              revertBySteps={revertBySteps}
              revertToVersion={revertToVersion}
              codeVersions={codeVersions}
              onCodeUpdate={handleCodeUpdate}
              initialDescription={description}
              onInitialDescriptionChange={setDescription}
              onFilesSelected={(files: ProcessedFile[]) => setAttachedFiles(files)}
            />
          </div>
        </div>

        {/* Center Column - File Explorer (15%) */}
        <div className="w-[15%] border-r flex flex-col min-h-0 bg-gray-50">
          <div className="p-2 border-b flex-shrink-0">
            <h2 className="text-sm font-semibold">Files</h2>
            {codeVersions.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <span className="text-xs mr-2">Version:</span>
                  <Select
                    value={currentVersionIndex.toString()}
                    onValueChange={(value) => {
                      const index = parseInt(value)
                      setCurrentVersionIndex(index)
                      setGeneratedCode(codeVersions[index].code)
                      createFileStructure(codeVersions[index].code)
                    }}
                  >
                    <SelectTrigger className="h-8 w-[108px] text-xs bg-white">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {codeVersions.map((version, index) => (
                        <SelectItem key={version.id} value={index.toString()} className="text-xs">
                          {version.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Changes button */}
                {currentVersionIndex > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs flex items-center gap-1"
                    onClick={() => {
                      if (currentVersionIndex > 0 && codeVersions[currentVersionIndex]) {
                        handleViewVersionChanges(codeVersions[currentVersionIndex].id);
                      }
                    }}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Changes
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-auto">
            <FileExplorer
              files={fileStructure}
              selectedFile={selectedFile}
              onSelectFile={handleFileSelect}
              fileChanges={displayFileChanges}
              onViewChanges={handleViewFileChanges}
            />
          </div>
        </div>

        {/* Right Column - Code Display (45%) */}
        <div className="w-[45%] flex flex-col min-h-0">
          <div className="p-2 border-b flex-shrink-0 flex justify-between items-center">
            <h2 className="text-sm font-semibold">
              {selectedFile ? selectedFile : "Code"}
            </h2>
          </div>
          <div className="flex-1 min-h-0">
            <CodeEditor
              selectedFile={selectedFile}
              fileStructure={fileStructure}
              loading={loading}
              streaming={isStreaming}
              onCodeChange={(newCode) => {
                if (selectedFile === `${pluginName}/${pluginName}.php`) {
                  setGeneratedCode(newCode)
                }
                const updatedStructure = updateFileStructure(fileStructure, selectedFile, newCode)
                setFileStructure(updatedStructure)
              }}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <CodeSnippetModal
        isOpen={isCodeSnippetModalOpen}
        onClose={() => setIsCodeSnippetModalOpen(false)}
        code={generatedCode}
      />

      <VersionUpdateModal
        isOpen={showVersionUpdateModal}
        onClose={() => setShowVersionUpdateModal(false)}
        onSubmit={handleVersionUpdateSubmit}
        currentVersion={codeVersions[currentVersionIndex]?.version || "1.0.0"}
      />

      <PluginDetailsModal
        isOpen={showPluginDetailsModal}
        onClose={() => setShowPluginDetailsModal(false)}
        onSubmit={(details) => {
          // Set plugin details and hasFilledDetails
          setPluginDetails(details);
          setPluginName(details.name);
          setHasFilledDetails(true);
          setShowPluginDetailsModal(false);
          
          // Always call generateCode immediately after clicking CONTINUE
          // The generateCode function has its own validation for description/files
          generateCode();
        }}
      />

      <RevisionModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        onSubmit={handleRevisionSubmit}
        pluginName={pluginName}
      />

      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={handleClosePreview}
        previewUrl={previewUrl}
      />

      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent className="bg-white">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl text-center">Action Required</DialogTitle>
            <DialogDescription className="text-center mt-2">
              Please describe your plugin or provide an attachment so we know what to build.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button 
              onClick={() => setShowValidationModal(false)} 
              className="bg-black hover:bg-gray-800 text-white"
            >
              I understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showDiffModal && selectedVersion && (
        <DiffViewModal
          isOpen={showDiffModal}
          onClose={() => {
            setShowDiffModal(false)
            setSelectedVersionForDiff(null)
            setSelectedFileForDiff(null)
          }}
          fileChanges={selectedVersion.fileChanges || []}
          versionDescription={selectedVersion.description}
          versionNumber={selectedVersion.version}
        />
      )}
    </div>
  )
}

