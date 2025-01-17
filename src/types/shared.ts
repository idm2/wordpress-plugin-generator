export interface FileStructure {
    name: string
    type: 'file' | 'folder'
    content?: string
    children?: FileStructure[]
  }
  