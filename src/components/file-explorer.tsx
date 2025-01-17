'use client'

import { ChevronRight, File, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FileStructure } from '@/types/shared'

interface FileExplorerProps {
  files: FileStructure[]
  selectedFile: string | null
  onSelectFile: (path: string) => void
}

const FileExplorer = ({ files, selectedFile, onSelectFile }: FileExplorerProps) => {
  const renderItem = (item: FileStructure, path: string = '', level: number = 0) => {
    const fullPath = path ? `${path}/${item.name}` : item.name
    const isSelected = selectedFile === fullPath

    if (item.type === 'file') {
      return (
        <div
          key={fullPath}
          className={cn(
            'group flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-accent/50 relative',
            isSelected && 'bg-accent text-accent-foreground',
          )}
          style={{ paddingLeft: `${(level + 1) * 12}px` }}
          onClick={() => onSelectFile(fullPath)}
        >
          <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-border/50 group-hover:bg-border" />
          <File className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
          <span className="truncate font-mono text-xs">{item.name}</span>
        </div>
      )
    }

    return (
      <div key={fullPath}>
        <div
          className="flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-accent/50 relative group"
          style={{ paddingLeft: `${level * 12}px` }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-border/50 group-hover:bg-border" />
          <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
          <Folder className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
          <span className="truncate font-mono text-xs">{item.name}</span>
        </div>
        <div className="relative">
          <div className="absolute left-[9px] top-0 bottom-0 w-[1px] bg-border/50" />
          {item.children?.map((child) => renderItem(child, fullPath, level + 1))}
        </div>
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

