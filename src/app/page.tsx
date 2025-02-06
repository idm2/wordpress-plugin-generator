"use client"

import { useState, useEffect } from "react"
import { Download, Eye, RefreshCw, Code, Save, FolderOpen } from "lucide-react"
import OpenAI from "openai"
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
import { SavedPluginsModal } from "@/components/saved-plugins-modal"
import type { FileStructure } from "@/types/shared"
import { ModelSelector } from "@/components/ModelSelector"
import { generateResponse } from "@/lib/ollama"
import { PluginDiscussion } from "@/components/plugin-discussion"

interface ChangelogEntry {
  id: string
  date: string
  description: string
  files?: string[]
  aiResponse?: string
  codeChanges?: string
  llmUsed?: string
}

interface SavedPlugin {
  id: string
  name: string
  code: string
  description: string
  date: string
}

interface Message {
  id: string
  content: string
  type: "user" | "assistant"
  timestamp: string
  files?: File[]
  codeUpdate?: string
  imageUrls?: string[]
  imageAnalysis?: string[]
}

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
  const [isSavedPluginsModalOpen, setIsSavedPluginsModalOpen] = useState(false)
  const [selectedLLM, setSelectedLLM] = useState<string>("openai")
  const [messages, setMessages] = useState<Message[]>([])

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

  const generateCode = async () => {
    try {
      if (!pluginDetails) {
        setShowPluginDetailsModal(true)
        return
      }

      if (!description && attachedFiles.length === 0) {
        setError("Please enter a description or attach files.")
        return
      }

      setLoading(true)
      setError(null)

      let fullRequest = description

      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const arrayBuffer = await file.arrayBuffer()
            const result = await mammoth.extractRawText({ arrayBuffer })
            fullRequest += "\n" + result.value
          } else if (file.type === "text/plain") {
            const text = await file.text()
            fullRequest += "\n" + text
          }
        }
      }

      const messages = [
        {
          role: "system",
          content: `You are an expert WordPress plugin developer. Generate only the raw PHP code for a WordPress plugin. Do not include markdown formatting, code fences, or comments. The code should start with <?php and be production-ready, following WordPress coding standards and best practices.

Core Principles:
- Every generated WordPress plugin or code snippet must be fully functional, error-free, and optimized before output.
- Reason through multiple implementation possibilities and choose the best one before writing the code.
- Adhere to WordPress Coding Standards (WPCS) and best practices.
- Use proper WordPress folder and file structure for plugins.
- Create modular code, separating core functionality, hooks, templates, and settings into appropriate files.
- Follow security best practices, including sanitization, validation, escaping, and nonces.
- Prioritize performance optimization, ensuring no unnecessary queries, loops, or external requests.
- Ensure compatibility with the latest stable WordPress version.
- Use unique prefixes for functions and classes to prevent conflicts.
- Use actions, filters, and WordPress API functions correctly and efficiently.`,
        },
        {
          role: "user",
          content: `Generate a WordPress plugin with the following details:
Name: ${pluginDetails.name}
Plugin URI: ${pluginDetails.uri}
Description: ${pluginDetails.description}
Version: ${pluginDetails.version}
Author: ${pluginDetails.author}

Functionality: ${fullRequest}`,
        },
      ]

      let generatedCode = ""

      if (selectedLLM === "anthropic") {
        const result = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            model: "anthropic",
          }),
        })

        if (!result.ok) {
          throw new Error("Failed to generate code")
        }

        const data = await result.json()
        generatedCode = data.content
      } else if (selectedLLM === "openai") {
        if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
          throw new Error("OpenAI API key is not configured")
        }

        const openai = new OpenAI({
          apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
          dangerouslyAllowBrowser: true,
        })

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: messages.map((msg) => ({
            role: msg.role as "system" | "user" | "assistant",
            content: msg.content,
          })),
          temperature: 0.7,
          max_tokens: 2000,
        })

        if (!completion.choices[0]?.message?.content) {
          throw new Error("No response from OpenAI")
        }

        generatedCode = completion.choices[0].message.content
      } else {
        await generateResponse(selectedLLM, messages, (chunk) => {
          generatedCode += chunk
        })
      }

      generatedCode = generatedCode
        .replace(/^[\s\S]*?<\?php\s*/m, "<?php\n")
        .replace(/```(?:php)?\s*|\s*```$/g, "")
        .replace(/\n<\?php/g, "")
        .trim()

      setGeneratedCode(generatedCode)
      createFileStructure(generatedCode)
    } catch (err) {
      console.error("Error generating code:", err)
      setError(`Error generating code: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const generateAIResponse = async (
    userMessage: string,
    currentCode: string,
  ): Promise<{ message: string; codeUpdate?: string }> => {
    const messages = [
      {
        role: "system",
        content: `You are an expert WordPress plugin developer. You will be given the current plugin code and a user request. Your task is to:
1. Understand the user's request
2. If code changes are needed, modify the plugin code according to the request
3. Provide a clear explanation of the changes made
4. Return both the updated code and a user-friendly response
5. IMPORTANT: Always return the COMPLETE plugin code, not just the modified section

Current plugin code:
${currentCode}`,
      },
      {
        role: "user",
        content: userMessage,
      },
    ]

    try {
      if (selectedLLM === "anthropic") {
        const result = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            model: "anthropic",
          }),
        })

        if (!result.ok) {
          throw new Error("Failed to generate AI response")
        }

        const data = await result.json()
        return parseAIResponse(data.content)
      } else if (selectedLLM === "openai") {
        if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
          throw new Error("OpenAI API key is not configured")
        }

        const openai = new OpenAI({
          apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
          dangerouslyAllowBrowser: true,
        })

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: messages.map((msg) => ({
            role: msg.role as "system" | "user" | "assistant",
            content: msg.content,
          })),
          temperature: 0.7,
          max_tokens: 2000,
        })

        if (!completion.choices[0]?.message?.content) {
          throw new Error("No response from OpenAI")
        }

        return parseAIResponse(completion.choices[0].message.content)
      } else {
        let response = ""
        await generateResponse(selectedLLM, messages, (chunk) => {
          response += chunk
        })
        return parseAIResponse(response)
      }
    } catch (error) {
      console.error("Error generating AI response:", error)
      throw error
    }
  }

  const parseAIResponse = (response: string): { message: string; codeUpdate?: string } => {
    const codeBlockRegex = /```(?:php)?\s*([\s\S]*?)```/
    const match = response.match(codeBlockRegex)

    if (match) {
      const code = match[1]
        .replace(/^[\s\S]*?<\?php\s*/m, "<?php\n")
        .replace(/\n<\?php/g, "")
        .trim()

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

    return {
      message: response,
    }
  }

  const createFileStructure = (code: string) => {
    const structure: FileStructure[] = [
      {
        name: pluginName,
        type: "folder",
        children: [
          {
            name: "admin",
            type: "folder",
            children: [
              {
                name: "css",
                type: "folder",
                children: [{ name: "admin.css", type: "file", content: "/* Admin styles */" }],
              },
              {
                name: "js",
                type: "folder",
                children: [{ name: "admin.js", type: "file", content: "// Admin JavaScript" }],
              },
              {
                name: "class-admin.php",
                type: "file",
                content: "<?php\n// Admin functionality",
              },
            ],
          },
          {
            name: "includes",
            type: "folder",
            children: [
              {
                name: "class-loader.php",
                type: "file",
                content: "<?php\n// Plugin loader",
              },
              {
                name: "class-i18n.php",
                type: "file",
                content: "<?php\n// Internationalization",
              },
            ],
          },
          {
            name: "public",
            type: "folder",
            children: [
              {
                name: "css",
                type: "folder",
                children: [{ name: "public.css", type: "file", content: "/* Public styles */" }],
              },
              {
                name: "js",
                type: "folder",
                children: [{ name: "public.js", type: "file", content: "// Public JavaScript" }],
              },
              {
                name: "class-public.php",
                type: "file",
                content: "<?php\n// Public functionality",
              },
            ],
          },
          {
            name: `${pluginName}.php`,
            type: "file",
            content: code,
          },
        ],
      },
    ]

    setFileStructure(structure)
    setSelectedFile(`${pluginName}/${pluginName}.php`)
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
      const response = await fetch("/api/export-plugin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pluginName,
          code: generatedCode,
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
    const imageUrls: string[] = []
    const imageAnalysis: string[] = []

    if (files && files.length > 0) {
      for (const file of files) {
        const processedFile = await processFile(file)
        if (processedFile.imageUrl) {
          imageUrls.push(processedFile.imageUrl)
          if (processedFile.imageAnalysis) {
            imageAnalysis.push(processedFile.imageAnalysis)
          }
        }
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      type: "user",
      timestamp: new Date().toISOString(),
      files,
      imageUrls,
      imageAnalysis,
    }

    setMessages((prev) => [...prev, userMessage])

    try {
      const imageContext =
        imageAnalysis.length > 0
          ? "\n\nImage Context:\n" + imageAnalysis.map((analysis, i) => `Image ${i + 1}: ${analysis}`).join("\n")
          : ""

      const aiResponse = await generateAIResponse(content + imageContext, generatedCode)

      if (aiResponse.codeUpdate) {
        setGeneratedCode(aiResponse.codeUpdate)
        createFileStructure(aiResponse.codeUpdate)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.message,
        type: "assistant",
        timestamp: new Date().toISOString(),
        codeUpdate: Boolean(aiResponse.codeUpdate),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error while processing your request. Please try again.",
        type: "assistant",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const handleSavePlugin = () => {
    if (!generatedCode || !pluginName) {
      setError("Please generate code and enter a plugin name before saving.")
      return
    }

    const newPlugin: SavedPlugin = {
      id: Date.now().toString(),
      name: pluginName,
      code: generatedCode,
      description: description,
      date: new Date().toISOString(),
    }

    const savedPlugins = JSON.parse(localStorage.getItem("savedPlugins") || "[]")
    savedPlugins.push(newPlugin)
    localStorage.setItem("savedPlugins", JSON.stringify(savedPlugins))

    setError(null)
    alert("Plugin saved successfully!")
  }

  const handleLoadPlugin = (plugin: SavedPlugin) => {
    setPluginName(plugin.name)
    setGeneratedCode(plugin.code)
    setDescription(plugin.description)
    createFileStructure(plugin.code)
    setError(null)
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

  const processFile = async (file: File): Promise<{ imageUrl?: string; imageAnalysis?: string } | string> => {
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer })
      return result.value
    } else if (file.type === "text/plain") {
      return await file.text()
    } else if (file.type.startsWith("image/")) {
      const reader = new FileReader()
      return new Promise((resolve, reject) => {
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string
          resolve({ imageUrl })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    } else {
      throw new Error(`Unsupported file type: ${file.type}`)
    }
  }

  const handleRevisionSubmit = async (description: string, files?: File[]) => {
    setRevisionDescription(description)
    if (files) {
      setRevisionFiles(files)
    }

    if (!description && (!files || files.length === 0)) {
      setError("Please enter a revision description or attach files.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      let fullRevisionRequest = description

      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const text = await processFile(file)
            fullRevisionRequest += "\n" + text
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error)
            setError(`Error processing file ${file.name}. Please try again.`)
            return
          }
        }
      }

      const aiResponse = await generateAIResponse(fullRevisionRequest, generatedCode)

      if (aiResponse.codeUpdate) {
        setGeneratedCode(aiResponse.codeUpdate)
        createFileStructure(aiResponse.codeUpdate)
      }

      const newEntry: ChangelogEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        description: fullRevisionRequest,
        files: files?.map((f) => f.name),
        codeChanges: aiResponse.codeUpdate,
        llmUsed: selectedLLM,
      }
      setChangelog((prev) => [newEntry, ...prev])

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

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left Column - File Explorer */}
      <div className="w-[250px] min-w-[250px] border-r flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Files</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <FileExplorer files={fileStructure} selectedFile={selectedFile} onSelectFile={setSelectedFile} />
        </div>
      </div>

      {/* Middle Column - Main Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r">
        <div className="flex-none p-4 border-b">
          <h1 className="text-2xl font-bold mb-6">WordPress Plugin Generator</h1>
          <div className="space-y-4">
            <ModelSelector selectedModel={selectedLLM} onModelChange={setSelectedLLM} />
            <div className="space-y-2">
              <RichTextarea
                placeholder="Describe the functionality you want (e.g., a plugin that adds a custom post type for reviews)"
                value={description}
                onChange={setDescription}
                onFilesSelected={setAttachedFiles}
                className="min-h-[100px] w-full"
              />
              {attachedFiles.length > 0 && (
                <div className="text-sm text-gray-500">
                  Attached files: {attachedFiles.map((f) => f.name).join(", ")}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={generateCode}
                disabled={loading || isCreatingPreview}
                className={`${hasFilledDetails ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : hasFilledDetails ? (
                  "Generate Plugin"
                ) : (
                  "Start"
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsSavedPluginsModalOpen(true)} disabled={loading}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Load
              </Button>
              {(hasFilledDetails || generatedCode) && (
                <>
                  <Button variant="outline" onClick={downloadPlugin} disabled={loading || isCreatingPreview}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={() => setIsCodeSnippetModalOpen(true)} disabled={loading}>
                    <Code className="mr-2 h-4 w-4" />
                    Snippet
                  </Button>
                  <Button variant="outline" onClick={handlePreview} disabled={loading || isCreatingPreview}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Button variant="outline" onClick={handleSavePlugin} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          <Card className="h-full flex flex-col overflow-hidden">
            <Tabs defaultValue="code" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="flex-none">
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="code" className="flex-1 overflow-hidden">
                <div className="h-full">
                  <CodeEditor
                    selectedFile={selectedFile}
                    fileStructure={fileStructure}
                    onCodeChange={(newCode) => {
                      if (selectedFile === `${pluginName}/${pluginName}.php`) {
                        setGeneratedCode(newCode)
                      }
                      const updatedStructure = updateFileStructure(fileStructure, selectedFile, newCode)
                      setFileStructure(updatedStructure)
                    }}
                  />
                </div>
              </TabsContent>
              <TabsContent value="preview" className="flex-1 overflow-hidden">
                <div className="h-full">
                  {previewUrl ? (
                    <iframe src={previewUrl} className="w-full h-full" title="WordPress Preview" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Generate and preview a plugin to see it here
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Right Column - Plugin Discussion */}
      <div className="w-[calc(50%-125px)] min-w-[400px] flex flex-col overflow-hidden">
        <PluginDiscussion
          messages={messages}
          onSendMessage={handleSendMessage}
          className="h-full"
          onCodeUpdate={(updatedCode) => {
            setGeneratedCode(updatedCode)
            createFileStructure(updatedCode)
          }}
        />
        <div className="flex-1 overflow-auto p-4">
          <Changelog entries={changelog} />
        </div>
      </div>

      {/* Modals */}
      <AdminDetailsModal isOpen={showAdminModal} onClose={() => setShowAdminModal(false)} details={null} />
      <PluginDetailsModal
        isOpen={showPluginDetailsModal}
        onClose={() => setShowPluginDetailsModal(false)}
        onSubmit={async (details) => {
          setPluginDetails(details)
          setPluginName(details.name)
          setHasFilledDetails(true)
          setShowPluginDetailsModal(false)
          generateCode()
        }}
      />
      <PreviewModal isOpen={isPreviewModalOpen} onClose={handleClosePreview} previewUrl={previewUrl} />
      <CodeSnippetModal
        isOpen={isCodeSnippetModalOpen}
        onClose={() => setIsCodeSnippetModalOpen(false)}
        code={generatedCode}
      />
      <RevisionModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        onSubmit={handleRevisionSubmit}
        pluginName={pluginName}
      />
      <SavedPluginsModal
        isOpen={isSavedPluginsModalOpen}
        onClose={() => setIsSavedPluginsModalOpen(false)}
        onLoad={handleLoadPlugin}
      />

      {/* Loading Overlay */}
      {isCreatingPreview && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-center">Creating preview site...</p>
            <p className="text-sm text-gray-500 mt-2 text-center">This may take up to a minute. Please wait.</p>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-lg shadow-lg">
          <p className="font-semibold">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  )
}

