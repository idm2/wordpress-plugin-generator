'use client'

import { ChevronRight, ChevronDown, File, Folder, Plus, Minus, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FileChange, FileStructure } from '@/types/shared'
import { useState, useEffect } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

interface FileExplorerProps {
  files: FileStructure[]
  selectedFile: string | null
  onSelectFile: (path: string) => void
  fileChanges?: FileChange[]
  onViewChanges?: (path: string) => void
}

const FileExplorer = ({ 
  files, 
  selectedFile, 
  onSelectFile,
  fileChanges = [],
  onViewChanges
}: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Automatically expand folders based on selected file
  useEffect(() => {
    if (selectedFile) {
      const parts = selectedFile.split('/')
      const folders = new Set<string>()
      
      // Build paths for each parent folder
      let currentPath = ''
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]
        folders.add(currentPath)
      }
      
      setExpandedFolders(folders)
    }
  }, [selectedFile])

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  // Helper function to get file changes for a path
  const getFileChanges = (path: string) => {
    return fileChanges.find(change => change.path === path)
  }

  const renderItem = (item: FileStructure, path: string = '', level: number = 0) => {
    const fullPath = path ? `${path}/${item.name}` : item.name
    const isSelected = selectedFile === fullPath
    const isExpanded = expandedFolders.has(fullPath)
    const isCurrentFolder = selectedFile?.startsWith(fullPath + '/')
    const fileChange = item.type === 'file' ? getFileChanges(fullPath) : null

    if (item.type === 'file') {
      return (
        <div
          key={fullPath}
          className={cn(
            'group flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-accent/50 transition-colors duration-200',
            isSelected && 'bg-[#E6EEFB]',
          )}
          style={{ paddingLeft: `${(level + 1) * 12}px` }}
          onClick={() => onSelectFile(fullPath)}
        >
          <File className={cn(
            "h-4 w-4 mr-2 shrink-0",
            isSelected ? "text-[#E6EEFB]" : "text-muted-foreground"
          )} />
          <span className={cn(
            "truncate text-xs font-normal",
            isSelected && "text-[#1E40AF]"
          )}>{item.name}</span>
          
          {/* Show change indicators */}
          {fileChange && (
            <div className="ml-auto flex items-center">
              {fileChange.added > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center text-green-600 ml-1">
                        <Plus className="h-3 w-3" />
                        <span className="text-xs">{fileChange.added}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{fileChange.added} lines added</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {fileChange.deleted > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center text-red-600 ml-1">
                        <Minus className="h-3 w-3" />
                        <span className="text-xs">{fileChange.deleted}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{fileChange.deleted} lines deleted</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {onViewChanges && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        className="ml-1 text-xs text-blue-600 hover:text-blue-800"
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewChanges(fullPath)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View file changes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={fullPath}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-accent/50 transition-colors duration-200 relative group",
                  isCurrentFolder && "font-bold"
                )}
                style={{ paddingLeft: `${level * 12}px` }}
                onClick={() => toggleFolder(fullPath)}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-border/50 group-hover:bg-border" />
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
                )}
                <Folder className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
                <span className={cn(
                  "truncate text-xs font-normal",
                  isCurrentFolder && "font-bold"
                )}>{item.name}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click to {isExpanded ? 'collapse' : 'expand'} folder</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {isExpanded && item.children && (
          <div className="relative">
            <div className="absolute left-[9px] top-0 bottom-0 w-[1px] bg-border/50" />
            {item.children.map((child) => renderItem(child, fullPath, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-background border-x">
      {files.map((item) => renderItem(item))}
    </div>
  )
}

export default FileExplorer

