'use client'

import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FileStructure } from '@/types/shared'
import { useState, useEffect } from 'react'

interface FileExplorerProps {
  files: FileStructure[]
  selectedFile: string | null
  onSelectFile: (path: string) => void
}

const FileExplorer = ({ files, selectedFile, onSelectFile }: FileExplorerProps) => {
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

  const renderItem = (item: FileStructure, path: string = '', level: number = 0) => {
    const fullPath = path ? `${path}/${item.name}` : item.name
    const isSelected = selectedFile === fullPath
    const isExpanded = expandedFolders.has(fullPath)
    const isCurrentFolder = selectedFile?.startsWith(fullPath + '/')

    if (item.type === 'file') {
      return (
        <div
          key={fullPath}
          className={cn(
            'group flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-accent/50 transition-colors duration-200 relative',
            isSelected && 'bg-[#e8f5e9] hover:bg-[#e8f5e9]',
          )}
          style={{ paddingLeft: `${(level + 1) * 12}px` }}
          onClick={() => onSelectFile(fullPath)}
        >
          <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-border/50 group-hover:bg-border" />
          <File className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
          <span className="truncate text-xs font-normal">{item.name}</span>
        </div>
      )
    }

    return (
      <div key={fullPath}>
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
    <div className="h-full overflow-auto bg-background border-r">
      {files.map((item) => renderItem(item))}
    </div>
  )
}

export default FileExplorer

