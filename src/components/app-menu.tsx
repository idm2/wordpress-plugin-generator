"use client"

import React, { useState } from "react"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
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
  AlertCircle, 
  Wrench,
  Trash2,
  HelpCircle
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WordPressConnection } from "./wordpress-connector"
import { CodeVersion } from "@/types/shared"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { HowToModal } from "./how-to-modal"

interface AppMenuProps {
  // Project menu props
  onNewSession: () => void
  onEditDetails: () => void
  onLoadSession: () => void
  onSaveSession: () => void
  hasFilledDetails: boolean
  generatedPlugin: boolean
  loading: boolean
  
  // Version control menu props
  codeVersions: CodeVersion[]
  currentVersionIndex: number
  onVersionChange: (index: number) => void
  onViewChanges: (versionId: string) => void
  
  // Deploy menu props
  onDownloadPlugin: () => void
  onDeployToWordPress: () => void
  onViewCodeSnippet: () => void
  pluginName: string
  wordpressConnection: WordPressConnection | null
  onOpenConnectModal: () => void
  
  // Tools menu props
  onScanPluginErrors: () => void
  isCheckingPluginErrors: boolean
  onEmergencyAccess: (operation?: string) => void
  enableDebugging?: boolean
}

export function AppMenu({
  // Project menu props
  onNewSession,
  onEditDetails,
  onLoadSession,
  onSaveSession,
  hasFilledDetails,
  generatedPlugin,
  loading,
  
  // Version control menu props
  codeVersions,
  currentVersionIndex,
  onVersionChange,
  onViewChanges,
  
  // Deploy menu props
  onDownloadPlugin,
  onDeployToWordPress,
  onViewCodeSnippet,
  pluginName,
  wordpressConnection,
  onOpenConnectModal,
  
  // Tools menu props
  onScanPluginErrors,
  isCheckingPluginErrors,
  onEmergencyAccess,
  enableDebugging
}: AppMenuProps) {
  // Add state for the FTP details warning modal
  const [isFtpWarningOpen, setIsFtpWarningOpen] = useState(false);
  // Add state for the How To modal
  const [isHowToModalOpen, setIsHowToModalOpen] = useState(false);
  
  // Function to handle WP Tools menu click
  const handleWpToolsClick = () => {
    // Check if WordPress is connected and if FTP details are provided
    if (!wordpressConnection?.ftpDetails?.host) {
      // If FTP details are not provided, show the warning modal
      setIsFtpWarningOpen(true);
    }
  };
  
  // Function to handle Delete Plugin click
  const handleDeletePlugin = () => {
    // Call the emergency access function with the delete-plugin operation
    if (onEmergencyAccess) {
      onEmergencyAccess('delete-plugin');
    }
  };
  
  // Function to handle Read Debug Log click
  const handleReadDebugLog = () => {
    // Call the emergency access function with the read-debug-log operation
    if (onEmergencyAccess) {
      onEmergencyAccess('read-debug-log');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Project Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Project
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onNewSession}>
            <RefreshCw className="h-4 w-4 mr-2" />
            New Session
          </DropdownMenuItem>
          
          {hasFilledDetails && generatedPlugin && (
            <DropdownMenuItem onClick={onEditDetails}>
              <Settings2 className="h-4 w-4 mr-2" />
              Edit Session
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={onLoadSession} disabled={loading}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Load Saved Session
          </DropdownMenuItem>
          
          {generatedPlugin && (
            <DropdownMenuItem onClick={onSaveSession} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Session
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Version Control Menu */}
      {generatedPlugin && codeVersions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Version Control
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <div className="px-2 py-1.5">
              <Select
                value={currentVersionIndex.toString()}
                onValueChange={(value) => onVersionChange(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {codeVersions.map((version, index) => (
                    <SelectItem key={version.id} value={index.toString()}>
                      {version.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <DropdownMenuSeparator />
            
            {currentVersionIndex > 0 && (
              <DropdownMenuItem 
                onClick={() => {
                  if (currentVersionIndex > 0 && codeVersions[currentVersionIndex]) {
                    onViewChanges(codeVersions[currentVersionIndex].id);
                  }
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Code Changes
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Deploy Menu */}
      {generatedPlugin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Deploy
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onDownloadPlugin}>
              <Download className="h-4 w-4 mr-2" />
              Download Plugin
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={onDeployToWordPress}>
              <Upload className="h-4 w-4 mr-2" />
              Deploy to WordPress
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={onViewCodeSnippet}>
              <Code className="h-4 w-4 mr-2" />
              Code Snippet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Tools Menu - renamed to WP Tools */}
      {generatedPlugin && (
        <>
          {/* Use a simple button for WP Tools that shows either the modal or dropdown */}
          <div className="relative">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={handleWpToolsClick}
            >
              <Wrench className="h-4 w-4" />
              WP Tools
            </Button>
            
            {/* Only render the dropdown menu if FTP details are provided */}
            {wordpressConnection?.ftpDetails?.host && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2 absolute inset-0 opacity-0"
                  >
                    <Wrench className="h-4 w-4" />
                    WP Tools
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {/* Delete WP Plugin option (in red) */}
                  <DropdownMenuItem 
                    onClick={handleDeletePlugin}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                    Delete WP Plugin
                  </DropdownMenuItem>
                  
                  {/* Read Debug Log option */}
                  <DropdownMenuItem 
                    onClick={handleReadDebugLog}
                  >
                    <FileCode className="h-4 w-4 mr-2" />
                    Read Debug Log
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* FTP Details Warning Modal */}
          <Dialog open={isFtpWarningOpen} onOpenChange={setIsFtpWarningOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>FTP/SFTP Details Required</DialogTitle>
                <DialogDescription>
                  To use WordPress Tools, you must first connect to WordPress and provide your FTP/SFTP details.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-700">
                        WordPress Tools require FTP/SFTP access to your server to perform advanced operations like reading debug logs and emergency plugin management.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFtpWarningOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setIsFtpWarningOpen(false);
                  onOpenConnectModal();
                }}>
                  Connect to WordPress
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
      
      {/* How To Button */}
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-2 ml-2"
        onClick={() => setIsHowToModalOpen(true)}
      >
        <HelpCircle className="h-4 w-4 text-blue-500" />
        How To
      </Button>
      
      {/* How To Modal */}
      <HowToModal 
        open={isHowToModalOpen} 
        onOpenChange={setIsHowToModalOpen} 
      />
    </div>
  )
} 