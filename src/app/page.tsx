"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Download, Eye, RefreshCw, Code, Save, FolderOpen, FileText, Loader2, Wand2, Settings2, Play, FileCode, MessageSquare } from "lucide-react"
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
import { WordPressConnector, type WordPressConnection } from "@/components/wordpress-connector"
import { DeployToWordPressButton } from "@/components/deploy-to-wordpress-button"
import JSZip from 'jszip'
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppMenu } from "@/components/app-menu"

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
  const [wordpressConnection, setWordpressConnection] = useState<WordPressConnection | null>(null)
  const [pluginZipBase64, setPluginZipBase64] = useState<string | null>(null)
  // Add state variable to track the last deployed plugin slug
  const [lastDeployedPluginSlug, setLastDeployedPluginSlug] = useState<string | null>(null)
  // Add state variables for the plugin errors modal
  const [isPluginErrorsModalOpen, setIsPluginErrorsModalOpen] = useState(false)
  const [isCheckingPluginErrors, setIsCheckingPluginErrors] = useState(false)
  const [pluginErrorsContent, setPluginErrorsContent] = useState<string | null>(null)
  const [filteredPluginErrors, setFilteredPluginErrors] = useState<string | null>(null)
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false)
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false)
  const [isDebugOpen, setIsDebugOpen] = useState(false)
  const [connectionRestored, setConnectionRestored] = useState(false)
  const [restoredSiteName, setRestoredSiteName] = useState("")
  // Add a state variable to store the download function
  const [downloadPluginFunction, setDownloadPluginFunction] = useState<(() => void) | null>(null);

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
    
    // Get the plugin slug for folder naming - ensure consistency
    const pluginSlug = pluginName ? pluginName.toLowerCase().replace(/\s+/g, '-') : 'plugin';
    console.log(`Using plugin slug for file structure: ${pluginSlug}`);
    
    // Try to parse using file markers first
    const fileMarkerRegex = /\/\*\s*FILE:\s*([^\s]+)\s*\*\/\s*([^]*?)(?=\/\*\s*FILE:|$)/g;
    let match;
    let foundFiles = false;
    
    while ((match = fileMarkerRegex.exec(code)) !== null) {
      foundFiles = true;
      let filePath = match[1].trim();
      const fileContent = match[2].trim();
      
      // Ensure the file path doesn't start with the plugin slug to avoid duplication
      if (filePath.startsWith(pluginSlug + '/') || filePath.startsWith(pluginSlug + '\\')) {
        // Path already has plugin slug, use as is
        console.log(`File path already has plugin slug: ${filePath}`);
      } else {
        // Add plugin slug to path
        filePath = `${pluginSlug}/${filePath}`;
        console.log(`Added plugin slug to file path: ${filePath}`);
      }
      
      // Add the file to the structure
      addFileToStructure(structure, filePath, fileContent);
    }
    
    // If no files were found with markers, try to identify PHP files
    if (!foundFiles) {
      // Check if the code contains multiple PHP files by looking for class definitions
      const classRegex = /class\s+([a-zA-Z0-9_]+)/g;
      const classes = [];
      let classMatch;
      
      while ((classMatch = classRegex.exec(code)) !== null) {
        classes.push(classMatch[1]);
      }
      
      // If we have multiple classes, this is likely a traditional plugin structure
      if (classes.length > 1) {
        console.log(`Detected multiple classes (${classes.length}), likely a traditional plugin structure`);
        
        // Look for PHP files with class definitions
        const phpClassRegex = /(?:\/\*\*[\s\S]*?\*\/\s*)?(?:\/\*[\s\S]*?\*\/\s*)?(<\?php[\s\S]*?class\s+([a-zA-Z0-9_]+)[\s\S]*?(?:\?>|$))/g;
        let phpMatch;
        
        while ((phpMatch = phpClassRegex.exec(code)) !== null) {
          const phpContent = phpMatch[0];
          const className = phpMatch[2];
          
          // Determine the file name based on class name and content
          let fileName;
          
          // Check if it's an admin class
          if (className.includes('Admin') || phpContent.includes('admin-specific')) {
            fileName = `admin/class-${pluginSlug}-admin.php`;
          }
          // Check if it's a public class
          else if (className.includes('Public') || phpContent.includes('public-facing')) {
            fileName = `public/class-${pluginSlug}-public.php`;
          }
          // Check if it's an activator class
          else if (className.includes('Activator')) {
            fileName = `includes/class-${pluginSlug}-activator.php`;
          }
          // Check if it's a deactivator class
          else if (className.includes('Deactivator')) {
            fileName = `includes/class-${pluginSlug}-deactivator.php`;
          }
          // Check if it's an i18n class
          else if (className.includes('i18n') || className.includes('I18n') || phpContent.includes('internationalization')) {
            fileName = `includes/class-${pluginSlug}-i18n.php`;
          }
          // Check if it's a loader class
          else if (className.includes('Loader')) {
            fileName = `includes/class-${pluginSlug}-loader.php`;
          }
          // Check if it's the main plugin class
          else if (className.includes(pluginSlug.replace(/-/g, '_')) || 
                  className.includes(pluginName?.replace(/\s+/g, '_'))) {
            fileName = `includes/class-${pluginSlug}.php`;
          }
          // Default case for other classes
          else {
            fileName = `includes/class-${className.toLowerCase()}.php`;
          }
          
          // Ensure the file path includes the plugin slug
          const filePath = `${pluginSlug}/${fileName}`;
          console.log(`Adding class file to structure: ${filePath} (${className})`);
          
          // Add the file to the structure
          addFileToStructure(structure, filePath, phpContent);
        }
        
        // Look for the main plugin file (with plugin header)
        const mainPluginRegex = /(<\?php[\s\S]*?Plugin Name:[\s\S]*?(?:\?>|$))/;
        const mainPluginMatch = code.match(mainPluginRegex);
        
        if (mainPluginMatch) {
          const mainPluginContent = mainPluginMatch[1];
          const mainFilePath = `${pluginSlug}/${pluginSlug}.php`;
          console.log(`Adding main plugin file to structure: ${mainFilePath}`);
          
          // Add the main plugin file to the structure
          addFileToStructure(structure, mainFilePath, mainPluginContent);
        }
      } else {
      // Look for PHP files
      const phpFileRegex = /(?:\/\*\*[\s\S]*?\*\/\s*)?(?:\/\*[\s\S]*?\*\/\s*)?(<\?php[\s\S]*?(?:\?>|$))/g;
      let phpMatch;
      
      while ((phpMatch = phpFileRegex.exec(code)) !== null) {
        const phpContent = phpMatch[0];
        
        // Try to extract the plugin name from the content
        const pluginNameMatch = phpContent.match(/Plugin Name:\s*([^\r\n]+)/);
          const extractedPluginName = pluginNameMatch ? pluginNameMatch[1].trim() : null;
        
        // Determine the file name based on content
          let fileName = `${pluginSlug}.php`;
        
        // Check if it's an admin class
        if (phpContent.includes('class Admin') || phpContent.includes('admin-specific')) {
            fileName = `admin/class-${pluginSlug}-admin.php`;
        } 
        // Check if it's a public class
        else if (phpContent.includes('class Public') || phpContent.includes('public-facing')) {
            fileName = `public/class-${pluginSlug}-public.php`;
          }
          // Check if it's an activator class
          else if (phpContent.includes('class Activator')) {
            fileName = `includes/class-${pluginSlug}-activator.php`;
          }
          // Check if it's a deactivator class
          else if (phpContent.includes('class Deactivator')) {
            fileName = `includes/class-${pluginSlug}-deactivator.php`;
          }
          // Check if it's an i18n class
          else if (phpContent.includes('class i18n') || phpContent.includes('internationalization')) {
            fileName = `includes/class-${pluginSlug}-i18n.php`;
          }
          // Check if it's a loader class
          else if (phpContent.includes('class Loader')) {
            fileName = `includes/class-${pluginSlug}-loader.php`;
          }
          // Check if it's the main plugin class
          else if (phpContent.includes(`class ${extractedPluginName?.replace(/\s+/g, '_')}`) || 
                  phpContent.includes(`class ${pluginSlug.replace(/-/g, '_')}`)) {
            fileName = `includes/class-${pluginSlug}.php`;
          }
          // If it has a plugin header, it's the main plugin file
          else if (phpContent.includes('Plugin Name:')) {
            fileName = `${pluginSlug}.php`;
          }
          
          // Ensure the file path includes the plugin slug
          const filePath = `${pluginSlug}/${fileName}`;
          console.log(`Adding PHP file to structure: ${filePath}`);
        
        // Add the file to the structure
          addFileToStructure(structure, filePath, phpContent);
        }
      }
    }
    
    // If still no files were found, create a default structure with a single file
    if (structure.length === 0) {
      const mainFile = `${pluginSlug}.php`;
      const filePath = `${pluginSlug}/${mainFile}`;
      
      console.log(`No files found, creating default structure with main file: ${filePath}`);
      addFileToStructure(structure, filePath, code);
    }
    
    return structure;
  };

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

  const generateCode = async (skipDescriptionValidation = false) => {
    console.log("generateCode called, description:", description, "skipDescriptionValidation:", skipDescriptionValidation);
    
    // Check if description is empty and there are no attached files, but only if not skipping validation
    if (!skipDescriptionValidation && !description.trim() && attachedFiles.length === 0) {
      console.log("No description or attachments, showing validation modal");
      setShowValidationModal(true);
      return;
    }

    // When skipDescriptionValidation is true, we're coming from the plugin details modal
    // and should proceed directly to code generation without additional checks
    if (!skipDescriptionValidation && !hasFilledDetails) {
      console.log("No plugin details, showing plugin details modal");
      setShowPluginDetailsModal(true);
      return;
    }

    // Skip the pluginDetails check when skipDescriptionValidation is true
    // because we're coming directly from the plugin details modal
    if (!skipDescriptionValidation && !pluginDetails) {
      console.log("No plugin details object, showing error");
      setError("Please fill in plugin details first");
      return;
    }

    // Ensure pluginDetails exists before proceeding
    if (!pluginDetails) {
      console.log("No plugin details available, showing error");
      setError("Plugin details are missing. Please try again.");
      return;
    }

    // Use our new function with the existing plugin details
    console.log("Calling generateCodeWithDetails with existing pluginDetails");
    await generateCodeWithDetails(pluginDetails);
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
    console.log("Parsing AI response:", response.substring(0, 100) + "...");
    
    // Check for code blocks with or without the php tag
    const codeBlockRegex = /```(?:php)?\s*([\s\S]*?)```/g;
    const matches = Array.from(response.matchAll(codeBlockRegex));
    
    if (matches.length > 0) {
      console.log(`Found ${matches.length} code blocks in response`);
      
      // Use the largest code block (most likely the complete plugin)
      let largestMatch = matches[0];
      let largestLength = largestMatch[1].length;
      
      for (const match of matches) {
        if (match[1].length > largestLength) {
          largestMatch = match;
          largestLength = match[1].length;
        }
      }
      
      let code = largestMatch[1]
        .replace(/^[\s\S]*?<\?php\s*/m, "<?php\n")
        .replace(/\n<\?php/g, "")
        .trim();
    
      // Clean up code to remove artifacts that could break WordPress plugins
      code = cleanAndFormatCode(code);

      console.log("Extracted code length:", code.length);

      // Create a message without the code blocks
      let message = response.replace(codeBlockRegex, "").trim();
      
      // If the code doesn't have a plugin header but the original code does, preserve the header
      if (!code.includes("Plugin Name:") && generatedCode.includes("Plugin Name:")) {
        console.log("Preserving existing plugin header");
        const existingHeader = generatedCode.match(/\/\*[\s\S]*?\*\//)?.[0] || "";
        return {
          message,
          codeUpdate: `${existingHeader}\n\n${code}`,
        };
      }

      // Ensure the code starts with <?php
      const finalCode = code.startsWith("<?php") ? code : `<?php\n${code}`;
      console.log("Final code length:", finalCode.length);

      return {
        message,
        codeUpdate: finalCode,
      };
    } else {
      console.log("No code blocks found in response");
      
      // Check if the response contains PHP code without code blocks
      if (response.includes("<?php") && response.includes("function")) {
        console.log("Found PHP code without code blocks");
        
        // Try to extract the PHP code
        const phpCode = response.substring(response.indexOf("<?php"));
        
        // Clean up code
        const cleanedCode = cleanAndFormatCode(phpCode);
        
        return {
          message: "Code updated based on your request.",
          codeUpdate: cleanedCode,
        };
      }
    }

    console.log("No code update found in response");
    return { message: response };
  };

  const createFileStructure = (code: string) => {
    console.log("createFileStructure called with code:", code.substring(0, 200) + "...");
    
    // Extract plugin name from the code if pluginDetails is not available
    let pluginName = "my-plugin";
    let isTraditional = false;
    
    if (pluginDetails?.name) {
      console.log("Using plugin name from pluginDetails:", pluginDetails.name);
      pluginName = pluginDetails.name;
      isTraditional = pluginDetails.structure === "traditional";
    } else {
      // Try to extract plugin name from the code
      const nameMatch = code.match(/Plugin Name:\s*([^\n]*)/);
      if (nameMatch && nameMatch[1]) {
        pluginName = nameMatch[1].trim();
        console.log("Extracted plugin name from code:", pluginName);
      } else {
        console.log("Could not extract plugin name from code, using default:", pluginName);
      }
    }
    
    // Create a slug from the plugin name
    const pluginSlug = pluginName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    console.log("Using plugin slug for file structure:", pluginSlug);

    const headerMatch = code.match(/\/\*[\s\S]*?\*\//)
    const pluginHeader = headerMatch ? headerMatch[0] : ""
    const mainCode = code.replace(headerMatch?.[0] || "", "").trim()
    const customFunctions = extractCustomFunctions(mainCode)

    const structure: FileStructure[] = [
      {
        name: pluginSlug,
        type: "folder",
        children: isTraditional
          ? [
          {
            name: "admin",
            type: "folder",
            children: [
                  {
                    name: `class-${pluginSlug}-admin.php`,
                    type: "file",
                    content: generateAdminClass(pluginName),
                    path: `${pluginSlug}/admin/class-${pluginSlug}-admin.php`
                  },
              {
                name: "css",
                type: "folder",
                    children: [
                      {
                        name: "index.php",
                        type: "file",
                        content: "<?php // Silence is golden",
                        path: `${pluginSlug}/admin/css/index.php`
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
                        path: `${pluginSlug}/admin/js/index.php`
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
                        path: `${pluginSlug}/admin/partials/index.php`
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
                    name: `class-${pluginSlug}-activator.php`,
                type: "file",
                    content: generateActivatorClass(pluginName),
                    path: `${pluginSlug}/includes/class-${pluginSlug}-activator.php`
              },
              {
                    name: `class-${pluginSlug}-deactivator.php`,
                type: "file",
                    content: generateDeactivatorClass(pluginName),
                    path: `${pluginSlug}/includes/class-${pluginSlug}-deactivator.php`
                  },
                  {
                    name: `class-${pluginSlug}-i18n.php`,
                    type: "file",
                    content: generateI18nClass(pluginName),
                    path: `${pluginSlug}/includes/class-${pluginSlug}-i18n.php`
                  },
                  {
                    name: `class-${pluginSlug}-loader.php`,
                    type: "file",
                    content: generateLoaderClass(pluginName),
                    path: `${pluginSlug}/includes/class-${pluginSlug}-loader.php`
                  },
                  {
                    name: `class-${pluginSlug}.php`,
                    type: "file",
                    content: generateMainClass(pluginName),
                    path: `${pluginSlug}/includes/class-${pluginSlug}.php`
                  },
                  {
                    name: "index.php",
                    type: "file",
                    content: "<?php // Silence is golden",
                    path: `${pluginSlug}/includes/index.php`
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
                    path: `${pluginSlug}/languages/index.php`
                  },
                  {
                    name: `${pluginSlug}.pot`,
                    type: "file",
                    content: "",
                    path: `${pluginSlug}/languages/${pluginSlug}.pot`
                  }
                ]
          },
          {
            name: "public",
            type: "folder",
            children: [
                  {
                    name: `class-${pluginSlug}-public.php`,
                    type: "file",
                    content: generatePublicClass(pluginName),
                    path: `${pluginSlug}/public/class-${pluginSlug}-public.php`
                  },
              {
                name: "css",
                type: "folder",
                    children: [
                      {
                        name: "index.php",
                        type: "file",
                        content: "<?php // Silence is golden",
                        path: `${pluginSlug}/public/css/index.php`
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
                        path: `${pluginSlug}/public/js/index.php`
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
                        path: `${pluginSlug}/public/partials/index.php`
                      }
                    ]
                  }
                ]
              },
              {
                name: "index.php",
                type: "file",
                content: "<?php // Silence is golden",
                path: `${pluginSlug}/index.php`
              },
              {
                name: "LICENSE.txt",
            type: "file",
                content: generateLicenseContent(),
                path: `${pluginSlug}/LICENSE.txt`
              },
              {
                name: "README.txt",
                type: "file",
                content: generateReadmeContent(pluginName),
                path: `${pluginSlug}/README.txt`
              },
              {
                name: `${pluginSlug}.php`,
                type: "file",
                content: generateMainPluginFile(pluginHeader, customFunctions, pluginName),
                path: `${pluginSlug}/${pluginSlug}.php`
              },
              {
                name: "uninstall.php",
                type: "file",
                content: generateUninstallContent(),
                path: `${pluginSlug}/uninstall.php`
              }
            ]
          : [
              {
                name: `${pluginSlug}.php`,
                type: "file",
                content: code,
                path: `${pluginSlug}/${pluginSlug}.php`
              }
            ]
      }
    ]

    console.log("Setting file structure:", structure);
    setFileStructure(structure);
    
    const mainFilePath = `${pluginSlug}/${pluginSlug}.php`;
    console.log("Setting selected file:", mainFilePath);
    setSelectedFile(mainFilePath);
    
    // Set the plugin name state
    setPluginName(pluginName);
    console.log("Plugin name set to:", pluginName);
    
    // Save to localStorage
    try {
      localStorage.setItem("fileStructure", JSON.stringify(structure));
      localStorage.setItem("selectedFile", mainFilePath);
      localStorage.setItem("pluginName", pluginName);
      console.log("Saved file structure to localStorage");
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
    
    // After setting the file structure, generate the plugin ZIP
    generatePluginZip().then(base64content => {
      if (base64content) {
        setPluginZipBase64(base64content);
        console.log("Plugin ZIP generated successfully");
      } else {
        console.error("Failed to generate plugin ZIP");
      }
    });
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

  // Add this function to generate the ZIP file and set the base64 content
  const generatePluginZip = async () => {
    if (!generatedCode || !pluginName) return null;
    
    try {
      // Create a ZIP file
      const zip = new JSZip();
      
      // Add files to the ZIP
      if (fileStructure.length > 0) {
        // Add all files from the file structure
        const addFilesToZip = (items: FileStructure[], parentPath: string = '') => {
          for (const item of items) {
            const itemPath = parentPath ? `${parentPath}/${item.name}` : item.name;
            
            if (item.type === 'file' && item.content) {
              zip.file(itemPath, item.content);
            } else if (item.type === 'folder' && item.children) {
              addFilesToZip(item.children, itemPath);
            }
          }
        };
        
        addFilesToZip(fileStructure);
      } else {
        // If no file structure, just add the main plugin file
        zip.file(`${pluginName}.php`, generatedCode);
      }
      
      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Convert to base64
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Remove the data URL prefix (data:application/zip;base64,)
          const base64content = base64data.split(',')[1];
          resolve(base64content);
        };
        reader.readAsDataURL(zipBlob);
      });
    } catch (error) {
      console.error("Error generating plugin ZIP:", error);
      return null;
    }
  };

  // Add a new function to generate the ZIP without downloading it
  const generatePluginZipOnly = async (): Promise<string | null> => {
    if (!pluginName) {
      console.error("Cannot generate plugin ZIP: Missing plugin name");
      return null;
    }

    setLoading(true);
    
    try {
      // Create a proper plugin slug for the file name
      const pluginSlug = pluginName.toLowerCase().replace(/\s+/g, '-');
      
      // Use the current file structure from the UI instead of parsing the code
      // This ensures we include all files exactly as they appear in the file viewer
      if (fileStructure.length > 0) {
        console.log("Using file structure from UI for ZIP generation");
        console.log("File structure:", JSON.stringify(fileStructure, null, 2));
        
        // Create a ZIP file
        const zip = new JSZip();
        
        // Function to add files to the ZIP with proper paths
        const addFilesToZip = (items: FileStructure[], currentPath: string = '') => {
          for (const item of items) {
            // Determine the path for this item
            const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
            
            // Handle files
            if (item.type === 'file' && item.content) {
              console.log(`Adding file to ZIP: ${itemPath}`);
              zip.file(itemPath, item.content);
            } 
            // Handle folders recursively
            else if (item.type === 'folder' && item.children) {
              addFilesToZip(item.children, itemPath);
            }
          }
        };
        
        // Add all files and folders to the ZIP
        addFilesToZip(fileStructure);
        
        // Generate the ZIP file
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        // Convert to base64 for WordPress deployment
        const base64content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            // Remove the data URL prefix (data:application/zip;base64,)
            const base64content = base64data.split(',')[1];
            console.log(`Generated ZIP file with base64 length: ${base64content.length}`);
            resolve(base64content);
          };
          reader.readAsDataURL(zipBlob);
        });
        
        // Set the base64 content for WordPress deployment
        setPluginZipBase64(base64content);
        
        // Create and trigger download link
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${pluginSlug}.zip`;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
        
        console.log(`Download triggered for ${pluginSlug}.zip`);
        
        return base64content;
      } else {
        // If no file structure, fall back to using the code
        console.log("No file structure found, falling back to code parsing");
        
        // Get the current code from the editor
        let currentCode;
        
        if (selectedFile) {
          // For multi-file plugins, use the current version's code
          currentCode = currentVersionIndex >= 0 && codeVersions.length > 0
            ? codeVersions[currentVersionIndex].code
            : generatedCode;
          
          console.log(`Using code from version ${currentVersionIndex + 1} of ${codeVersions.length} for plugin ZIP`);
        } else {
          // For single-file plugins, use the editor content directly
          // This ensures we always use the most up-to-date code
          const editorElement = document.querySelector('.monaco-editor');
          if (editorElement && (editorElement as any).editor) {
            const editorContent = (editorElement as any).editor.getValue();
            if (editorContent && editorContent.trim().length > 0) {
              currentCode = editorContent;
              console.log('Using current editor content for plugin ZIP');
            } else {
              currentCode = generatedCode;
              console.log('Editor content empty, falling back to generatedCode');
            }
          } else {
            currentCode = generatedCode;
            console.log('Editor not found, falling back to generatedCode');
          }
        }
        
        if (!currentCode) {
          throw new Error("No code available to download");
        }
        
        console.log(`Generating plugin ZIP from code (${currentCode.length} characters)`);
        
        // Generate ZIP from the current code
        const base64content = await generatePluginZipFromCode(currentCode);
        
        if (!base64content) {
          throw new Error("Failed to generate plugin ZIP");
        }
        
        console.log(`Generated plugin ZIP with size: ${base64content.length} characters`);
        
        // Set the base64 content for WordPress deployment
        setPluginZipBase64(base64content);
        
        // Convert base64 to Blob for download
        const binaryString = window.atob(base64content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/zip' });
        
        // Create and trigger download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${pluginSlug}.zip`;
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
        
        console.log(`Download triggered for ${pluginSlug}.zip`);
        
        return base64content;
      }
    } catch (err) {
      console.error("ZIP generation error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Modify the downloadPlugin function to use generatePluginZipOnly
  const downloadPlugin = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
    }
    
    if (!pluginName) {
      alert("Please enter a plugin name before downloading.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Get the current code from the editor
      let currentCode = "";
      
      // For single-file plugins, use the editor content directly
      // For multi-file plugins, use the current version's code
      if (selectedFile && fileStructure.length > 0) {
        // For multi-file plugins, use the current version's code
        currentCode = currentVersionIndex >= 0 && codeVersions.length > 0
          ? codeVersions[currentVersionIndex].code
          : generatedCode || "";
        
        console.log(`Using code from version ${currentVersionIndex + 1} of ${codeVersions.length} for plugin ZIP`);
      } else {
        // For single-file plugins, use the editor content directly
        // This ensures we always use the most up-to-date code
        const editorElement = document.querySelector('.monaco-editor');
        if (editorElement && (editorElement as any).editor) {
          const editorContent = (editorElement as any).editor.getValue();
          if (editorContent && editorContent.trim().length > 0) {
            currentCode = editorContent;
            console.log('Using current editor content for plugin ZIP');
          } else {
            currentCode = generatedCode || "";
            console.log('Editor content empty, falling back to generatedCode');
          }
        } else {
          currentCode = generatedCode || "";
          console.log('Editor not found, falling back to generatedCode');
        }
      }
      
      if (!currentCode) {
        throw new Error("No code available to download");
      }
      
      console.log(`Generating plugin ZIP from code (${currentCode.length} characters)`);
      
      // Create a ZIP file
      const zip = new JSZip();
      
      // Create a proper plugin slug for the folder name
      const pluginSlug = pluginName.toLowerCase().replace(/\s+/g, '-');
      console.log(`Using plugin slug for ZIP: ${pluginSlug}`);
      
      // Create a temporary file structure from the code
      const tempFileStructure = parseCodeToFileStructure(currentCode);
      
      console.log("File structure:", JSON.stringify(tempFileStructure, null, 2));
      
      // Add files to the ZIP
      if (tempFileStructure.length > 0) {
        // Check if this is a traditional plugin structure with multiple files
        const hasTopLevelPluginSlugFolder = tempFileStructure.some(item => 
          item.type === 'folder' && item.name === pluginSlug
        );
        
        const hasTraditionalFolders = tempFileStructure.some(item => 
          item.type === 'folder' && ['admin', 'includes', 'public'].includes(item.name)
        );
        
        const isTraditionalStructure = hasTopLevelPluginSlugFolder || hasTraditionalFolders;
        
        console.log(`Detected ${isTraditionalStructure ? 'traditional' : 'simple'} plugin structure`);
        console.log(`Has top-level plugin slug folder: ${hasTopLevelPluginSlugFolder}`);
        console.log(`Has traditional folders: ${hasTraditionalFolders}`);
        
        // Function to add files to the ZIP with proper paths
        const addFilesToZip = (items: FileStructure[], currentPath: string = '') => {
          for (const item of items) {
            // Determine the path for this item
            let itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
            
            // For traditional structures with no top-level plugin slug folder, add it
            if (isTraditionalStructure && !hasTopLevelPluginSlugFolder && currentPath === '') {
              itemPath = `${pluginSlug}/${item.name}`;
            } 
            // For simple structures, always add the plugin slug prefix
            else if (!isTraditionalStructure && !itemPath.startsWith(`${pluginSlug}/`)) {
              itemPath = `${pluginSlug}/${itemPath}`;
            }
            
            // Handle files
            if (item.type === 'file' && item.content) {
              console.log(`Adding file to ZIP: ${itemPath}`);
              zip.file(itemPath, item.content);
            } 
            // Handle folders recursively
            else if (item.type === 'folder' && item.children) {
              addFilesToZip(item.children, itemPath);
            }
          }
        };
        
        // Special handling for traditional structures with a top-level plugin slug folder
        if (isTraditionalStructure && hasTopLevelPluginSlugFolder) {
          // Find the plugin slug folder
          const pluginSlugFolder = tempFileStructure.find(item => 
            item.type === 'folder' && item.name === pluginSlug
          );
          
          if (pluginSlugFolder && pluginSlugFolder.type === 'folder' && pluginSlugFolder.children) {
            // Add the contents of the plugin slug folder directly
            for (const item of pluginSlugFolder.children) {
              let itemPath = `${pluginSlug}/${item.name}`;
              
              if (item.type === 'file' && item.content) {
                console.log(`Adding file to ZIP: ${itemPath}`);
                zip.file(itemPath, item.content);
              } else if (item.type === 'folder' && item.children) {
                addFilesToZip(item.children, itemPath);
              }
            }
            
            // Add any other top-level files/folders
            for (const item of tempFileStructure) {
              if (item.name !== pluginSlug) {
                let itemPath = `${pluginSlug}/${item.name}`;
                
                if (item.type === 'file' && item.content) {
                  console.log(`Adding file to ZIP: ${itemPath}`);
                  zip.file(itemPath, item.content);
                } else if (item.type === 'folder' && item.children) {
                  addFilesToZip(item.children, itemPath);
                }
              }
            }
          } else {
            // Fallback if something went wrong
            addFilesToZip(tempFileStructure);
          }
        } else {
          // For all other cases, use the standard function
          addFilesToZip(tempFileStructure);
        }
      } else {
        // If no file structure, just add the main plugin file
        const mainFileName = `${pluginSlug}.php`;
        const fullPath = `${pluginSlug}/${mainFileName}`;
        console.log(`Adding main plugin file to ZIP: ${fullPath}`);
        zip.file(fullPath, currentCode);
      }
      
      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Create a download link
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pluginSlug}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      
      // Convert to base64 for WordPress deployment
      const reader = new FileReader();
      reader.readAsDataURL(zipBlob);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // Remove the data URL prefix (data:application/zip;base64,)
        const base64content = base64data.split(',')[1];
        console.log(`Generated ZIP file with base64 length: ${base64content.length}`);
        setPluginZipBase64(base64content);
      };
      
      return true;
    } catch (err) {
      console.error("Download error:", err);
      setError(`Error downloading plugin: ${err instanceof Error ? err.message : "Unknown error"}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    // If plugin hasn't been generated yet and we're not showing the plugin details modal,
    // show the plugin details modal instead of sending the message
    if (!generatedPlugin && !showPluginDetailsModal) {
      // Save the content as the description
      setDescription(content);
      // Show the plugin details modal
      setShowPluginDetailsModal(true);
      // Return false to indicate the message wasn't actually sent
      return false;
    }

    if (!content.trim() && (!files || files.length === 0)) return false;

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
        const parsedResponse = parseAIResponse(tempResponse);
        console.log("Parsed response:", parsedResponse.message.substring(0, 100) + "...");
        console.log("Has code update:", !!parsedResponse.codeUpdate);
        
        // Update the message with the parsed response
        setMessages(prev => {
          const uniqueMessages = Array.from(new Map(prev.map(msg => [msg.id, msg])).values());
          return uniqueMessages.map(msg => 
            msg.id === tempMessageId 
              ? { 
                  ...msg, 
                  content: parsedResponse.message,
                  codeUpdate: !!parsedResponse.codeUpdate
                }
              : msg
          );
        });
        
        // If there's a code update, handle it
        if (parsedResponse.codeUpdate) {
          console.log("Code update detected, calling handleCodeUpdate with code length:", parsedResponse.codeUpdate.length);
          
          // Check if the code update is valid
          if (parsedResponse.codeUpdate.includes("<?php") && parsedResponse.codeUpdate.includes("function")) {
            // Handle the code update
            handleCodeUpdate(parsedResponse.codeUpdate);
          } else {
            console.log("Code update doesn't appear to be valid PHP code");
          }
        } else {
          console.log("No code update detected in parsed response");
          
          // Check if the message contains code-like content that might have been missed
          if (tempResponse.includes("<?php") && tempResponse.includes("function") && !tempResponse.includes("```")) {
            console.log("Message contains PHP code without code blocks, attempting to extract");
            
            // Try to extract PHP code from the message
            const phpStart = tempResponse.indexOf("<?php");
            if (phpStart !== -1) {
              const phpCode = tempResponse.substring(phpStart);
              console.log("Extracted PHP code length:", phpCode.length);
              
              // Handle the code update
              handleCodeUpdate(phpCode);
            }
          }
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

    // Return true to indicate the message was sent
    return true;
  }

  const handleSavePlugin = () => {
    if (!generatedCode || !pluginName) {
      setError("Please generate code and enter a plugin name before saving.")
      return
    }

    // Log detailed WordPress connection info before saving
    console.log("Saving plugin state with WordPress connection:", wordpressConnection);
    if (wordpressConnection) {
      console.log("WordPress connection details:", {
        siteUrl: wordpressConnection.siteUrl,
        connected: wordpressConnection.connected,
        hasFtpDetails: !!wordpressConnection.ftpDetails,
        ftpHost: wordpressConnection.ftpDetails?.host,
        ftpProtocol: wordpressConnection.ftpDetails?.protocol
      });
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
      changelog: changelog,
      wordpressConnection: wordpressConnection // Save the WordPress connection with all details
    }

    console.log("Complete state to be saved:", {
      id: completeState.id,
      name: completeState.name,
      hasCode: !!completeState.code,
      hasWordPressConnection: !!completeState.wordpressConnection,
      wordpressConnectionDetails: completeState.wordpressConnection ? {
        siteUrl: completeState.wordpressConnection.siteUrl,
        hasFtpDetails: !!completeState.wordpressConnection.ftpDetails,
        ftpDetailsComplete: completeState.wordpressConnection.ftpDetails ? 
          !!(completeState.wordpressConnection.ftpDetails.host && 
             completeState.wordpressConnection.ftpDetails.username && 
             completeState.wordpressConnection.ftpDetails.password) : false
      } : null
    });

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

      console.log("Loading plugin state:", {
        name: state.name,
        hasCode: !!state.code,
        hasWordPressConnection: !!state.wordpressConnection
      });

      // Log detailed WordPress connection info if available
      if (state.wordpressConnection) {
        console.log("WordPress connection details in loaded file:", {
          siteUrl: state.wordpressConnection.siteUrl,
          connected: state.wordpressConnection.connected,
          hasFtpDetails: !!state.wordpressConnection.ftpDetails,
          ftpHost: state.wordpressConnection.ftpDetails?.host,
          ftpProtocol: state.wordpressConnection.ftpDetails?.protocol
        });
      }

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
      
      // Restore WordPress connection if available
      if (state.wordpressConnection) {
        console.log("Restoring WordPress connection:", state.wordpressConnection);
        
        try {
          // Ensure we're setting the complete connection object with all FTP details
          setWordpressConnection(state.wordpressConnection)
          localStorage.setItem('wordpressConnection', JSON.stringify(state.wordpressConnection))
          
          // Show a notification that the WordPress connection has been restored
          setConnectionRestored(true)
          setRestoredSiteName(state.wordpressConnection.siteName || state.wordpressConnection.siteUrl)
          
          // Add more detailed information about the connection that was restored
          const ftpDetails = state.wordpressConnection.ftpDetails;
          console.log("WordPress connection restored with FTP details:", 
            ftpDetails ? {
              host: ftpDetails.host,
              protocol: ftpDetails.protocol,
              username: ftpDetails.username,
              hasPassword: !!ftpDetails.password,
              rootPath: ftpDetails.rootPath
            } : "No FTP details available");
          
          // Hide the notification after 3 seconds
          setTimeout(() => {
            setConnectionRestored(false)
          }, 3000)
          
          console.log("WordPress connection restored successfully");
        } catch (connErr) {
          console.error("Error restoring WordPress connection:", connErr);
        }
      } else {
        console.log("No WordPress connection found in the loaded state");
      }
      
      // Set the selected file to the main plugin file
      setSelectedFile(`${state.name}/${state.name}.php`)
      
      // After successfully loading a plugin, set generatedPlugin to true
      setGeneratedPlugin(true)
      setError(null)
    } catch (error) {
      console.error("Error loading plugin state:", error)
      setError("Failed to load plugin state. The file may be corrupted.")
    }

    // Reset the file input
    event.target.value = ""
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
    if (!code) {
      console.log("handleCodeUpdate called with empty code");
      return;
    }
    
    console.log("handleCodeUpdate called with code length:", code.length);
    
    // Store the code update for later use
    setPendingCodeUpdate(code);
    
    // Show the version update modal
    console.log("Setting showVersionUpdateModal to true");
    setShowVersionUpdateModal(true);
  }

  const handleVersionUpdateSubmit = (newVersion: string, updateDetails?: boolean, updatedDetails?: Partial<PluginDetails>) => {
    console.log("Version update submitted with new version:", newVersion);
    console.log("Update details:", updateDetails);
    console.log("Updated details:", updatedDetails);
    
    if (!pendingCodeUpdate) {
      console.error("No pending code update found when trying to update version");
      setError("No pending code update found. Please try again.");
      return;
    }
    
    // Update plugin details with new version and any other updated details
    if (pluginDetails) {
      console.log("Updating plugin details with new version:", newVersion);
      let updatedPluginDetails = {
        ...pluginDetails,
        version: newVersion
      };
      
      // If updateDetails is true and updatedDetails is provided, update the plugin details
      if (updateDetails && updatedDetails) {
        console.log("Updating additional plugin details");
        updatedPluginDetails = {
          ...updatedPluginDetails,
          ...(updatedDetails.name && { name: updatedDetails.name }),
          ...(updatedDetails.description && { description: updatedDetails.description }),
          ...(updatedDetails.author && { author: updatedDetails.author }),
          ...(updatedDetails.uri && { uri: updatedDetails.uri })
        };
      }
      
      setPluginDetails(updatedPluginDetails);
    }
    
    // Start with updating the version in the plugin code header
    console.log("Updating version in plugin code header");
    let updatedCode = pendingCodeUpdate.replace(
      /(\* Version:\s*)([0-9.]+)/,
      `$1${newVersion}`
    );
    
    // If updateDetails is true and updatedDetails is provided, update other header fields
    if (updateDetails && updatedDetails) {
      console.log("Updating additional plugin header fields");
      
      // Update Plugin Name
      if (updatedDetails.name) {
        updatedCode = updatedCode.replace(
          /(\* Plugin Name:\s*)(.+?)(\r?\n)/,
          `$1${updatedDetails.name}$3`
        );
      }
      
      // Update Description
      if (updatedDetails.description) {
        updatedCode = updatedCode.replace(
          /(\* Description:\s*)(.+?)(\r?\n)/,
          `$1${updatedDetails.description}$3`
        );
      }
      
      // Update Author
      if (updatedDetails.author) {
        updatedCode = updatedCode.replace(
          /(\* Author:\s*)(.+?)(\r?\n)/,
          `$1${updatedDetails.author}$3`
        );
      }
      
      // Update Plugin URI
      if (updatedDetails.uri) {
        updatedCode = updatedCode.replace(
          /(\* Plugin URI:\s*)(.+?)(\r?\n)/,
          `$1${updatedDetails.uri}$3`
        );
      }
    }
    
    // Update the generated code
    console.log("Setting generated code with updated version");
    setGeneratedCode(updatedCode);
    
    // Create a new file structure
    console.log("Creating new file structure");
    createFileStructure(updatedCode);
    
    // Add a new version to the code versions
    console.log("Adding new code version");
    const versionDescription = updateDetails 
      ? `Updated to version ${newVersion} with modified plugin details` 
      : `Updated to version ${newVersion}`;
    
    addCodeVersion(updatedCode, versionDescription, `v${newVersion}`);
    
    // Clear the pending code update
    console.log("Clearing pending code update");
    setPendingCodeUpdate(null);
    
    // Close the modal
    console.log("Closing version update modal");
    setShowVersionUpdateModal(false);
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
    // Check for force_new_session parameter in URL and remove it if present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('force_new_session')) {
      // Clear localStorage for a fresh session if force_new_session is in the URL
      console.log("Force new session parameter detected, clearing localStorage");
      localStorage.clear();
      
      // Redirect to clean URL without the parameter
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    // Load saved state from localStorage
    const savedMessages = localStorage.getItem('messages')
    const savedCodeVersions = localStorage.getItem('codeVersions')
    const savedPluginDetails = localStorage.getItem('pluginDetails')
    const savedGeneratedCode = localStorage.getItem('generatedCode')
    const savedGeneratedPlugin = localStorage.getItem('generatedPlugin')
    const savedFileStructure = localStorage.getItem('fileStructure')
    const savedSelectedFile = localStorage.getItem('selectedFile')
    const savedLastDeployedPluginSlug = localStorage.getItem('lastDeployedPluginSlug')
    const savedDescription = localStorage.getItem('description')
    
    console.log("Loading session from localStorage");
    
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages as string))
      } catch (e) {
        console.error("Error parsing saved messages:", e)
      }
    }
    
    if (savedDescription) {
      console.log("Loading description from localStorage:", savedDescription);
      setDescription(savedDescription);
    }
    
    if (savedCodeVersions) {
      try {
        const versions = JSON.parse(savedCodeVersions as string)
        setCodeVersions(versions)
        if (versions.length > 0) {
          setCurrentVersionIndex(versions.length - 1)
        }
      } catch (e) {
        console.error("Error parsing saved code versions:", e)
      }
    }
    
    if (savedPluginDetails) {
      try {
        const details = JSON.parse(savedPluginDetails as string)
        setPluginDetails(details)
        setPluginName(details.name)
        setHasFilledDetails(true)
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
    
    if (savedFileStructure) {
      try {
        setFileStructure(JSON.parse(savedFileStructure as string))
      } catch (e) {
        console.error("Error parsing saved file structure:", e)
      }
    }
    
    if (savedSelectedFile) {
      setSelectedFile(savedSelectedFile)
    }
    
    if (savedLastDeployedPluginSlug) {
      console.log("Loading last deployed plugin slug from localStorage:", savedLastDeployedPluginSlug);
      setLastDeployedPluginSlug(savedLastDeployedPluginSlug);
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
    
    // Save description
    if (description) {
      localStorage.setItem("description", description);
    }
    
    // Save file structure
    if (fileStructure.length > 0) {
      localStorage.setItem("fileStructure", JSON.stringify(fileStructure))
    }
    
    // Save selected file
    if (selectedFile) {
      localStorage.setItem("selectedFile", selectedFile)
    }
    
    // Save last deployed plugin slug
    if (lastDeployedPluginSlug) {
      console.log("Saving lastDeployedPluginSlug to localStorage:", lastDeployedPluginSlug);
      localStorage.setItem("lastDeployedPluginSlug", lastDeployedPluginSlug);
    }
    
    // Log the current state before saving to localStorage
    console.log("Saving generatedPlugin to localStorage:", generatedPlugin)
    localStorage.setItem("generatedPlugin", String(generatedPlugin))
  }, [messages, codeVersions, pluginDetails, generatedCode, generatedPlugin, fileStructure, selectedFile, lastDeployedPluginSlug, description])

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

  // Update the setSelectedFile function to handle null values
  const handleFileSelect = (path: string) => {
    setSelectedFile(path)
  }

  // Add a function to handle new session
  const handleNewSession = () => {
    // Clear localStorage
    localStorage.clear();
    
    // Reset all state
    setDescription("");
    setGeneratedCode("");
    setMessages([]);
    setCodeVersions([]);
    setCurrentVersionIndex(-1);
    setFileStructure([]);
    setChangelog([]);
    setSelectedFile(null);
    setPluginDetails(null);
    setGeneratedPlugin(false);
    // Reset plugin name
    setPluginName("my-plugin");
    // Reset WordPress connection
    setWordpressConnection(null);
    // Reset plugin ZIP
    setPluginZipBase64(null);
    // Reset lastDeployedPluginSlug
    setLastDeployedPluginSlug(null);
    console.log("Reset lastDeployedPluginSlug to null");
    
    // Explicitly remove specific localStorage items to ensure they're cleared
    localStorage.removeItem("description");
    localStorage.removeItem("lastDeployedPluginSlug");
    localStorage.removeItem("pluginDetails");
    localStorage.removeItem("generatedCode");
    localStorage.removeItem("messages");
    localStorage.removeItem("codeVersions");
    localStorage.removeItem("fileStructure");
    localStorage.removeItem("selectedFile");
    localStorage.removeItem("generatedPlugin");
    localStorage.removeItem("wordpressConnection");
    
    console.log("Cleared all localStorage items");
    
    // Force a page reload to ensure all state is reset
    // This ensures any cached state in React components is also cleared
    window.location.href = window.location.pathname + '?force_new_session=true';
  }

  // Add this effect to load saved connection from localStorage
  useEffect(() => {
    const savedConnection = localStorage.getItem('wordpressConnection')
    if (savedConnection) {
      try {
        setWordpressConnection(JSON.parse(savedConnection))
      } catch (e) {
        console.error('Failed to parse saved WordPress connection', e)
      }
    }
    
    // Load lastDeployedPluginSlug from localStorage
    const savedLastDeployedPluginSlug = localStorage.getItem('lastDeployedPluginSlug')
    if (savedLastDeployedPluginSlug) {
      console.log("Loading last deployed plugin slug from localStorage:", savedLastDeployedPluginSlug);
      setLastDeployedPluginSlug(savedLastDeployedPluginSlug);
    } else {
      console.log("No saved lastDeployedPluginSlug found in localStorage");
    }
  }, [])

  // Add this function to handle new connections
  const handleWordPressConnect = (connection: WordPressConnection) => {
    setWordpressConnection(connection)
    localStorage.setItem('wordpressConnection', JSON.stringify(connection))
  }

  // Add a new function to generate a ZIP file from specific code
  const generatePluginZipFromCode = async (code: string) => {
    if (!code || !pluginName) return null;
    
    try {
      // Create a ZIP file
      const zip = new JSZip();
      
      // Create a proper plugin slug for the folder name - ensure consistency
      const pluginSlug = pluginName.toLowerCase().replace(/\s+/g, '-');
      console.log(`Using plugin slug for ZIP: ${pluginSlug}`);
      
      // Create a temporary file structure from the code
      const tempFileStructure = parseCodeToFileStructure(code);
      
      console.log("File structure:", JSON.stringify(tempFileStructure, null, 2));
      
      // Add files to the ZIP
      if (tempFileStructure.length > 0) {
        // Check if this is a traditional plugin structure with multiple files
        const hasTopLevelPluginSlugFolder = tempFileStructure.some(item => 
          item.type === 'folder' && item.name === pluginSlug
        );
        
        // Check for traditional folders in the structure
        const hasTraditionalFolders = (() => {
          // Function to check for traditional folders recursively
          const checkForTraditionalFolders = (items: FileStructure[], inPluginSlugFolder = false) => {
            for (const item of items) {
              if (item.type === 'folder') {
                // If this is the plugin slug folder, check its children
                if (item.name === pluginSlug && item.children) {
                  if (checkForTraditionalFolders(item.children, true)) {
                    return true;
                  }
                }
                
                // Check if this is a traditional folder
                if (['admin', 'includes', 'public'].includes(item.name)) {
                  return true;
                }
                
                // Check children recursively
                if (item.children && checkForTraditionalFolders(item.children, inPluginSlugFolder)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          return checkForTraditionalFolders(tempFileStructure);
        })();
        
        // Check for multiple PHP files in the structure
        const hasMultiplePhpFiles = (() => {
          let phpFileCount = 0;
          
          // Function to count PHP files recursively
          const countPhpFiles = (items: FileStructure[]) => {
            for (const item of items) {
              if (item.type === 'file' && item.name.endsWith('.php')) {
                phpFileCount++;
                if (phpFileCount > 1) {
                  return true;
                }
              } else if (item.type === 'folder' && item.children) {
                if (countPhpFiles(item.children)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          return countPhpFiles(tempFileStructure);
        })();
        
        // Force traditional structure if we have multiple classes in the code
        const hasMultipleClasses = (() => {
          const classRegex = /class\s+([a-zA-Z0-9_]+)/g;
          const classes = [];
          let match;
          
          while ((match = classRegex.exec(code)) !== null) {
            classes.push(match[1]);
          }
          
          return classes.length > 1;
        })();
        
        // Determine if this is a traditional structure
        const isTraditionalStructure = hasTopLevelPluginSlugFolder || hasTraditionalFolders || hasMultiplePhpFiles || hasMultipleClasses;
        
        console.log(`Detected ${isTraditionalStructure ? 'traditional' : 'simple'} plugin structure`);
        console.log(`Has top-level plugin slug folder: ${hasTopLevelPluginSlugFolder}`);
        console.log(`Has traditional folders: ${hasTraditionalFolders}`);
        console.log(`Has multiple PHP files: ${hasMultiplePhpFiles}`);
        console.log(`Has multiple classes: ${hasMultipleClasses}`);
        
        // If this is a traditional structure but we don't have proper folders,
        // create a traditional structure from the code
        if (isTraditionalStructure && !hasTraditionalFolders && !hasMultiplePhpFiles) {
          console.log("Creating traditional structure from code");
          
          // Extract classes from the code
          const classRegex = /class\s+([a-zA-Z0-9_]+)[\s\S]*?{[\s\S]*?}/g;
          let classMatch;
          
          // Create traditional folders
          const adminFolder = `${pluginSlug}/admin`;
          const includesFolder = `${pluginSlug}/includes`;
          const publicFolder = `${pluginSlug}/public`;
          
          // Extract the main plugin file (with plugin header)
          const mainPluginRegex = /(<\?php[\s\S]*?Plugin Name:[\s\S]*?)(?=class|$)/;
          const mainPluginMatch = code.match(mainPluginRegex);
          
          if (mainPluginMatch) {
            const mainPluginContent = mainPluginMatch[1];
            const mainFilePath = `${pluginSlug}/${pluginSlug}.php`;
            console.log(`Adding main plugin file to ZIP: ${mainFilePath}`);
            zip.file(mainFilePath, mainPluginContent);
          }
          
          // Extract and add class files
          while ((classMatch = classRegex.exec(code)) !== null) {
            const fullMatch = classMatch[0];
            const className = classMatch[1];
            
            // Determine the file path based on class name
            let filePath;
            
            if (className.includes('Admin')) {
              filePath = `${adminFolder}/class-${pluginSlug}-admin.php`;
            } else if (className.includes('Public')) {
              filePath = `${publicFolder}/class-${pluginSlug}-public.php`;
            } else if (className.includes('Activator')) {
              filePath = `${includesFolder}/class-${pluginSlug}-activator.php`;
            } else if (className.includes('Deactivator')) {
              filePath = `${includesFolder}/class-${pluginSlug}-deactivator.php`;
            } else if (className.includes('i18n') || className.includes('I18n')) {
              filePath = `${includesFolder}/class-${pluginSlug}-i18n.php`;
            } else if (className.includes('Loader')) {
              filePath = `${includesFolder}/class-${pluginSlug}-loader.php`;
            } else if (className.includes(pluginSlug.replace(/-/g, '_'))) {
              filePath = `${includesFolder}/class-${pluginSlug}.php`;
            } else {
              filePath = `${includesFolder}/class-${className.toLowerCase()}.php`;
            }
            
            // Add PHP opening tag if not present
            let classContent = fullMatch;
            if (!classContent.trim().startsWith('<?php')) {
              classContent = `<?php\n${classContent}`;
            }
            
            console.log(`Adding class file to ZIP: ${filePath} (${className})`);
            zip.file(filePath, classContent);
          }
          
          // Add index.php files to each folder for security
          const indexPhpContent = "<?php\n// Silence is golden.";
          zip.file(`${pluginSlug}/index.php`, indexPhpContent);
          zip.file(`${adminFolder}/index.php`, indexPhpContent);
          zip.file(`${includesFolder}/index.php`, indexPhpContent);
          zip.file(`${publicFolder}/index.php`, indexPhpContent);
          
          // Add readme.txt
          const readmeContent = `=== ${pluginName} ===\nContributors: (your name)\nTags: tag1, tag2\nRequires at least: 4.7\nTested up to: 5.9\nStable tag: 1.0.0\nLicense: GPLv2 or later\nLicense URI: http://www.gnu.org/licenses/gpl-2.0.html\n\nA brief description of the plugin.`;
          zip.file(`${pluginSlug}/readme.txt`, readmeContent);
          
        } else {
          // Function to add files to the ZIP with proper paths
          const addFilesToZip = (items: FileStructure[], currentPath: string = '') => {
            for (const item of items) {
              // Determine the path for this item
              let itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
              
              // For traditional structures with no top-level plugin slug folder, add it
              if (isTraditionalStructure && !hasTopLevelPluginSlugFolder && currentPath === '') {
                itemPath = `${pluginSlug}/${item.name}`;
              } 
              // For simple structures, always add the plugin slug prefix
              else if (!isTraditionalStructure && !itemPath.startsWith(`${pluginSlug}/`)) {
                itemPath = `${pluginSlug}/${itemPath}`;
              }
              
              // Handle files
              if (item.type === 'file' && item.content) {
                console.log(`Adding file to ZIP: ${itemPath}`);
                zip.file(itemPath, item.content);
              } 
              // Handle folders recursively
              else if (item.type === 'folder' && item.children) {
                addFilesToZip(item.children, itemPath);
              }
            }
          };
          
          // Special handling for traditional structures with a top-level plugin slug folder
          if (isTraditionalStructure && hasTopLevelPluginSlugFolder) {
            // Find the plugin slug folder
            const pluginSlugFolder = tempFileStructure.find(item => 
              item.type === 'folder' && item.name === pluginSlug
            );
            
            if (pluginSlugFolder && pluginSlugFolder.type === 'folder' && pluginSlugFolder.children) {
              // Add the contents of the plugin slug folder directly
              for (const item of pluginSlugFolder.children) {
                let itemPath = `${pluginSlug}/${item.name}`;
                
                if (item.type === 'file' && item.content) {
                  console.log(`Adding file to ZIP: ${itemPath}`);
                  zip.file(itemPath, item.content);
                } else if (item.type === 'folder' && item.children) {
                  addFilesToZip(item.children, itemPath);
                }
              }
              
              // Add any other top-level files/folders
              for (const item of tempFileStructure) {
                if (item.name !== pluginSlug) {
                  let itemPath = `${pluginSlug}/${item.name}`;
                  
                  if (item.type === 'file' && item.content) {
                    console.log(`Adding file to ZIP: ${itemPath}`);
                    zip.file(itemPath, item.content);
                  } else if (item.type === 'folder' && item.children) {
                    addFilesToZip(item.children, itemPath);
                  }
                }
              }
            } else {
              // Fallback if something went wrong
              addFilesToZip(tempFileStructure);
            }
          } else {
            // For all other cases, use the standard function
            addFilesToZip(tempFileStructure);
          }
        }
      } else {
        // If no file structure, just add the main plugin file
        const mainFileName = `${pluginSlug}.php`;
        const fullPath = `${pluginSlug}/${mainFileName}`;
        console.log(`Adding main plugin file to ZIP: ${fullPath}`);
        zip.file(fullPath, code);
      }
      
      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Convert to base64
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Remove the data URL prefix (data:application/zip;base64,)
          const base64content = base64data.split(',')[1];
          resolve(base64content);
        };
        reader.readAsDataURL(zipBlob);
      });
    } catch (error) {
      console.error("Error generating plugin ZIP:", error);
      return null;
    }
  };

  // Add a function to scan for plugin errors
  const scanPluginErrors = async () => {
    if (!wordpressConnection) {
      // Open the WordPress connection modal
      const connectButton = document.querySelector('.wordpress-connector-button') as HTMLButtonElement
      if (connectButton) {
        connectButton.click()
      }
      return
    }
    
    setIsCheckingPluginErrors(true)
    setPluginErrorsContent(null)
    setFilteredPluginErrors(null)
    
    try {
      const response = await fetch("/api/wordpress/check-debug-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          apiKey: wordpressConnection.apiKey,
          siteUrl: wordpressConnection.siteUrl,
          pluginSlug: pluginName ? pluginName.toLowerCase().replace(/\s+/g, '-') : undefined
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to check debug log")
      }
      
      // Store the full debug log
      setPluginErrorsContent(data.debug_log || "No debug log content found.")
      
      // Filter errors related to the current plugin
      if (data.debug_log && pluginName) {
        const pluginSlug = pluginName.toLowerCase().replace(/\s+/g, '-')
        const lines = data.debug_log.split('\n')
        const pluginRelatedErrors = lines.filter((line: string) => 
          line.toLowerCase().includes(pluginSlug) || 
          line.toLowerCase().includes(pluginName.toLowerCase())
        )
        
        if (pluginRelatedErrors.length > 0) {
          setFilteredPluginErrors(pluginRelatedErrors.join('\n'))
        } else {
          setFilteredPluginErrors("No errors related to this plugin were found in the debug log.")
        }
      } else {
        setFilteredPluginErrors("No plugin-specific errors found.")
      }
      
      setIsPluginErrorsModalOpen(true)
    } catch (err) {
      console.error("Error checking plugin errors:", err)
      setPluginErrorsContent(`Error checking plugin errors: ${err instanceof Error ? err.message : "Unknown error"}`)
      setFilteredPluginErrors(null)
      setIsPluginErrorsModalOpen(true)
    } finally {
      setIsCheckingPluginErrors(false)
    }
  }

  // Add a function to send plugin errors to discussion
  const sendPluginErrorsToDiscussion = () => {
    const errorContent = filteredPluginErrors || pluginErrorsContent
    if (!errorContent) return
    
    const message = `I'm having issues with my WordPress plugin "${pluginName}". Here's the debug log content:\n\n\`\`\`\n${errorContent}\n\`\`\`\n\nPlease help me identify and fix the issues in my plugin code.`
    
    handleSendMessage(message)
    setIsPluginErrorsModalOpen(false)
  }

  // Create a download function that can be passed to components
  const directDownloadPlugin = async (): Promise<string | null> => {
    console.log("Download plugin function called directly");
    console.log("Current state:", { 
      generatedCode: !!generatedCode, 
      pluginName, 
      generatedPlugin: !!generatedPlugin,
      pluginZipBase64: !!pluginZipBase64 && pluginZipBase64.length > 100 ? "Valid ZIP" : "Invalid or missing ZIP"
    });
    
    // IMPORTANT: Always generate a fresh ZIP to ensure we have the latest code
    // Don't use the cached ZIP as it might be outdated
    if (!generatedCode && !generatedPlugin) {
      console.error("Cannot download plugin: No plugin has been generated yet");
      alert("Please generate a plugin first before downloading.");
      return null;
    }
    
    if (!pluginName) {
      console.error("Cannot download plugin: Missing plugin name");
      alert("Please enter a plugin name before downloading.");
      return null;
    }

    setLoading(true);
    try {
      console.log("Generating fresh plugin ZIP to ensure latest code is used...");
      const base64content = await generatePluginZipOnly();
      
      if (!base64content) {
        throw new Error("Failed to generate plugin ZIP");
      }
      
      console.log(`Generated plugin ZIP with size: ${base64content.length} characters`);
      
      // Create a Blob from the base64 data
      const byteCharacters = atob(base64content);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, {type: 'application/zip'});
      const url = URL.createObjectURL(blob);
      
      // Create a plugin slug from the plugin name
      const formattedPluginSlug = pluginName.toLowerCase().replace(/\s+/g, '-');
      
      // Create and trigger download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formattedPluginSlug}.zip`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log("Download triggered successfully with newly generated ZIP");
      return base64content;
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to generate plugin ZIP. Please try again.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Set the download function when the component mounts
  useEffect(() => {
    setDownloadPluginFunction(() => async () => {
      await directDownloadPlugin();
    });
  }, [generatedCode, pluginName]);

  // Add a function to download the WordPress Generator Connector plugin
  const downloadConnectorPlugin = async () => {
    console.log("Downloading WordPress Generator Connector plugin");
    
    try {
      // Fetch the connector plugin from the API
      const response = await fetch("/api/download-connector-plugin");
      
      if (!response.ok) {
        throw new Error("Failed to download connector plugin");
      }
      
      const data = await response.json();
      
      if (!data.base64content) {
        throw new Error("Invalid connector plugin data");
      }
      
      console.log("Connector plugin downloaded, initiating browser download");
      
      // Create a Blob from the base64 data
      const byteCharacters = atob(data.base64content);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, {type: 'application/zip'});
      const url = URL.createObjectURL(blob);
      
      // Create and trigger download link
      const a = document.createElement('a');
      a.href = url;
      a.download = "plugin-generator-connector.zip";
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log("Connector plugin download triggered successfully");
    } catch (error) {
      console.error("Error downloading connector plugin:", error);
      alert("Failed to download connector plugin. Please try again.");
    }
  };

  // Create a wrapper function that returns Promise<void> for the DeployToWordPressButton
  const directDownloadPluginWrapper = async (): Promise<string | null> => {
    console.log("Download plugin wrapper called - generating fresh ZIP");
    
    if (!pluginName) {
      console.error("Cannot generate plugin ZIP: Missing plugin name");
      return null;
    }
    
    try {
      // Always generate a fresh ZIP to ensure we have the latest code
      console.log("Generating fresh plugin ZIP from wrapper function...");
      return await generatePluginZipOnly();
    } catch (err) {
      console.error("Error in download plugin wrapper:", err);
      return null;
    }
  };

  // Create a debounced version of setDescription to avoid logging on every keypress
  const setDescriptionDebounced = useCallback((value: string) => {
    // Only log when setting description from specific actions, not from typing
    setDescription(value);
  }, []);

  // New function to generate code with details passed directly
  const generateCodeWithDetails = async (details: PluginDetails) => {
    console.log("generateCodeWithDetails: Starting with details:", details);
    console.log("Current model selected:", selectedModel);
    
    // Set loading states
    setLoading(true);
    setError(null);
    setIsStreaming(false);
    setGeneratedPlugin(true);
    
    // Save to localStorage that we've started generating a plugin
    try {
      localStorage.setItem("generatedPlugin", "true");
      localStorage.setItem("pluginDetails", JSON.stringify(details));
      localStorage.setItem("hasFilledDetails", "true");
      localStorage.setItem("description", details.description || description);
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
    
    // Define system prompt
    const systemPromptForGeneration = `You are an expert WordPress plugin developer. Generate a complete, functional WordPress plugin. The response should be ONLY the plugin code, without any markdown formatting or explanation. The code must:
1. Start with the standard WordPress plugin header comment
2. Begin with <?php on the first line
3. Follow WordPress coding standards
4. Include proper security checks and initialization
5. Be production-ready and fully functional`;
    
    // Construct messages for the request
    const messages = [
      {
        role: "system",
        content: systemPromptForGeneration,
      },
      {
        role: "user",
        content: `Generate a WordPress plugin based on this description: ${details.description || description}. The plugin name is: ${details.name}. ${details.version ? `The plugin version is: ${details.version}.` : ''} ${details.author ? `The plugin author is: ${details.author}.` : ''} ${details.uri ? `The plugin URI is: ${details.uri}.` : ''}`,
      },
    ];
    
    console.log("generateCodeWithDetails: Constructed messages:", messages);
    
    try {
      // Instead of calling generateCode, we'll handle the API calls directly here
      console.log("generateCodeWithDetails: Processing API request directly");
      
      let generatedCode = "";
      let tempCode = "";
      
      if (selectedModel === "openai") {
        // OpenAI implementation
        console.log("Using OpenAI model for generation");
        // Implementation would go here
      } else if (selectedModel === "anthropic") {
        setIsStreaming(true);
        
        try {
          // Add a timeout to the fetch request
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          console.log("Calling Anthropic API with messages:", messages);
          
          const response = await fetch("/api/anthropic", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages,
            }),
            signal: controller.signal
          });
          
          // Clear the timeout
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Anthropic API error: ${errorData || response.statusText}`);
          }
          
          // Handle streaming response
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response stream available");
          
          const decoder = new TextDecoder();
          tempCode = "";
          
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
                      tempCode += data.text;
                      setGeneratedCode(tempCode);
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
          
          generatedCode = tempCode;
          setIsStreaming(false);
        } catch (error: any) {
          console.error("Error with Anthropic API:", error);
          throw error; // Re-throw to be caught by the outer try/catch
        }
      }
      
      if (!generatedCode) {
        throw new Error("Failed to generate code");
      }
      
      // Clean up the generated code
      generatedCode = generatedCode
        .replace(/^```(?:php)?\s*|\s*```$/g, "")
        .replace(/^[\s\S]*?<\?php/, "<?php")
        .replace(/\n<\?php/g, "")
        .trim();
      
      if (!generatedCode.startsWith("<?php")) {
        generatedCode = "<?php\n" + generatedCode;
      }
      
      console.log("Generated code:", generatedCode.substring(0, 200) + "..."); // Log the first 200 chars for debugging
      
      // Process the generated code
      setGeneratedCode(generatedCode);
      createFileStructure(generatedCode);
      
      // Add to version history
      addCodeVersion(generatedCode, "Initial plugin generation", "1.0.0");
      
      console.log("Setting generatedPlugin to true after successful code generation");
      setGeneratedPlugin(true);
      setLoading(false);
      
    } catch (error: any) {
      console.error("generateCodeWithDetails: Error generating code:", error);
      setError(error.message || "Failed to generate plugin code");
      setLoading(false);
      setIsStreaming(false);
    }
  };

  // Load saved state from localStorage on page load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Load generatedPlugin state
        const savedGeneratedPlugin = localStorage.getItem("generatedPlugin");
        if (savedGeneratedPlugin === "true") {
          setGeneratedPlugin(true);
        }
        
        // Load plugin details if available
        const savedPluginDetails = localStorage.getItem("pluginDetails");
        if (savedPluginDetails) {
          try {
            const details = JSON.parse(savedPluginDetails);
            setPluginDetails(details);
            setPluginName(details.name || "my-plugin");
            
            // Also set hasFilledDetails if we have plugin details
            setHasFilledDetails(true);
            console.log("Loaded plugin details from localStorage:", details);
          } catch (e) {
            console.error("Error parsing plugin details from localStorage:", e);
          }
        }
        
        // Load hasFilledDetails state
        const savedHasFilledDetails = localStorage.getItem("hasFilledDetails");
        if (savedHasFilledDetails === "true") {
          setHasFilledDetails(true);
        }
        
        // Load description if available
        const savedDescription = localStorage.getItem("description");
        if (savedDescription) {
          setDescription(savedDescription);
        }
        
        // Load lastDeployedPluginSlug if available
        const savedPluginSlug = localStorage.getItem("lastDeployedPluginSlug");
        if (savedPluginSlug) {
          setLastDeployedPluginSlug(savedPluginSlug);
        }
      } catch (e) {
        console.error("Error loading state from localStorage:", e);
      }
    }
  }, []);

  // Save description to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && description) {
      try {
        localStorage.setItem("description", description);
      } catch (e) {
        console.error("Error saving description to localStorage:", e);
      }
    }
  }, [description]);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex items-center justify-between p-4 flex-shrink-0">
        <h1 className="text-2xl font-bold">WordPress Plugin Generator</h1>
        
        {/* WordPress Connection Restored Notification */}
        {connectionRestored && (
          <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 shadow-md">
            <div className="flex items-center">
              <div className="py-1">
                <svg className="fill-current h-6 w-6 text-green-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold">WordPress Connection Restored</p>
                <p className="text-sm">Connected to {restoredSiteName}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-2">
          <style jsx global>{`
            .wordpress-connector-button {
              height: 2.1rem !important;
            }
          `}</style>
          <WordPressConnector 
            onConnect={handleWordPressConnect}
            currentConnection={wordpressConnection}
            onDownloadClick={directDownloadPluginWrapper}
            onDownloadConnectorPlugin={downloadConnectorPlugin}
          />
          
          {/* Replace existing buttons with AppMenu */}
          <AppMenu 
            // Project menu props
            onNewSession={handleNewSession}
            onEditDetails={() => setShowPluginDetailsModal(true)}
            onLoadSession={() => document.getElementById('load-plugin-input')?.click()}
            onSaveSession={handleSavePlugin}
            hasFilledDetails={hasFilledDetails}
            generatedPlugin={generatedPlugin}
            loading={loading}
            
            // Version control menu props
            codeVersions={codeVersions}
            currentVersionIndex={currentVersionIndex}
            onVersionChange={(index) => {
              setCurrentVersionIndex(index);
              setGeneratedCode(codeVersions[index].code);
              createFileStructure(codeVersions[index].code);
            }}
            onViewChanges={handleViewVersionChanges}
            
            // Deploy menu props
            onDownloadPlugin={directDownloadPlugin}
            onDeployToWordPress={() => {
              // Open the WordPress deployment modal
              const deployButton = document.querySelector('.deploy-to-wordpress-button') as HTMLButtonElement;
              if (deployButton) {
                deployButton.click();
              }
            }}
            onViewCodeSnippet={() => setIsCodeSnippetModalOpen(true)}
            pluginName={pluginName}
            wordpressConnection={wordpressConnection}
            onOpenConnectModal={() => {
              // Open the WordPress connection modal
              const connectButton = document.querySelector('.wordpress-connector-button') as HTMLButtonElement;
              if (connectButton) {
                connectButton.click();
              }
            }}
            
            // Tools menu props
            onScanPluginErrors={scanPluginErrors}
            isCheckingPluginErrors={isCheckingPluginErrors}
            onEmergencyAccess={(operation) => {
              // Open the emergency access modal with the specified operation
              const emergencyButton = document.querySelector('.emergency-access-button') as HTMLButtonElement;
              if (emergencyButton) {
                // Store the operation in a data attribute that can be read by the component
                if (operation) {
                  document.body.setAttribute('data-emergency-operation', operation);
                }
                emergencyButton.click();
              }
            }}
            enableDebugging={wordpressConnection?.enableDebugging}
          />
          
          {/* Hidden file input for loading saved sessions */}
          <input
            type="file"
            accept=".json"
            onChange={handleLoadPlugin}
            className="hidden"
            id="load-plugin-input"
          />
        </div>
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

              {/* Removed START/GENERATE Button - We no longer show this button */}

              <input
                type="file"
                accept=".json"
                onChange={handleLoadPlugin}
                className="hidden"
                id="load-plugin-input"
              />
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
              onInitialDescriptionChange={setDescriptionDebounced}
              onFilesSelected={(files: ProcessedFile[]) => setAttachedFiles(files)}
            />
          </div>
        </div>

        {/* Center Column - File Explorer (15%) */}
        <div className="w-[15%] border-r flex flex-col min-h-0 bg-gray-50">
          <div className="p-2 border-b flex-shrink-0">
            <h2 className="text-sm font-semibold">Files</h2>
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

        {/* Right Column - Code Editor (45%) */}
        <div className="w-[45%] flex flex-col min-h-0">
          {/* Remove the header section with buttons */}
          <div className="flex-1 min-h-0">
            <CodeEditor
              selectedFile={selectedFile}
              fileStructure={fileStructure}
              onCodeChange={(newCode) => {
                if (selectedFile) {
                const updatedStructure = updateFileStructure(fileStructure, selectedFile, newCode)
                setFileStructure(updatedStructure)
                }
              }}
              loading={loading}
              streaming={isStreaming}
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
        onClose={() => {
          console.log("VersionUpdateModal onClose called, setting showVersionUpdateModal to false");
          setShowVersionUpdateModal(false);
        }}
        onSubmit={(newVersion, updateDetails, updatedDetails) => {
          console.log("VersionUpdateModal onSubmit called with newVersion:", newVersion);
          handleVersionUpdateSubmit(newVersion, updateDetails, updatedDetails);
        }}
        currentVersion={codeVersions[currentVersionIndex]?.version?.replace(/^v/, '') || "1.0.0"}
        pluginDetails={pluginDetails}
      />

      <PluginDetailsModal
        isOpen={showPluginDetailsModal}
        onClose={() => {
          // Just close the modal without clearing the description
          setShowPluginDetailsModal(false);
        }}
        onSubmit={(details) => {
          console.log("PluginDetailsModal onSubmit: received details with description:", details.description);
          console.log("Current description state:", description);
          
          // Set plugin details and hasFilledDetails
          setPluginDetails(details);
          setPluginName(details.name);
          setHasFilledDetails(true);
          
          // Make sure the description is preserved
          if (details.description && details.description.trim() !== '') {
            console.log("PluginDetailsModal onSubmit: updating description to:", details.description);
            setDescription(details.description);
          } else {
            console.log("PluginDetailsModal onSubmit: description is empty, using current description:", description);
          }
          
          // Set loading and other states immediately
          setLoading(true);
          setError(null);
          setIsStreaming(false);
          setGeneratedPlugin(true);
          
          // Save to localStorage that we've started generating a plugin
          try {
            localStorage.setItem("generatedPlugin", "true");
            // Also save plugin details to localStorage for recovery
            localStorage.setItem("pluginDetails", JSON.stringify(details));
            localStorage.setItem("hasFilledDetails", "true");
            localStorage.setItem("description", details.description || description);
          } catch (e) {
            console.error("Error saving to localStorage:", e);
          }
          
          // Close the modal first
          setShowPluginDetailsModal(false);
          
          // Immediately start generating the code with the details we just received
          console.log("PluginDetailsModal onSubmit: immediately calling generateCodeWithDetails with details:", details);
          generateCodeWithDetails(details);
        }}
        // Pass the current description to the modal
        initialDescription={description}
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
        <DialogContent className="bg-white max-h-[90vh] overflow-y-auto">
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

      {/* Add the Plugin Errors Modal */}
      <Dialog open={isPluginErrorsModalOpen} onOpenChange={setIsPluginErrorsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle>WordPress Plugin Errors</DialogTitle>
            <DialogDescription>
              Debug log information for your WordPress plugin
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="filtered" className="flex-1 overflow-hidden flex flex-col">
            <TabsList>
              <TabsTrigger value="filtered">Plugin-Related Errors</TabsTrigger>
              <TabsTrigger value="full">Full Debug Log</TabsTrigger>
            </TabsList>
            
            <TabsContent value="filtered" className="flex-1 overflow-auto p-4 bg-gray-50 rounded-md my-4">
              {filteredPluginErrors ? (
                <pre className="text-xs font-mono whitespace-pre-wrap">{filteredPluginErrors}</pre>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No plugin-specific errors found</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="full" className="flex-1 overflow-auto p-4 bg-gray-50 rounded-md my-4">
              {pluginErrorsContent ? (
                <pre className="text-xs font-mono whitespace-pre-wrap">{pluginErrorsContent}</pre>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No debug log content available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsPluginErrorsModalOpen(false)}>
              Close
            </Button>
            
            {(filteredPluginErrors || pluginErrorsContent) && (
              <Button 
                onClick={sendPluginErrorsToDiscussion}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send to Discussion
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVersionModalOpen} onOpenChange={setIsVersionModalOpen}>
        <DialogContent className="bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plugin Version</DialogTitle>
            <DialogDescription>
              Update the version number of your plugin.
            </DialogDescription>
          </DialogHeader>
          {/* Add your version update form here */}
        </DialogContent>
      </Dialog>

      <Dialog open={isDebugModalOpen} onOpenChange={setIsDebugModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle>Debug Information</DialogTitle>
            <DialogDescription>
              Debug information for troubleshooting.
            </DialogDescription>
          </DialogHeader>
          {/* Add your debug information form here */}
        </DialogContent>
      </Dialog>

      <Dialog open={isLoadModalOpen} onOpenChange={setIsLoadModalOpen}>
        <DialogContent className="bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Load Plugin</DialogTitle>
            <DialogDescription>
              Load a previously saved plugin.
            </DialogDescription>
          </DialogHeader>
          {/* Add your load plugin form here */}
        </DialogContent>
      </Dialog>

      <Dialog open={isDebugOpen} onOpenChange={setIsDebugOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
          <DialogHeader>
            <DialogTitle>Debug Information</DialogTitle>
            <DialogDescription>
              Debug information for troubleshooting.
            </DialogDescription>
          </DialogHeader>
          {/* Add your debug information form here */}
        </DialogContent>
      </Dialog>

      {/* Hidden DeployToWordPressButton component for the AppMenu to click on */}
      <div className="hidden">
        <DeployToWordPressButton
          pluginZip={pluginZipBase64 || ''}
          pluginName={pluginName}
          pluginSlug={lastDeployedPluginSlug || pluginName.toLowerCase().replace(/\s+/g, '-')}
          connection={wordpressConnection}
          onOpenConnectModal={() => {
            // Open the WordPress connection modal
            const connectButton = document.querySelector('.wordpress-connector-button') as HTMLButtonElement;
            if (connectButton) {
              connectButton.click();
            }
          }}
          disabled={!generatedCode}
          generatedCode={!!generatedCode}
          onDownloadClick={directDownloadPluginWrapper}
          onGeneratePluginZip={generatePluginZipOnly}
          onSendToDiscussion={(message) => handleSendMessage(message)}
          onDeploymentSuccess={(deployedPluginSlug) => {
            console.log(`Plugin deployed successfully with slug: ${deployedPluginSlug}`);
            setLastDeployedPluginSlug(deployedPluginSlug);
            // Save to localStorage immediately
            localStorage.setItem("lastDeployedPluginSlug", deployedPluginSlug);
            console.log(`Saved deployed plugin slug to localStorage: ${deployedPluginSlug}`);
          }}
        />
      </div>
    </div>
  )
}

