"use client"

export const runtime = "nodejs"

import { useState, useEffect } from "react"
import { Download, Eye, RefreshCw, Send, Code, Save, FolderOpen } from "lucide-react"
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

interface ChangelogEntry {
  id: string
  date: string
  description: string
  files?: string[]
  aiResponse?: string
  codeChanges?: string
}

interface SavedPlugin {
  id: string
  name: string
  code: string
  description: string
  date: string
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

  const API_URL = process.env.NEXT_PUBLIC_API_URL
<<<<<<< HEAD
=======
  const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY
>>>>>>> 8cbc740c295627946f82b803a9a2edb6afc87347

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
<<<<<<< HEAD
      console.log("\n=== Starting Code Generation ===")
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      console.log("Using API URL:", apiUrl)
      
      // First check if we have plugin details
      if (!pluginDetails) {
        console.log("No plugin details - showing modal")
=======
      // First check if we have plugin details
      if (!pluginDetails) {
>>>>>>> 8cbc740c295627946f82b803a9a2edb6afc87347
        setShowPluginDetailsModal(true)
        return
      }

      // Then check for description or files
      if (!description && attachedFiles.length === 0) {
<<<<<<< HEAD
        console.log("No description or files")
=======
>>>>>>> 8cbc740c295627946f82b803a9a2edb6afc87347
        setError("Please enter a description or attach files.")
        return
      }

      setLoading(true)
      setError(null)

      let fullRequest = description
<<<<<<< HEAD
      console.log("\n1. Request Preparation:")
      console.log("Description:", description)

      if (attachedFiles.length > 0) {
        console.log("Processing files:", attachedFiles.map(f => f.name))
=======

      if (attachedFiles.length > 0) {
>>>>>>> 8cbc740c295627946f82b803a9a2edb6afc87347
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

<<<<<<< HEAD
      const requestBody = {
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Generate a WordPress plugin with the following details:
=======
      console.log("Sending request to OpenAI API...")
      const result = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are an expert WordPress plugin developer. Generate only the raw PHP code for a WordPress plugin. Do not include markdown formatting, code fences, or comments. The code should start with <?php and be production-ready, following WordPress coding standards.",
            },
            {
              role: "user",
              content: `Generate a WordPress plugin with the following details:
>>>>>>> 8cbc740c295627946f82b803a9a2edb6afc87347
Name: ${pluginDetails.name}
Plugin URI: ${pluginDetails.uri}
Description: ${pluginDetails.description}
Version: ${pluginDetails.version}
Author: ${pluginDetails.author}

<<<<<<< HEAD
Functionality: ${fullRequest}

Generate only the raw PHP code for a WordPress plugin. Do not include markdown formatting or code fences. The code should start with <?php and be production-ready, following WordPress coding standards.`
              }
            ]
          }
        ]
      }

      console.log("\n2. Making API Request:")
      const fullUrl = `${apiUrl}/api/generate`
      console.log("Making request to:", fullUrl)

      try {
        const response = await fetch(fullUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })

        console.log("\n3. Received Response:")
        console.log("Status:", response.status)
        console.log("Status Text:", response.statusText)
        
        // Try to read the response as text first
        const rawText = await response.text()
        console.log("Raw Response Text:", rawText)

        try {
          // Then parse it as JSON
          const data = rawText ? JSON.parse(rawText) : null
          console.log("Parsed Response Data:", data)

          if (!response.ok) {
            throw new Error(data?.error || `HTTP error! status: ${response.status}`)
          }

          if (data.error) {
            throw new Error(data.error)
          }

          if (data.content) {
            const generatedCode = data.content
              .replace(/^[\s\S]*?<\?php\s*/m, "<?php\n")
              .replace(/```(?:php)?\s*|\s*```$/g, "")
              .replace(/\n<\?php/g, "")
              .trim()

            console.log("\n4. Success:")
            console.log("Generated code length:", generatedCode.length)
            console.log("Code preview:", generatedCode.substring(0, 200))

            setGeneratedCode(generatedCode)
            createFileStructure(generatedCode)
          } else {
            throw new Error("No code generated in the response")
          }
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError)
          console.error("Raw response was:", rawText)
          throw new Error("Invalid response format from server")
        }
      } catch (fetchError) {
        console.error("\n❌ Fetch Error:")
        console.error("Type:", fetchError.constructor.name)
        console.error("Message:", fetchError.message)
        console.error("Full error:", fetchError)
        throw fetchError
      }
    } catch (err) {
      console.error("\n❌ Generation Error:")
      console.error("Error type:", err.constructor.name)
      console.error("Error message:", err.message)
      console.error("Full error:", err)
      setError(`Error generating code: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
      console.log("\n=== Generation Complete ===")
=======
Functionality: ${fullRequest}`,
            },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      })

      if (!result.ok) {
        throw new Error("Failed to generate code")
      }

      const data = await result.json()
      console.log("Received response from OpenAI API")

      if (data.choices?.[0]?.message?.content) {
        const generatedCode = data.choices[0].message.content
          .replace(/^[\s\S]*?<\?php\s*/m, "<?php\n")
          .replace(/```(?:php)?\s*|\s*```$/g, "")
          .replace(/\n<\?php/g, "")
          .trim()

        console.log("Setting generated code and creating file structure...")
        setGeneratedCode(generatedCode)
        createFileStructure(generatedCode)
      } else {
        throw new Error("No code generated in the response")
      }
    } catch (err) {
      console.error("Error generating code:", err)
      setError(`Error generating code: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
>>>>>>> 8cbc740c295627946f82b803a9a2edb6afc87347
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
      const response = await fetch(`${API_URL}/export-plugin`, {
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
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
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

  const handleRevisionSubmit = async () => {
    if (!revisionDescription && revisionFiles.length === 0) {
      setError("Please enter a revision description or attach files.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      let fullRevisionRequest = revisionDescription

      if (revisionFiles.length > 0) {
        for (const file of revisionFiles) {
          if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const arrayBuffer = await file.arrayBuffer()
            const result = await mammoth.extractRawText({ arrayBuffer })
            fullRevisionRequest += "\n" + result.value
          } else if (file.type === "text/plain") {
            const text = await file.text()
            fullRevisionRequest += "\n" + text
          }
        }
      }

      const result = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
<<<<<<< HEAD
          Authorization: `Bearer ${API_URL}`,
=======
          Authorization: `Bearer ${OPENAI_API_KEY}`,
>>>>>>> 8cbc740c295627946f82b803a9a2edb6afc87347
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                'You are a WordPress plugin developer. You will be given the current plugin code and a revision request. Your task is to modify the plugin code according to the request. First provide a brief explanation of the changes, then after a line containing only "CODE:", provide the complete updated plugin code starting with <?php. The code must be valid PHP and include all necessary WordPress plugin header comments.',
            },
            {
              role: "user",
              content: `Current plugin code:

${generatedCode}

Revision request: ${fullRevisionRequest}`,
            },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      })

      if (!result.ok) {
        throw new Error("Failed to generate AI response")
      }

      const data = await result.json()
      const aiResponse = data.choices?.[0]?.message?.content

      if (!aiResponse) {
        throw new Error("No response received from AI")
      }

      const parts = aiResponse.split("CODE:")
      if (parts.length !== 2) {
        throw new Error("Invalid response format")
      }

      const explanation = parts[0].trim()
      let newCode = parts[1]
        .trim()
        .replace(/```(?:php)?\s*|\s*```$/g, "")
        .replace(/^[\s\S]*?(<\?php)/m, "$1")
        .replace(/\n<\?php/g, "")
        .trim()

      if (!newCode.startsWith("<?php")) {
        newCode = "<?php\n" + newCode
      }

      // Update the code state first
      setGeneratedCode(newCode)

      // Force recreate the file structure with the new code
      createFileStructure(newCode)

      // Add to changelog
      const newEntry: ChangelogEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        description: fullRevisionRequest,
        files: revisionFiles.map((f) => f.name),
        aiResponse: explanation,
        codeChanges: newCode,
      }
      setChangelog((prev) => [newEntry, ...prev])

      // Reset form
      setRevisionDescription("")
      setRevisionFiles([])
      const richTextareaElement = document.querySelector(".revision-textarea") as HTMLTextAreaElement
      if (richTextareaElement) {
        richTextareaElement.value = ""
      }
    } catch (err) {
      console.error("Error submitting revision:", err)
      setError(`Error submitting revision: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRevisionInputChange = (value: string) => {
    setRevisionDescription(value)
    setIsRevisionInputActive(value.length > 0 || revisionFiles.length > 0)
  }

  const handleRevisionFilesSelected = (files: File[]) => {
    setRevisionFiles(files)
    setIsRevisionInputActive(files.length > 0 || revisionDescription.length > 0)
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

  return (
    <div className="flex h-screen bg-white">
      <div className="w-[250px] border-r">
        <div className="p-4 border-b">
          <h2 className="font-semibold mb-2">Files</h2>
          <div className="h-[calc(100vh-8rem)] overflow-auto">
            <FileExplorer files={fileStructure} selectedFile={selectedFile} onSelectFile={setSelectedFile} />
          </div>
        </div>
      </div>

      <div className="w-[calc(50%-125px)] flex flex-col border-r">
        <div className="border-b p-4">
          <h1 className="text-2xl font-bold mb-6">WordPress Plugin Generator</h1>
          <div className="space-y-4">
            <div className="space-y-2">
              <RichTextarea
                placeholder="Describe the functionality you want (e.g., a plugin that adds a custom post type for reviews)"
                value={description}
                onChange={setDescription}
                onFilesSelected={setAttachedFiles}
                className="min-h-[100px]"
              />
              {attachedFiles.length > 0 && (
                <div className="text-sm text-gray-500">
                  Attached files: {attachedFiles.map((f) => f.name).join(", ")}
                </div>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <Button
                onClick={generateCode}
                disabled={loading || isCreatingPreview}
                className={`${
                  hasFilledDetails ? "bg-emerald-600 hover:bg-emerald-700" : "bg-black hover:bg-black/90"
                } text-white`}
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
                    Download plugin
                  </Button>
                  <Button variant="outline" onClick={() => setIsCodeSnippetModalOpen(true)} disabled={loading}>
                    <Code className="mr-2 h-4 w-4" />
                    Code Snippet
                  </Button>
                  <Button variant="outline" onClick={handlePreview} disabled={loading || isCreatingPreview}>
                    {isCreatingPreview ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Creating preview...
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </>
                    )}
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

        <div className="flex-1 p-4">
          <Card className="h-full">
            <Tabs defaultValue="code" className="h-full">
              <TabsList>
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="code" className="h-[calc(100%-40px)]">
                <CodeEditor
                  selectedFile={selectedFile}
                  fileStructure={fileStructure}
                  onCodeChange={(newCode) => {
                    if (selectedFile === `${pluginName}/${pluginName}.php`) {
                      setGeneratedCode(newCode)
                    }
                    // Update the file structure with the new code
                    const updatedStructure = updateFileStructure(fileStructure, selectedFile, newCode)
                    setFileStructure(updatedStructure)
                  }}
                />
              </TabsContent>
              <TabsContent value="preview" className="h-[calc(100%-40px)]">
                <div className="w-full h-full">
                  {previewUrl ? (
                    <iframe src={previewUrl} className="w-full h-full border rounded-md" title="WordPress Preview" />
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

      <div className="w-[calc(50%-125px)] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Revision History</h2>
        </div>

        {generatedCode && (
          <div className="p-4 border-b space-y-4">
            <RichTextarea
              placeholder="Describe the changes needed..."
              value={revisionDescription}
              onChange={(value) => handleRevisionInputChange(value)}
              onFilesSelected={handleRevisionFilesSelected}
              className="min-h-[100px] revision-textarea"
            />
            {revisionFiles.length > 0 && (
              <div className="text-sm text-gray-500">Attached files: {revisionFiles.map((f) => f.name).join(", ")}</div>
            )}
            <div className="flex justify-end">
              <Button
                onClick={handleRevisionSubmit}
                variant="default"
                className="bg-gray-800 hover:bg-gray-700 text-white"
                disabled={!isRevisionInputActive}
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Request Revision
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          <Changelog entries={changelog} />
        </div>
      </div>

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

      {isCreatingPreview && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-lg font-semibold text-center">Creating preview site...</p>
            <p className="text-sm text-gray-600 mt-2 text-center">This may take up to a minute. Please wait.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  )
}

