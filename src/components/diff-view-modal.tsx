'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileChange } from '@/types/shared'
import { generateLineDiff } from '@/lib/diff-utils'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, File, Plus, Minus, Eye, AlertCircle } from 'lucide-react'

interface DiffViewModalProps {
  isOpen: boolean
  onClose: () => void
  fileChanges: FileChange[]
  versionDescription: string
  versionNumber: string
}

export function DiffViewModal({
  isOpen,
  onClose,
  fileChanges,
  versionDescription,
  versionNumber
}: DiffViewModalProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(
    fileChanges.length > 0 ? fileChanges[0].path : null
  )
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<string>("split")

  // Debug: Log fileChanges when component mounts or fileChanges changes
  useEffect(() => {
    console.log('DiffViewModal fileChanges:', fileChanges);
  }, [fileChanges]);

  // Update selectedFile when fileChanges changes
  useEffect(() => {
    if (fileChanges.length > 0 && (!selectedFile || !fileChanges.find(f => f.path === selectedFile))) {
      setSelectedFile(fileChanges[0].path);
    }
  }, [fileChanges, selectedFile]);

  const toggleFile = (path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const selectedFileChange = fileChanges.find(change => change.path === selectedFile)
  const diffLines = selectedFileChange 
    ? generateLineDiff(selectedFileChange.previousContent || '', selectedFileChange.content)
    : []

  // Group files by directory
  const filesByDirectory: Record<string, FileChange[]> = {}
  fileChanges.forEach(change => {
    const parts = change.path.split('/')
    const directory = parts.length > 1 ? parts.slice(0, -1).join('/') : '/'
    
    if (!filesByDirectory[directory]) {
      filesByDirectory[directory] = []
    }
    
    filesByDirectory[directory].push(change)
  })

  // If there are no file changes, show a message
  const hasNoChanges = fileChanges.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] flex flex-col bg-white p-0 sm:rounded-xl">
        <DialogHeader className="bg-white p-6">
          <DialogTitle>Changes in Version {versionNumber}</DialogTitle>
          {versionDescription && (
            <p className="text-sm text-muted-foreground">{versionDescription}</p>
          )}
        </DialogHeader>
        
        {hasNoChanges ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4 p-8 bg-white">
            <AlertCircle className="h-12 w-12 text-yellow-500" />
            <h3 className="text-lg font-medium">No Changes Detected</h3>
            <p className="text-center text-muted-foreground">
              No file changes were found between versions. This could happen if:
              <br />
              1. The files are identical between versions
              <br />
              2. The file structure couldn't be properly parsed
            </p>
          </div>
        ) : (
          <div className="flex flex-1 gap-4 overflow-hidden bg-white px-6 pb-6">
            {/* File tree */}
            <div className="w-1/5 border rounded-md overflow-hidden bg-white">
              <ScrollArea className="h-full">
                <div className="p-2">
                  {Object.entries(filesByDirectory).map(([directory, files]) => {
                    const isExpanded = expandedFiles.has(directory)
                    
                    return (
                      <div key={directory} className="mb-2">
                        {directory !== '/' && (
                          <div 
                            className="flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-accent/50 transition-colors duration-200"
                            onClick={() => toggleFile(directory)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 mr-1 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground" />
                            )}
                            <span className="font-medium">{directory}</span>
                          </div>
                        )}
                        
                        {(directory === '/' || isExpanded) && (
                          <div className={directory !== '/' ? "ml-4" : ""}>
                            {files.map(file => {
                              const fileName = file.path.split('/').pop() || file.path
                              const isSelected = selectedFile === file.path
                              
                              return (
                                <div
                                  key={file.path}
                                  className={cn(
                                    "flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-accent/50 transition-colors duration-200",
                                    isSelected && "bg-accent"
                                  )}
                                  onClick={() => setSelectedFile(file.path)}
                                >
                                  <File className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <span className="truncate flex-1">{fileName}</span>
                                  <div className="flex items-center text-xs">
                                    {file.added > 0 && (
                                      <span className="text-green-600 flex items-center mr-2">
                                        <Plus className="h-3 w-3 mr-1" />
                                        {file.added}
                                      </span>
                                    )}
                                    {file.deleted > 0 && (
                                      <span className="text-red-600 flex items-center">
                                        <Minus className="h-3 w-3 mr-1" />
                                        {file.deleted}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
            
            {/* Diff view */}
            <div className="flex-1 border rounded-md overflow-hidden bg-white">
              <Tabs 
                defaultValue="split" 
                value={activeTab}
                onValueChange={setActiveTab}
                className="h-full flex flex-col"
              >
                <div className="border-b px-4 bg-white">
                  <TabsList className="bg-gray-100">
                    <TabsTrigger value="split">Split View</TabsTrigger>
                    <TabsTrigger value="unified">Unified View</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="split" className="flex-1 p-0 m-0 bg-white h-full overflow-hidden">
                  <ScrollArea className="h-full w-full">
                    <div className="p-4">
                      {selectedFileChange ? (
                        <>
                          <div className="text-sm font-medium mb-2">{selectedFile}</div>
                          <div className="border rounded-md overflow-hidden">
                            <div className="grid grid-cols-2 divide-x">
                              {/* Old version */}
                              <div className="bg-gray-50">
                                <div className="p-2 bg-gray-200 font-medium text-sm">Previous Version</div>
                                <pre className="p-4 text-xs font-mono overflow-x-auto overflow-y-auto max-h-[70vh]">
                                  {selectedFileChange.previousContent ? (
                                    selectedFileChange.previousContent.split('\n').map((line, i) => (
                                      <div key={i} className="whitespace-pre py-0.5">
                                        {line || ' '}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-muted-foreground italic">File did not exist</div>
                                  )}
                                </pre>
                              </div>
                              
                              {/* New version */}
                              <div className="bg-white">
                                <div className="p-2 bg-gray-200 font-medium text-sm">Current Version</div>
                                <pre className="p-4 text-xs font-mono overflow-x-auto overflow-y-auto max-h-[70vh]">
                                  {selectedFileChange.content ? (
                                    selectedFileChange.content.split('\n').map((line, i) => (
                                      <div key={i} className="whitespace-pre py-0.5">
                                        {line || ' '}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-muted-foreground italic">File was deleted</div>
                                  )}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground p-4">
                          Select a file to view changes
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="unified" className="flex-1 p-0 m-0 bg-white h-full overflow-hidden">
                  <ScrollArea className="h-full w-full">
                    <div className="p-4">
                      {selectedFileChange ? (
                        <div className="flex flex-col">
                          <div className="text-sm font-medium mb-2">{selectedFile}</div>
                          <div className="border rounded-lg overflow-hidden">
                            <div className="font-mono text-sm p-4 bg-background font-['Consolas',_'Monaco',_'Courier_New',_monospace] leading-relaxed">
                              {diffLines.map((line, i) => (
                                <div 
                                  key={i} 
                                  className={cn(
                                    "whitespace-pre py-0.5",
                                    line.type === 'added' && "text-green-600 bg-green-50",
                                    line.type === 'deleted' && "text-red-600 bg-red-50"
                                  )}
                                >
                                  <span className="inline-block w-5 text-muted-foreground">
                                    {line.type === 'added' ? '+' : line.type === 'deleted' ? '-' : ' '}
                                  </span>
                                  {line.content}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground p-4">
                          Select a file to view changes
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
        
        <DialogFooter className="bg-white p-6 border-t">
          <Button onClick={onClose} className="bg-black hover:bg-gray-800 text-white">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 