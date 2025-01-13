'use client'

interface CodeEditorProps {
  selectedFile: string | null
  fileStructure: any[]
}

export function CodeEditor({ selectedFile, fileStructure }: CodeEditorProps) {
  const getFileContent = (path: string | null) => {
    if (!path) return null
    
    const parts = path.split('/')
    let current = fileStructure[0]
    
    for (let i = 1; i < parts.length; i++) {
      if (!current) return null
      if (current.type === 'file') return current.content
      
      current = current.children?.find((item: any) => item.name === parts[i])
    }
    
    return current?.content || null
  }

  return (
    <div className="h-full">
      {selectedFile ? (
        <pre className="p-4 bg-gray-50 rounded-md h-full overflow-auto">
          <code>
            {getFileContent(selectedFile) || 'File content not found'}
          </code>
        </pre>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Select a file to view its contents
        </div>
      )}
    </div>
  )
}

