'use client'

import { FileCode, Folder, FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface FileExplorerProps {
  files: any[]
  selectedFile: string | null
  onSelectFile: (path: string) => void
}

export function FileExplorer({ files, selectedFile, onSelectFile }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  const renderFileTree = (items: any[], path = "") => {
    return items.map((item) => {
      const currentPath = path ? `${path}/${item.name}` : item.name
      
      if (item.type === "folder") {
        const isExpanded = expandedFolders.has(currentPath)
        return (
          <div key={currentPath}>
            <Button
              variant="ghost"
              onClick={() => toggleFolder(currentPath)}
              className={`flex items-center gap-2 w-full px-2 py-1 text-sm hover:bg-gray-100 rounded-sm ${
                selectedFile === currentPath ? 'bg-gray-100' : ''
              }`}
            >
              {isExpanded ? (
                <FolderOpen className="h-4 w-4 text-gray-500" />
              ) : (
                <Folder className="h-4 w-4 text-gray-500" />
              )}
              {item.name}
            </Button>
            {isExpanded && item.children && (
              <div className="ml-4">
                {renderFileTree(item.children, currentPath)}
              </div>
            )}
          </div>
        )
      }

      return (
        <Button
          key={currentPath}
          variant="ghost"
          onClick={() => onSelectFile(currentPath)}
          className={`flex items-center gap-2 w-full px-2 py-1 text-sm hover:bg-gray-100 rounded-sm ${
            selectedFile === currentPath ? 'bg-gray-100' : ''
          }`}
        >
          <FileCode className="h-4 w-4 text-gray-500" />
          {item.name}
        </Button>
      )
    })
  }

  return (
    <div className="space-y-1">
      {files.length > 0 ? (
        renderFileTree(files)
      ) : (
        <p className="text-sm text-gray-500 p-2">
          No files generated yet
        </p>
      )}
    </div>
  )
}

