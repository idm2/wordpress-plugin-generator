"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  FolderOpen, 
  Save, 
  RefreshCw, 
  Settings2, 
  GitBranch, 
  Eye, 
  Download, 
  Upload, 
  Code, 
  FileCode, 
  Wrench,
  Trash2,
  MessageSquare,
  FileText,
  CheckCircle2,
  HelpCircle,
  Pencil,
  Play,
  Server,
  Link,
  AlertTriangle,
  ArrowRight,
  Layers
} from "lucide-react"

interface HowToModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HowToModal({ open, onOpenChange }: HowToModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-blue-500" />
            WordPress Plugin Generator - User Guide
          </DialogTitle>
          <DialogDescription>
            A comprehensive guide to all features and functionality of the WordPress Plugin Generator
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-8 pb-8">
            {/* Getting Started Section */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <Play className="h-5 w-5" />
                Getting Started
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <MessageSquare className="h-4 w-4" />
                    Creating Your First Plugin
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To create a new WordPress plugin, simply describe what you want your plugin to do in the text area at the bottom of the screen. Be as specific as possible about the functionality you need. After entering your description, press Enter or click the send button.
                  </p>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Example:</strong> "Create a WordPress plugin that adds a custom block to display recent posts with featured images and excerpt. Include options to filter by category and set the number of posts to display."
                      </span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Settings2 className="h-4 w-4" />
                    Plugin Details
                  </h3>
                  <p className="mt-2 text-gray-700">
                    After entering your description, you'll be prompted to fill in plugin details such as:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                    <li><strong>Plugin Name:</strong> The name of your plugin as it will appear in the WordPress admin</li>
                    <li><strong>Plugin URI:</strong> Website URL related to your plugin (optional)</li>
                    <li><strong>Description:</strong> A short description of what your plugin does</li>
                    <li><strong>Version:</strong> The version number (defaults to 1.0.0)</li>
                    <li><strong>Author:</strong> Your name or organization</li>
                    <li><strong>Author URI:</strong> Your website URL (optional)</li>
                  </ul>
                  <p className="mt-2 text-gray-700">
                    Click "Continue" after filling in the details to start generating your plugin.
                  </p>
                </div>
              </div>
            </section>
            
            {/* Working with Generated Code Section */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <FileText className="h-5 w-5" />
                Working with Generated Code
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Layers className="h-4 w-4" />
                    File Structure
                  </h3>
                  <p className="mt-2 text-gray-700">
                    Once your plugin is generated, you'll see the file structure in the left sidebar. Click on any file to view and edit its contents in the main editor. The main plugin file (with your plugin's name) contains the core functionality and plugin header.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Pencil className="h-4 w-4" />
                    Editing Code
                  </h3>
                  <p className="mt-2 text-gray-700">
                    You can directly edit any file in the editor. The code is syntax-highlighted for better readability. Changes are automatically saved to your session but not to your WordPress site until you deploy them.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <MessageSquare className="h-4 w-4" />
                    Requesting Changes
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To modify your plugin, simply type your request in the chat input at the bottom of the screen. Be specific about what changes you want to make. For example:
                  </p>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600">
                      <strong>Example requests:</strong>
                    </p>
                    <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                      <li>"Add a settings page to control the background color of the block"</li>
                      <li>"Create a shortcode version of this block"</li>
                      <li>"Add pagination to the post display"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Project Management Section */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <FolderOpen className="h-5 w-5" />
                Project Management
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <RefreshCw className="h-4 w-4" />
                    New Session
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To start a new plugin project, click on "Project" in the top menu, then select "New Session". This will clear all current data and allow you to start fresh.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Settings2 className="h-4 w-4" />
                    Edit Session
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To modify your plugin details (name, description, version, etc.), click on "Project" in the top menu, then select "Edit Session".
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Save className="h-4 w-4" />
                    Saving Your Project
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To save your current project for later use:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Click on "Project" in the top menu</li>
                    <li>Select "Save Session" from the dropdown</li>
                    <li>A JSON file will be downloaded to your computer</li>
                    <li>This file contains all your project data, including code, conversation history, and WordPress connection details</li>
                    <li>Store this file in a safe location for future use</li>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Tip:</strong> Save your project regularly, especially after making significant changes or before trying experimental modifications.
                      </span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <FolderOpen className="h-4 w-4" />
                    Loading a Saved Project
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To load a previously saved project:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Click on "Project" in the top menu</li>
                    <li>Select "Load Saved Session" from the dropdown</li>
                    <li>A file picker will open - select the JSON file you previously saved</li>
                    <li>The system will restore your project exactly as it was when saved, including:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li>All plugin code and file structure</li>
                      <li>Plugin details (name, description, version, etc.)</li>
                      <li>Conversation history with the AI</li>
                      <li>WordPress connection details (if previously saved)</li>
                      <li>Version history of your plugin</li>
                    </ul>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Note:</strong> Loading a saved session will replace your current work. Make sure to save any current work before loading a different project.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Version Control Section */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <GitBranch className="h-5 w-5" />
                Version Control
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <GitBranch className="h-4 w-4" />
                    Version History
                  </h3>
                  <p className="mt-2 text-gray-700">
                    The system automatically creates a new version each time you make significant changes to your plugin. To access version history, click on "Version Control" in the top menu, then select a version from the dropdown.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Eye className="h-4 w-4" />
                    View Changes
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To see what changed between versions, click on "Version Control" in the top menu, then select "Code Changes". This will show you a diff view highlighting what was added, modified, or removed.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <ArrowRight className="h-4 w-4" />
                    Reverting to Previous Versions
                  </h3>
                  <p className="mt-2 text-gray-700">
                    You can revert to a previous version by selecting it from the dropdown in the Version Control menu. Alternatively, you can type commands in the chat like "go back 1 version" or "revert to v1.0.2".
                  </p>
                </div>
              </div>
            </section>
            
            {/* Deployment Section */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <Upload className="h-5 w-5" />
                Deployment
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Download className="h-4 w-4" />
                    Download Plugin
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To download your plugin as a ZIP file that can be installed in WordPress, click on "Deploy" in the top menu, then select "Download Plugin". The ZIP file will contain all the necessary files for your plugin.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Upload className="h-4 w-4" />
                    Deploy to WordPress
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To deploy your plugin directly to your WordPress site, click on "Deploy" in the top menu, then select "Deploy to WordPress". You'll need to have connected to WordPress first (see WordPress Connection section).
                  </p>
                  <p className="mt-2 text-gray-700">
                    The deployment process will:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Generate a fresh ZIP file with your latest code</li>
                    <li>Upload it to your WordPress site</li>
                    <li>Install and activate the plugin</li>
                    <li>If updating an existing plugin, it will automatically handle the update process</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Code className="h-4 w-4" />
                    Code Snippet
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To view a code snippet that can be added to your theme's functions.php file (for simple functionality), click on "Deploy" in the top menu, then select "Code Snippet". This provides an alternative to installing a full plugin.
                  </p>
                </div>
              </div>
            </section>
            
            {/* WordPress Connection Section */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <Link className="h-5 w-5" />
                WordPress Connection
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Server className="h-4 w-4" />
                    Connecting to WordPress
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To connect to your WordPress site, click on "Connect to WordPress" in the top right corner. You'll need to provide:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                    <li><strong>WordPress Site URL:</strong> The URL of your WordPress site</li>
                    <li><strong>API Key:</strong> Generated by the WordPress Plugin Generator Connector plugin</li>
                    <li><strong>FTP/SFTP Details:</strong> For advanced operations like deploying plugins and reading debug logs</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <CheckCircle2 className="h-4 w-4" />
                    Installing the Connector Plugin
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To enable direct deployment and other WordPress operations, you need to install the WordPress Plugin Generator Connector plugin on your site:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Download the connector plugin from the WordPress connection modal</li>
                    <li>Install it on your WordPress site via the Plugins {'>'}  Add New {'>'}  Upload Plugin page</li>
                    <li>Activate the plugin and copy the API key from its settings page</li>
                    <li>Paste the API key into the WordPress connection modal</li>
                  </ol>
                </div>
              </div>
            </section>
            
            {/* WordPress Tools Section */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <Wrench className="h-5 w-5" />
                WordPress Tools
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Wrench className="h-4 w-4" />
                    Accessing WordPress Tools
                  </h3>
                  <p className="mt-2 text-gray-700">
                    WordPress Tools (WP Tools) provide advanced functionality for managing your plugin on your WordPress site. To access these tools:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>First, ensure you've connected to your WordPress site with FTP/SFTP details</li>
                    <li>Click on "WP Tools" in the top menu</li>
                    <li>If you haven't provided FTP/SFTP details, you'll be prompted to do so</li>
                    <li>Once connected, you'll see options for various WordPress operations</li>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Important:</strong> WordPress Tools require FTP/SFTP access to your server. These operations interact directly with your WordPress installation, so use them carefully.
                      </span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <FileCode className="h-4 w-4" />
                    Reading Debug Logs
                  </h3>
                  <p className="mt-2 text-gray-700">
                    The debug log reader allows you to view WordPress error logs directly from the app:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Click on "WP Tools" in the top menu</li>
                    <li>Select "Read Debug Log" from the dropdown</li>
                    <li>The system will connect to your server and retrieve the debug log</li>
                    <li>You'll see two tabs in the results:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li><strong>Plugin Errors:</strong> Shows only errors related to your plugin</li>
                      <li><strong>Full Log:</strong> Shows the complete WordPress debug log</li>
                    </ul>
                    <li>Use the search function to find specific errors</li>
                    <li>The log is automatically filtered to show recent entries first</li>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Tip:</strong> Debug logs are invaluable for troubleshooting plugin issues. If your plugin isn't working as expected, check the logs for PHP errors or warnings.
                      </span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Trash2 className="h-4 w-4 text-red-500" />
                    Deleting a Plugin
                  </h3>
                  <p className="mt-2 text-gray-700">
                    If you need to completely remove your plugin from your WordPress site:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Click on "WP Tools" in the top menu</li>
                    <li>Select "Delete WP Plugin" from the dropdown (shown in red as a warning)</li>
                    <li>A confirmation dialog will appear asking you to confirm the deletion</li>
                    <li>If you confirm, the system will:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li>Connect to your WordPress server via FTP/SFTP</li>
                      <li>Navigate to the plugins directory</li>
                      <li>Completely remove your plugin's directory and all its files</li>
                    </ul>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Warning:</strong> This operation permanently deletes your plugin from the server. It cannot be undone. Make sure you have a backup or have saved your session if you might need the plugin again.
                      </span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <AlertTriangle className="h-4 w-4" />
                    Troubleshooting WP Tools
                  </h3>
                  <p className="mt-2 text-gray-700">
                    If you encounter issues with WordPress Tools:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                    <li><strong>Connection errors:</strong> Verify your FTP/SFTP details (host, username, password, port)</li>
                    <li><strong>Access denied:</strong> Ensure your FTP/SFTP user has sufficient permissions</li>
                    <li><strong>Debug log not found:</strong> Confirm that WordPress debugging is enabled on your site</li>
                    <li><strong>Plugin not found:</strong> Verify that the plugin is installed and the slug is correct</li>
                    <li><strong>Timeout errors:</strong> Try again later or check your server's connection</li>
                  </ul>
                  <p className="mt-2 text-gray-700">
                    If problems persist, you can update your WordPress connection details by clicking "Connect to WordPress" in the top right corner.
                  </p>
                </div>
              </div>
            </section>
            
            {/* Tips and Best Practices Section */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <HelpCircle className="h-5 w-5" />
                Tips and Best Practices
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <MessageSquare className="h-4 w-4" />
                    Writing Effective Prompts
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To get the best results when generating or modifying plugins:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                    <li>Be specific about functionality you need</li>
                    <li>Mention WordPress hooks, actions, or filters if you know them</li>
                    <li>Specify any dependencies or compatibility requirements</li>
                    <li>For complex features, break them down into smaller requests</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <AlertTriangle className="h-4 w-4" />
                    Troubleshooting
                  </h3>
                  <p className="mt-2 text-gray-700">
                    If you encounter issues:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                    <li><strong>Plugin not deploying:</strong> Check your WordPress connection details and FTP/SFTP access</li>
                    <li><strong>Plugin not working as expected:</strong> Use the "Read Debug Log" tool to check for PHP errors</li>
                    <li><strong>Generation getting stuck:</strong> Try refreshing the page and loading your saved session</li>
                    <li><strong>API errors:</strong> The system will automatically try alternative AI models if the primary one fails</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <CheckCircle2 className="h-4 w-4" />
                    Testing Your Plugin
                  </h3>
                  <p className="mt-2 text-gray-700">
                    Always test your plugin thoroughly in a development environment before using it in production:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                    <li>Test with different WordPress versions</li>
                    <li>Check compatibility with popular themes and plugins</li>
                    <li>Verify all features work as expected</li>
                    <li>Test performance with different amounts of content</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 