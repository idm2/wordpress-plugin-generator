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

export function HowToModalV2({ open, onOpenChange }: HowToModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-blue-500" />
            WordPress Plugin Generator - User Guide (V2 - Updated)
          </DialogTitle>
          <DialogDescription>
            A comprehensive guide to all features and functionality of the WordPress Plugin Generator
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 h-[calc(90vh-120px)] overflow-auto pr-4">
          <div className="space-y-8 pb-8">
            {/* Table of Contents */}
            <section>
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <FileText className="h-5 w-5" />
                Quick Navigation
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ul className="list-disc list-inside space-y-2 text-blue-500">
                    <li><a href="#getting-started" className="hover:underline">Getting Started</a></li>
                    <li><a href="#working-with-code" className="hover:underline">Working with Generated Code</a></li>
                    <li><a href="#project-management" className="hover:underline">Project Management</a>
                      <ul className="list-circle list-inside ml-5 space-y-1 text-blue-400 text-sm">
                        <li><a href="#save-project" className="hover:underline">Saving Your Project</a></li>
                        <li><a href="#load-project" className="hover:underline">Loading a Project</a></li>
                      </ul>
                    </li>
                    <li><a href="#version-control" className="hover:underline">Version Control</a></li>
                  </ul>
                </div>
                <div>
                  <ul className="list-disc list-inside space-y-2 text-blue-500">
                    <li><a href="#changing-llms" className="hover:underline">Changing LLMs</a></li>
                    <li><a href="#editing-details" className="hover:underline">Editing Plugin Details</a></li>
                    <li><a href="#deployment" className="hover:underline">Deployment Options</a>
                      <ul className="list-circle list-inside ml-5 space-y-1 text-blue-400 text-sm">
                        <li><a href="#download-plugin" className="hover:underline">Download Plugin</a></li>
                        <li><a href="#deploy-wordpress" className="hover:underline">Deploy to WordPress</a></li>
                        <li><a href="#code-snippet" className="hover:underline">Code Snippet</a></li>
                      </ul>
                    </li>
                    <li><a href="#wp-tools" className="hover:underline">WordPress Tools</a>
                      <ul className="list-circle list-inside ml-5 space-y-1 text-blue-400 text-sm">
                        <li><a href="#debug-log" className="hover:underline">Reading Debug Logs</a></li>
                        <li><a href="#delete-plugin" className="hover:underline">Deleting a Plugin</a></li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Getting Started Section */}
            <section id="getting-started">
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
                        <strong>Example Request:</strong> "Create a WordPress plugin that adds a custom block to display recent posts with featured images and excerpt. Include options to filter by category and set the number of posts to display."
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
            <section id="working-with-code">
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
            <section id="project-management">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <FolderOpen className="h-5 w-5" />
                Project Management
              </h2>
              
              <div className="space-y-4">
                <div id="save-project">
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
                    <li>A JSON file will be downloaded to your computer with a name based on your plugin name and current date/time</li>
                    <li>This file contains all your project data, including:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li>All plugin code and file structure</li>
                      <li>Plugin details (name, description, version, etc.)</li>
                      <li>Complete conversation history with the AI</li>
                      <li>WordPress connection details (if you've connected)</li>
                      <li>All version history of your plugin</li>
                    </ul>
                    <li>Store this file in a safe location for future use</li>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Tip:</strong> Save your project regularly, especially after making significant changes or before trying experimental modifications. Consider keeping multiple saved versions with different filenames to track major milestones in your development process.
                      </span>
                    </p>
                  </div>
                </div>
                
                <div id="load-project">
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
                    <li>The system will restore your project exactly as it was when saved</li>
                    <li>After loading, you can continue working where you left off, including:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li>Viewing and editing all plugin files</li>
                      <li>Continuing the conversation with the AI</li>
                      <li>Deploying to WordPress (if connection details were saved)</li>
                      <li>Accessing all previous versions of your plugin</li>
                    </ul>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Note:</strong> Loading a saved session will replace your current work. Make sure to save any current work before loading a different project. If you frequently work on multiple plugins, consider using different browsers or browser profiles to maintain separate sessions.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </section>
            
            {/* WordPress Tools Section */}
            <section id="wp-tools">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <Wrench className="h-5 w-5" />
                WordPress Tools
              </h2>
              
              <div className="space-y-4">
                <div id="debug-log">
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
                    <li>In the debug log viewer, you'll have several options:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li><strong>Plugin Errors Tab:</strong> Shows only errors related to your plugin</li>
                      <li><strong>Full Log Tab:</strong> Shows the complete WordPress debug log</li>
                      <li><strong>Filter by Time:</strong> Limit results to errors after a specific date/time</li>
                      <li><strong>Limit Lines:</strong> Control how many lines of the log to display</li>
                      <li><strong>Search:</strong> Find specific text within the log</li>
                    </ul>
                    <li>The log is automatically formatted for readability with timestamps and error levels highlighted</li>
                    <li>You can copy portions of the log or save the entire log to a file for further analysis</li>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Tip:</strong> For WordPress to generate debug logs, you need to enable debugging in your wp-config.php file. Add these lines to enable comprehensive logging:
                        <br /><code className="block mt-1 bg-gray-200 p-1 rounded">
                          define('WP_DEBUG', true);<br />
                          define('WP_DEBUG_LOG', true);<br />
                          define('WP_DEBUG_DISPLAY', false);
                        </code>
                      </span>
                    </p>
                  </div>
                </div>
                
                <div id="delete-plugin">
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
                    <li>In the deletion dialog, you'll need to:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li>Confirm the plugin slug (folder name) to be deleted</li>
                      <li>Check that the FTP/SFTP connection details are correct</li>
                      <li>Acknowledge that this action cannot be undone</li>
                    </ul>
                    <li>Click "Delete Plugin" to proceed with deletion</li>
                    <li>The system will:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li>Connect to your WordPress server via FTP/SFTP</li>
                      <li>Navigate to the wp-content/plugins directory</li>
                      <li>Verify the plugin directory exists</li>
                      <li>Recursively delete all files and folders within the plugin directory</li>
                      <li>Remove the plugin directory itself</li>
                      <li>Display a confirmation message when complete</li>
                    </ul>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Warning:</strong> This operation permanently deletes your plugin from the server. It cannot be undone. The plugin is deleted directly at the file system level, bypassing WordPress's plugin management. Make sure you have a backup or have saved your session if you might need the plugin again.
                      </span>
                    </p>
                  </div>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Note:</strong> This operation only deletes the plugin files. It does not remove any database tables or options that the plugin may have created. If your plugin stores data in the WordPress database, you may need to clean that up separately.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Version Control Section */}
            <section id="version-control">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <GitBranch className="h-5 w-5" />
                Version Control
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <GitBranch className="h-4 w-4" />
                    Using Version Control
                  </h3>
                  <p className="mt-2 text-gray-700">
                    The WordPress Plugin Generator includes a built-in version control system that automatically tracks changes to your plugin. Here's how to use it:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Click on "Version Control" in the top menu</li>
                    <li>From the dropdown, select a version from the list (e.g., v1.0.0, v1.0.1, etc.)</li>
                    <li>The editor will update to show the code from that version</li>
                    <li>You can switch between versions at any time to compare changes</li>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Note:</strong> New versions are automatically created when significant changes are made to your plugin, such as adding new features or making major modifications.
                      </span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Eye className="h-4 w-4" />
                    Viewing Code Changes
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To see what changed between versions:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Click on "Version Control" in the top menu</li>
                    <li>Select "Code Changes" from the dropdown</li>
                    <li>A diff view will appear showing what was added (in green) and removed (in red)</li>
                    <li>This helps you understand what changed between versions</li>
                    <li>You can use this to track the evolution of your plugin over time</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <ArrowRight className="h-4 w-4" />
                    Reverting to Previous Versions
                  </h3>
                  <p className="mt-2 text-gray-700">
                    If you need to go back to a previous version:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Click on "Version Control" in the top menu</li>
                    <li>Select the version you want to revert to from the dropdown</li>
                    <li>The editor will update to show that version</li>
                    <li>You can continue working from that point</li>
                    <li>Alternatively, you can type commands in the chat like "go back 1 version" or "revert to v1.0.2"</li>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Tip:</strong> If you're experimenting with changes, it's a good idea to save your session before making major modifications. This way, you can always go back to a known good state.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Changing LLMs Section */}
            <section id="changing-llms">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <Settings2 className="h-5 w-5" />
                Changing LLMs
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Settings2 className="h-4 w-4" />
                    Selecting a Different Language Model
                  </h3>
                  <p className="mt-2 text-gray-700">
                    The WordPress Plugin Generator supports multiple language models (LLMs) to power the AI. Here's how to change which model is used:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Look for the LLM selector in the top-right corner of the interface</li>
                    <li>Click on the dropdown to see available models</li>
                    <li>Select your preferred model from the list</li>
                    <li>The system will use your selected model for all future interactions</li>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Note:</strong> Different models have different strengths. Claude Sonnet 3.7 is the default and recommended model for most plugin development tasks, but you may want to experiment with other models for specific needs.
                      </span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <CheckCircle2 className="h-4 w-4" />
                    Available Models
                  </h3>
                  <p className="mt-2 text-gray-700">
                    The system supports the following language models:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                    <li><strong>Claude Sonnet 3.7:</strong> The default model, offering a good balance of capabilities and performance</li>
                    <li><strong>Claude Opus 3.5:</strong> A more powerful model for complex tasks, but may be slower</li>
                    <li><strong>GPT-4o:</strong> OpenAI's model with strong coding capabilities</li>
                    <li><strong>DeepSeek:</strong> An alternative model for specialized tasks</li>
                  </ul>
                  <p className="mt-2 text-gray-700">
                    The system will automatically fall back to alternative models if the primary one is unavailable.
                  </p>
                </div>
              </div>
            </section>
            
            {/* Editing Plugin Details Section */}
            <section id="editing-details">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <Pencil className="h-5 w-5" />
                Editing Plugin Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Settings2 className="h-4 w-4" />
                    Modifying Plugin Information
                  </h3>
                  <p className="mt-2 text-gray-700">
                    If you need to update your plugin's metadata (name, description, version, etc.):
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Click on "Project" in the top menu</li>
                    <li>Select "Edit Session" from the dropdown</li>
                    <li>A modal will appear with your current plugin details</li>
                    <li>Update any fields as needed:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li><strong>Plugin Name:</strong> The name displayed in the WordPress admin</li>
                      <li><strong>Plugin URI:</strong> Website URL related to your plugin</li>
                      <li><strong>Description:</strong> A short description of what your plugin does</li>
                      <li><strong>Version:</strong> The version number (e.g., 1.0.1)</li>
                      <li><strong>Author:</strong> Your name or organization</li>
                      <li><strong>Author URI:</strong> Your website URL</li>
                    </ul>
                    <li>Click "Save" to apply your changes</li>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Important:</strong> Changing the plugin name will update the main plugin file name and directory structure. This is equivalent to creating a new plugin from WordPress's perspective, so use caution when renaming existing plugins.
                      </span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <ArrowRight className="h-4 w-4" />
                    Updating Version Numbers
                  </h3>
                  <p className="mt-2 text-gray-700">
                    When making significant changes to your plugin, it's good practice to update the version number:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Follow the steps above to edit your plugin details</li>
                    <li>Increment the version number according to semantic versioning:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li><strong>Major version (1.0.0 → 2.0.0):</strong> For breaking changes</li>
                      <li><strong>Minor version (1.0.0 → 1.1.0):</strong> For new features</li>
                      <li><strong>Patch version (1.0.0 → 1.0.1):</strong> For bug fixes</li>
                    </ul>
                    <li>Click "Save" to apply the new version</li>
                    <li>The system will create a new version in the version control system</li>
                  </ol>
                </div>
              </div>
            </section>
            
            {/* Deployment Section */}
            <section id="deployment">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                <Upload className="h-5 w-5" />
                Deployment Options
              </h2>
              
              <div className="space-y-4">
                <div id="download-plugin">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Download className="h-4 w-4" />
                    Download Plugin
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To download your plugin as a ZIP file for manual installation:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Click on "Deploy" in the top menu</li>
                    <li>Select "Download Plugin" from the dropdown</li>
                    <li>A ZIP file will be generated and downloaded to your computer</li>
                    <li>You can then install this ZIP file via the WordPress admin:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li>Go to Plugins → Add New → Upload Plugin</li>
                      <li>Choose the ZIP file and click "Install Now"</li>
                      <li>Activate the plugin after installation</li>
                    </ul>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Note:</strong> This method does not enable debugging by default. If you encounter issues, you'll need to manually enable debugging in your WordPress installation or use the direct deployment method with FTP enabled.
                      </span>
                    </p>
                  </div>
                </div>
                
                <div id="deploy-wordpress">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Upload className="h-4 w-4" />
                    Deploy to WordPress
                  </h3>
                  <p className="mt-2 text-gray-700">
                    To deploy your plugin directly to your WordPress site:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>First, ensure you've connected to your WordPress site (see WordPress Connection section)</li>
                    <li>Click on "Deploy" in the top menu</li>
                    <li>Select "Deploy to WordPress" from the dropdown</li>
                    <li>The system will:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li>Generate a fresh ZIP file with your latest code</li>
                      <li>Upload it to your WordPress site via the API</li>
                      <li>Install and activate the plugin</li>
                      <li>If updating an existing plugin, it will handle the update process</li>
                    </ul>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Basic API Deployment:</strong> If you've only connected with the API key (without FTP/SFTP details), the system will use WordPress's built-in installer. This works for most cases but provides limited debugging information if something goes wrong.
                      </span>
                    </p>
                  </div>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Enhanced FTP Deployment:</strong> If you've provided FTP/SFTP details, the system can provide thorough debugging information and has more robust error handling. This is recommended for development and troubleshooting.
                      </span>
                    </p>
                  </div>
                </div>
                
                <div id="code-snippet">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-blue-500">
                    <Code className="h-4 w-4" />
                    Code Snippet
                  </h3>
                  <p className="mt-2 text-gray-700">
                    For simple functionality, you can use a code snippet instead of a full plugin:
                  </p>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-700">
                    <li>Click on "Deploy" in the top menu</li>
                    <li>Select "Code Snippet" from the dropdown</li>
                    <li>A modal will appear with a PHP code snippet that contains the core functionality</li>
                    <li>You can use this code in one of two ways:</li>
                    <ul className="list-disc list-inside ml-6 mt-1 text-gray-700">
                      <li><strong>Code Snippets Plugin:</strong> Copy and paste into a snippets plugin like "Code Snippets"</li>
                      <li><strong>Theme's functions.php:</strong> Add to your theme's functions.php file (use a child theme for this)</li>
                    </ul>
                  </ol>
                  <div className="mt-2 bg-gray-100 p-3 rounded-md">
                    <p className="text-sm text-gray-600 flex items-start">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Best for:</strong> Simple functionality that doesn't require a full plugin structure. This approach is useful for quick customizations or when you want to avoid the overhead of a separate plugin.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 