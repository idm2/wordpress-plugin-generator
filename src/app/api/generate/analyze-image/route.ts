import { NextRequest, NextResponse } from "next/server"
import { config } from "@/config/env"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      console.error("Image analysis failed: No file provided")
      return NextResponse.json({ error: "No image file provided" }, { status: 400 })
    }

    // Check if it's an image
    const fileType = file.type || ''
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const isImage = fileType.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)
    
    if (!isImage) {
      console.error(`Image analysis failed: File is not an image (${fileType})`)
      return NextResponse.json({ error: "File is not an image" }, { status: 400 })
    }

    // Convert image to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString("base64")
    const mediaType = fileType || "image/jpeg" // Default to jpeg if no type

    // Use Claude exclusively for image analysis
    if (!config.ANTHROPIC_API_KEY) {
      console.error("Image analysis failed: Anthropic API key not configured")
      return NextResponse.json({ error: "Image analysis service not configured" }, { status: 500 })
    }

    console.log(`Processing image analysis for ${file.name} (${Math.round(file.size / 1024)}KB)`)

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307", // Using Haiku for faster responses and lower cost
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: "Describe what you see in this image concisely in 2-3 sentences. Focus on the main elements and their relationships.",
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      let errorMessage = `Image analysis failed: HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        console.error("Claude API error:", errorData);
        errorMessage = `Image analysis failed: ${errorData.error?.message || response.statusText}`;
      } catch (e) {
        console.error("Failed to parse error response:", e);
      }
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const data = await response.json()
    
    // Extract the text from the response
    let description = "No description available"
    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      const textContent = data.content.find((item: any) => item.type === "text")
      if (textContent && textContent.text) {
        description = textContent.text
      }
    }

    console.log(`Successfully analyzed image: ${file.name} (${description.substring(0, 50)}...)`)
    return NextResponse.json({ description })
  } catch (error) {
    console.error("Error analyzing image:", error)
    return NextResponse.json(
      { error: `Error analyzing image: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    )
  }
}

