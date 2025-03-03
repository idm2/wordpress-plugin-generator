import { FileChange, FileStructure } from "@/types/shared"

/**
 * Compares two file structures and generates file changes
 * @param oldStructure Previous file structure
 * @param newStructure Current file structure
 * @returns Array of file changes
 */
export function generateFileChanges(
  oldStructure: FileStructure[] | null,
  newStructure: FileStructure[]
): FileChange[] {
  const changes: FileChange[] = []
  
  // Helper function to find a file in the structure by path
  const findFileByPath = (structure: FileStructure[] | null, path: string): FileStructure | null => {
    if (!structure) return null
    
    const parts = path.split('/')
    let current: FileStructure[] = structure
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const found = current.find(item => item.name === part)
      
      if (!found) return null
      
      if (i === parts.length - 1) {
        return found
      }
      
      if (found.children) {
        current = found.children
      } else {
        return null
      }
    }
    
    return null
  }
  
  // Helper function to get all files in a structure
  const getAllFiles = (structure: FileStructure[] | null, basePath: string = ''): { path: string, file: FileStructure }[] => {
    if (!structure) return []
    
    let files: { path: string, file: FileStructure }[] = []
    
    for (const item of structure) {
      const path = basePath ? `${basePath}/${item.name}` : item.name
      
      if (item.type === 'file') {
        files.push({ path, file: item })
      } else if (item.children) {
        files = [...files, ...getAllFiles(item.children, path)]
      }
    }
    
    return files
  }
  
  // Get all files from both structures
  const oldFiles = oldStructure ? getAllFiles(oldStructure) : []
  const newFiles = getAllFiles(newStructure)
  
  // Check for modified and added files
  for (const { path, file } of newFiles) {
    const oldFile = findFileByPath(oldStructure, path)
    
    if (!oldFile) {
      // File was added
      changes.push({
        path,
        added: file.content ? file.content.split('\n').length : 0,
        deleted: 0,
        content: file.content || '',
      })
    } else if (oldFile.content !== file.content) {
      // File was modified
      const oldLines = oldFile.content ? oldFile.content.split('\n').length : 0
      const newLines = file.content ? file.content.split('\n').length : 0
      
      // Simple diff calculation - can be improved with actual line-by-line diff
      const added = Math.max(0, newLines - oldLines)
      const deleted = Math.max(0, oldLines - newLines)
      
      changes.push({
        path,
        added,
        deleted,
        content: file.content || '',
        previousContent: oldFile.content
      })
    }
  }
  
  // Check for deleted files
  for (const { path, file } of oldFiles) {
    const newFile = findFileByPath(newStructure, path)
    
    if (!newFile) {
      // File was deleted
      changes.push({
        path,
        added: 0,
        deleted: file.content ? file.content.split('\n').length : 0,
        content: '',
        previousContent: file.content
      })
    }
  }
  
  return changes
}

/**
 * Generates a line-by-line diff between two strings
 * @param oldText Previous text content
 * @param newText Current text content
 * @returns Array of diff lines with type (added, deleted, unchanged)
 */
export function generateLineDiff(oldText: string, newText: string): { type: 'added' | 'deleted' | 'unchanged', content: string }[] {
  if (!oldText && !newText) return []
  if (!oldText) return newText.split('\n').map(line => ({ type: 'added', content: line }))
  if (!newText) return oldText.split('\n').map(line => ({ type: 'deleted', content: line }))
  
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: { type: 'added' | 'deleted' | 'unchanged', content: string }[] = []
  
  // This is a simple implementation - for production, consider using a library like diff or jsdiff
  let i = 0, j = 0
  
  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      // All remaining lines in newLines are additions
      while (j < newLines.length) {
        result.push({ type: 'added', content: newLines[j] })
        j++
      }
      break
    }
    
    if (j >= newLines.length) {
      // All remaining lines in oldLines are deletions
      while (i < oldLines.length) {
        result.push({ type: 'deleted', content: oldLines[i] })
        i++
      }
      break
    }
    
    if (oldLines[i] === newLines[j]) {
      // Lines are the same
      result.push({ type: 'unchanged', content: oldLines[i] })
      i++
      j++
    } else {
      // Try to find the next matching line
      let foundMatch = false
      
      // Look ahead in newLines to find a match for the current oldLine
      for (let k = j + 1; k < Math.min(j + 5, newLines.length); k++) {
        if (oldLines[i] === newLines[k]) {
          // Found a match, so lines between j and k are additions
          for (let l = j; l < k; l++) {
            result.push({ type: 'added', content: newLines[l] })
          }
          result.push({ type: 'unchanged', content: oldLines[i] })
          i++
          j = k + 1
          foundMatch = true
          break
        }
      }
      
      if (!foundMatch) {
        // Look ahead in oldLines to find a match for the current newLine
        for (let k = i + 1; k < Math.min(i + 5, oldLines.length); k++) {
          if (oldLines[k] === newLines[j]) {
            // Found a match, so lines between i and k are deletions
            for (let l = i; l < k; l++) {
              result.push({ type: 'deleted', content: oldLines[l] })
            }
            result.push({ type: 'unchanged', content: newLines[j] })
            i = k + 1
            j++
            foundMatch = true
            break
          }
        }
        
        if (!foundMatch) {
          // No match found within the lookahead window, treat as a replacement
          result.push({ type: 'deleted', content: oldLines[i] })
          result.push({ type: 'added', content: newLines[j] })
          i++
          j++
        }
      }
    }
  }
  
  return result
} 