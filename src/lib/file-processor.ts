import * as XLSX from 'xlsx'

export interface ProcessedFile {
    text?: string
    imageUrl?: string
    imageAnalysis?: string
    metadata?: {
      type: string
      size: number
      lastModified: number
      name: string
      isReference: boolean
      error?: string
      content?: string
      summary?: string
    }
}

export interface FileReference {
  name: string
  type: string
  content?: string
  summary?: string
  isReference: boolean
}

async function readPdfContent(file: File): Promise<{ content: string; summary: string }> {
  try {
    // Dynamically import PDF.js only when needed
    const pdfjsLib = await import('pdfjs-dist')
    
    // Set worker source dynamically
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
    const pdf = await loadingTask.promise
    
    let content = ""
    const numPages = pdf.numPages

    // Extract text from each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      content += pageText + "\n\n"
    }

    // Create a summary (first 100 characters)
    const summary = content.slice(0, 100).trim() + (content.length > 100 ? "..." : "")

    return { content, summary }
  } catch (error) {
    console.error('Error reading PDF:', error)
    throw new Error(`Could not read PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function readExcelContent(file: File): Promise<{ content: string; summary: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    let content = ""
    let firstSheetSummary = ""

    // Process each sheet
    workbook.SheetNames.forEach((sheetName, index) => {
      const sheet = workbook.Sheets[sheetName]
      
      // Get the data with headers
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      
      if (data.length > 0) {
        // Start with sheet name
        content += `Sheet: ${sheetName}\n`
        
        // Format headers
        if (data[0] && data[0].length > 0) {
          const headers = data[0]
          content += `Columns: ${headers.join(", ")}\n\n`
          
          // Store first sheet's columns for summary
          if (index === 0) {
            firstSheetSummary = `The document contains the following columns: ${headers.join(", ")}`
          }

          // Add data rows with column headers
          for (let i = 1; i < data.length; i++) {
            if (data[i] && data[i].some(cell => cell !== undefined && cell !== null)) {
              content += "Row " + i + ":\n"
              data[i].forEach((cell, cellIndex) => {
                if (cell !== undefined && cell !== null) {
                  content += `${headers[cellIndex]}: ${cell}\n`
                }
              })
              content += "\n"
            }
          }
        }
      }
      
      content += "\n---\n\n"
    })

    return { 
      content: content.trim(), 
      summary: firstSheetSummary || "Empty spreadsheet"
    }
  } catch (error) {
    console.error('Error reading Excel file:', error)
    throw new Error('Could not read Excel content')
  }
}

async function readWordContent(file: File): Promise<{ content: string; summary: string }> {
  try {
    const mammoth = (await import('mammoth')).default
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    const content = result.value
    const summary = content.slice(0, 100) + (content.length > 100 ? "..." : "")
    return { content, summary }
  } catch (error) {
    console.error('Error reading Word document:', error)
    throw new Error('Could not read Word document content')
  }
}

async function readTextContent(file: File): Promise<{ content: string; summary: string }> {
  try {
    const content = await file.text()
    const summary = content.slice(0, 100) + (content.length > 100 ? "..." : "")
    return { content, summary }
  } catch (error) {
    console.error('Error reading text file:', error)
    throw new Error('Could not read text file content')
  }
}

export async function processFile(file: File): Promise<ProcessedFile> {
  const type = file.type.toLowerCase()
  const metadata = {
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
    name: file.name,
    isReference: true // Always mark as reference material
  }

  try {
    // Handle text-based documents
    if (type === "text/plain") {
      const { content, summary } = await readTextContent(file)
      return {
        metadata: { ...metadata, content, summary }
      }
    }
    // Handle Word documents
    else if (type.includes("word") || type.includes("officedocument.wordprocessing")) {
      const { content, summary } = await readWordContent(file)
      return {
        metadata: { ...metadata, content, summary }
      }
    }
    // Handle PDF files
    else if (type === "application/pdf") {
      const { content, summary } = await readPdfContent(file)
      return {
        metadata: { ...metadata, content, summary }
      }
    }
    // Handle Excel files
    else if (type.includes("excel") || type.includes("spreadsheet") || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const { content, summary } = await readExcelContent(file)
      return {
        metadata: { ...metadata, content, summary }
      }
    }
    // Handle images
    else if (type.startsWith("image/")) {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/generate/analyze-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to analyze image: ${response.statusText}`)
      }

      const data = await response.json()
      const imageUrl = URL.createObjectURL(file)

      return {
        imageUrl,
        imageAnalysis: data.description,
        metadata
      }
    }

    // For unsupported files
    return {
      metadata: {
        ...metadata,
        error: "Unsupported file type"
      }
    }
  } catch (error) {
    console.error(`Error processing file ${file.name}:`, error)
    return {
      metadata: {
        ...metadata,
        error: error instanceof Error ? error.message : "Unknown error"
      }
    }
  }
}
  
  