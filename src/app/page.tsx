'use client'

import { useState, useEffect } from 'react'
import { Download, Eye, RefreshCw, History, Paperclip, Send } from 'lucide-react'
import { AdminDetailsModal } from '@/components/admin-details-modal'
import { FileExplorer } from '@/components/file-explorer'
import { CodeEditor } from '@/components/code-editor'
import { RevisionModal } from '@/components/revision-modal'
import { Changelog } from '@/components/changelog'
import { FileUpload } from '@/components/file-upload'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RichTextarea } from '@/components/rich-textarea'
import { PluginDetailsModal, type PluginDetails } from '@/components/plugin-details-modal'
import mammoth from 'mammoth'

const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY

interface FileStructure {
  name: string
  type: 'file' | 'folder'
  content?: string
  children?: FileStructure[]
}

interface AdminDetails {
  url: string
  username: string
  password: string
}

interface ChangelogEntry {
  id: string
  date: string
  description: string
  files?: string[]
  aiResponse?: string
  codeChanges?: string
}

export default function PluginGenerator() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [revisionDescription, setRevisionDescription] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [pluginName, setPluginName] = useState('my-plugin')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileStructure, setFileStructure] = useState<FileStructure[]>([])
  const [previewSiteId, setPreviewSiteId] = useState<string | null>(null)
  const [isCreatingPreview, setIsCreatingPreview] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminDetails, setAdminDetails] = useState<AdminDetails | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [revisionFiles, setRevisionFiles] = useState<File[]>([])
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([])
  const [showPluginDetailsModal, setShowPluginDetailsModal] = useState(false)
  const [pluginDetails, setPluginDetails] = useState<PluginDetails | null>(null)
  const [hasFilledDetails, setHasFilledDetails] = useState(false)

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (previewSiteId) {
        deleteSite(previewSiteId)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (previewSiteId) {
        deleteSite(previewSiteId)
      }
    }
  }, [previewSiteId])

  const deleteSite = async (siteId: string) => {
    try {
      await fetch('http://localhost:4000/delete-preview-site', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteId }),
      })
      console.log('Preview site deleted successfully')
    } catch (error) {
      console.error('Error deleting preview site:', error)
    }
  }

  const generateCode = async () => {
    if (!description && attachedFiles.length === 0) {
      setError('Please enter a description or attach files.')
      return
    }

    if (!pluginDetails) {
      setShowPluginDetailsModal(true)
      return
    }

    setLoading(true)
    setError(null)
    setGeneratedCode('')

    try {
      const result = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert WordPress plugin developer. Generate only the raw PHP code for a WordPress plugin. Do not include markdown formatting, code fences, or comments. The code should start with <?php and be production-ready, following WordPress coding standards.'
            },
            { 
              role: 'user', 
              content: `Generate a WordPress plugin with the following details:
Name: ${pluginDetails.name}
Plugin URI: ${pluginDetails.uri}
Description: ${pluginDetails.description}
Version: ${pluginDetails.version}
Author: ${pluginDetails.author}

Functionality: ${description}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        }),
      })

      if (!result.ok) {
        throw new Error('Failed to generate code')
      }

      const data = await result.json()

      if (data.choices?.[0]?.message?.content) {
        const generatedCode = data.choices[0].message.content
          .replace(/\`\`\`php\n?/, '')
          .replace(/\`\`\`\n?$/, '')
          .trim()

        setGeneratedCode(generatedCode)
        createFileStructure(generatedCode)
      } else {
        setError('Failed to generate code.')
      }
    } catch (err) {
      console.error('Error generating code:', err)
      setError(`Error generating code: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
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
                children: [
                  { name: "admin.css", type: "file", content: "/* Admin styles */" }
                ]
              },
              { 
                name: "js", 
                type: "folder", 
                children: [
                  { name: "admin.js", type: "file", content: "// Admin JavaScript" }
                ]
              },
              { 
                name: "class-admin.php", 
                type: "file", 
                content: "<?php\n// Admin functionality" 
              }
            ]
          },
          {
            name: "includes",
            type: "folder",
            children: [
              { 
                name: "class-loader.php", 
                type: "file", 
                content: "<?php\n// Plugin loader" 
              },
              { 
                name: "class-i18n.php", 
                type: "file", 
                content: "<?php\n// Internationalization" 
              }
            ]
          },
          {
            name: "public",
            type: "folder",
            children: [
              { 
                name: "css", 
                type: "folder", 
                children: [
                  { name: "public.css", type: "file", content: "/* Public styles */" }
                ]
              },
              { 
                name: "js", 
                type: "folder", 
                children: [
                  { name: "public.js", type: "file", content: "// Public JavaScript" }
                ]
              },
              { 
                name: "class-public.php", 
                type: "file", 
                content: "<?php\n// Public functionality" 
              }
            ]
          },
          { 
            name: `${pluginName}.php`, 
            type: "file", 
            content: code 
          }
        ]
      }
    ]

    setFileStructure(structure)
    setSelectedFile(`${pluginName}/${pluginName}.php`)
  }

  const previewPlugin = async () => {
    if (!generatedCode || !pluginName) {
      setError('Please enter a plugin name and generate code first.')
      return
    }

    setLoading(true)
    setError(null)
    setIsCreatingPreview(true)

    try {
      const response = await fetch('http://localhost:4000/preview-plugin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          pluginName,
          code: generatedCode.replace(/\`\`\`php\n?|\`\`\`\n?/g, '')
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create preview site')
      }

      const data = await response.json()
      const siteData = data?.data

      if (siteData?.wp_url) {
        setPreviewSiteId(siteData.id)
        setAdminDetails({
          url: siteData.wp_url,
          username: siteData.wp_username,
          password: siteData.wp_password,
        })
        setShowAdminModal(true)

        const loginUrl = `${siteData.wp_url}/wp-admin/?auto_login=true&s_hash=${siteData.s_hash}`
        const previewWindow = window.open(loginUrl, '_blank')

        if (previewWindow) {
          const checkWindowClosed = setInterval(() => {
            if (previewWindow.closed) {
              clearInterval(checkWindowClosed)
              deleteSite(siteData.id)
              setPreviewSiteId(null)
            }
          }, 1000)
        }
      } else {
        throw new Error('Invalid site data received')
      }
    } catch (err) {
      console.error('Error creating preview:', err)
      setError(`Error creating preview site: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
      setIsCreatingPreview(false)
    }
  }

  const downloadPlugin = async () => {
    if (!generatedCode || !pluginName) {
      setError('Please generate code and enter a plugin name before downloading.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:4000/export-plugin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pluginName, code: generatedCode }),
      })

      if (!response.ok) {
        throw new Error('Failed to download plugin')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${pluginName}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(`Error downloading plugin: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRevisionSubmit = async () => {
    if (!revisionDescription && revisionFiles.length === 0) {
      setError('Please enter a revision description or attach files.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Combine all content for the revision request
      let fullRevisionRequest = revisionDescription

      // Add content from any attached files
      if (revisionFiles.length > 0) {
        for (const file of revisionFiles) {
          if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const arrayBuffer = await file.arrayBuffer()
            const result = await mammoth.extractRawText({ arrayBuffer })
            fullRevisionRequest += '\n' + result.value
          } else if (file.type === 'text/plain') {
            const text = await file.text()
            fullRevisionRequest += '\n' + text
          }
        }
      }

      const result = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a WordPress plugin developer. You will be given the current plugin code and a revision request. Your task is to modify the plugin code according to the request. First provide a brief explanation of the changes, then after a line containing only "CODE:", provide the complete updated plugin code starting with <?php. The code must be valid PHP and include all necessary WordPress plugin header comments.'
            },
            { 
              role: 'user', 
              content: `Current plugin code:

${generatedCode}

Revision request: ${fullRevisionRequest}` 
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        }),
      })

      if (!result.ok) {
        throw new Error('Failed to generate AI response')
      }

      const data = await result.json()
      const aiResponse = data.choices?.[0]?.message?.content

      if (!aiResponse) {
        throw new Error('No response received from AI')
      }

      // Split response into explanation and code
      const parts = aiResponse.split('CODE:')
      if (parts.length !== 2) {
        throw new Error('Invalid response format')
      }

      const explanation = parts[0].trim()
      let newCode = parts[1].trim()

      // Validate that the response contains PHP code
      if (!newCode.includes('<?php')) {
        throw new Error('No valid PHP code found in response')
      }

      // Add to changelog
      const newEntry: ChangelogEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
        description: fullRevisionRequest,
        files: revisionFiles.map(f => f.name),
        aiResponse: explanation,
        codeChanges: newCode
      }

      setChangelog(prev => [newEntry, ...prev])

      // Update the current plugin code
      setGeneratedCode(newCode)
      createFileStructure(newCode)
      
      // Clear revision inputs and files
      setRevisionDescription('')
      setRevisionFiles([])
      
      // Force clear the RichTextarea
      const richTextareaElement = document.querySelector('.revision-textarea') as HTMLTextAreaElement
      if (richTextareaElement) {
        richTextareaElement.value = ''
      }
    } catch (err) {
      console.error('Error submitting revision:', err)
      setError(`Error submitting revision: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Left Sidebar - File Explorer (20%) */}
      <div className="w-1/5 border-r">
        <div className="p-4 border-b">
          <h2 className="font-semibold mb-2">Files</h2>
          <div className="h-[calc(100vh-8rem)] overflow-auto">
            <FileExplorer
              files={fileStructure}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
            />
          </div>
        </div>
      </div>

      {/* Middle Section - Code Editor (40%) */}
      <div className="w-2/5 flex flex-col border-r">
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
                  Attached files: {attachedFiles.map(f => f.name).join(', ')}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={generateCode}
                disabled={loading || isCreatingPreview}
                className={`${
                  hasFilledDetails 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-black hover:bg-black/90'
                } text-white`}
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : hasFilledDetails ? (
                  'Generate Plugin'
                ) : (
                  'Start'
                )}
              </Button>
              {generatedCode && (
                <>
                  <Button
                    variant="outline"
                    onClick={downloadPlugin}
                    disabled={loading || isCreatingPreview}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={previewPlugin}
                    disabled={loading || isCreatingPreview}
                  >
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Code Editor / Preview Section */}
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
                />
              </TabsContent>
              <TabsContent value="preview" className="h-[calc(100%-40px)]">
                <div className="w-full h-full">
                  {adminDetails ? (
                    <iframe
                      src={`${adminDetails.url}/wp-admin/?auto_login=true`}
                      className="w-full h-full border rounded-md"
                      title="WordPress Preview"
                    />
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

      {/* Right Section - Revision History (40%) */}
      <div className="w-2/5 flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Revision History</h2>
        </div>
        
        {/* Moved revision input to top */}
        {generatedCode && (
          <div className="p-4 border-b space-y-4">
            <RichTextarea
              placeholder="Describe the changes needed..."
              value={revisionDescription}
              onChange={setRevisionDescription}
              onFilesSelected={setRevisionFiles}
              className="min-h-[100px] revision-textarea"
            />
            {revisionFiles.length > 0 && (
              <div className="text-sm text-gray-500">
                Attached files: {revisionFiles.map(f => f.name).join(', ')}
              </div>
            )}
            <div className="flex justify-end">
              <Button 
                onClick={handleRevisionSubmit}
                disabled={!revisionDescription || loading || revisionFiles.length === 0}
                className="bg-black text-white hover:bg-black/90"
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
        
        {/* Changelog entries below */}
        <div className="flex-1 overflow-auto p-4">
          <Changelog entries={changelog} />
        </div>
      </div>

      {/* Modals */}
      <AdminDetailsModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        details={adminDetails}
      />
      {/* <RevisionModal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        onSubmit={handleRevisionSubmit}
        pluginName={pluginName}
      /> */}
      <PluginDetailsModal
        isOpen={showPluginDetailsModal}
        onClose={() => setShowPluginDetailsModal(false)}
        onSubmit={async (details) => {
          setPluginDetails(details)
          setPluginName(details.name)
          setHasFilledDetails(true)
          setShowPluginDetailsModal(false)
        }}
      />

      {/* Loading Overlay */}
      {isCreatingPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-lg font-semibold">Creating preview site...</p>
            <p className="text-sm text-gray-600 mt-2">
              This may take up to a minute. Please wait.
            </p>
          </Card>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  )
}

