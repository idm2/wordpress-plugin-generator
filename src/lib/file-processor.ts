interface ProcessedFile {
    text: string
    metadata?: Record<string, any>
  }
  
  export async function processFile(file: File): Promise<ProcessedFile> {
    const type = file.type.toLowerCase()
  
    // Handle images - we'll use a simple message for now
    if (type.startsWith("image/")) {
      return {
        text: `[Image uploaded: ${file.name}]`,
        metadata: {
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
        },
      }
    }
  
    // Handle PDFs and other text-based files
    if (
      type === "application/pdf" ||
      type === "text/plain" ||
      type.includes("word") ||
      type.includes("excel") ||
      type.includes("spreadsheet")
    ) {
      try {
        const text = await file.text()
        return {
          text,
          metadata: {
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
          },
        }
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error)
        return {
          text: `[File uploaded: ${file.name}]`,
          metadata: {
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            error: "Could not read file contents",
          },
        }
      }
    }
  
    // Return a simple message for unsupported files
    return {
      text: `[File uploaded: ${file.name}]`,
      metadata: {
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      },
    }
  }
  
  