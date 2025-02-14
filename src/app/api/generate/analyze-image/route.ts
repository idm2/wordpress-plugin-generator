import OpenAI from "openai"
import { NextResponse } from "next/server"
import { config } from "../../../../../config/env"

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY || "",
})

export async function POST(req: Request) {
  if (!config.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString("base64")

    // Call OpenAI Vision API with improved prompt
    const response = await openai.chat.completions.create({
      model: config.OPENAI_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image in detail. If it contains code, extract and format it. If it contains UI elements or text, describe their location and content. Be specific and detailed.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${base64Image}`,
                detail: "high" // Use high detail mode for better analysis
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    })

    const description = response.choices[0]?.message?.content || "No description generated"

    return NextResponse.json({
      success: true,
      description,
    })
  } catch (error: any) {
    console.error("Error analyzing image:", error)
    
    // Handle specific error cases
    if (error.message?.includes("model_not_found") || error.message?.includes("invalid_api_key")) {
      return NextResponse.json({
        error: "There was an issue with the OpenAI configuration. Please check your API key and model settings.",
        success: false,
      }, { status: 401 })
    }
    
    if (error.message?.includes("invalid_image")) {
      return NextResponse.json({
        error: "The image could not be processed. Please ensure it's a valid image file (PNG, JPEG, WEBP, or non-animated GIF) under 20MB.",
        success: false,
      }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: error.message || "Failed to analyze image",
        success: false,
      },
      { status: 500 },
    )
  }
}

