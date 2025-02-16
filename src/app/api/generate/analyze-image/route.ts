import { OpenAI } from "openai"
import { NextResponse } from "next/server"
import { config } from "../../../../../config/env"

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY || "",
  dangerouslyAllowBrowser: true
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

    console.log("Analyzing image with OpenAI Vision API...")
    console.log("Model:", config.OPENAI_VISION_MODEL)
    console.log("Using API key starting with:", config.OPENAI_API_KEY.substring(0, 10) + "...")

    // Call OpenAI Vision API with the correct model
    const response = await openai.chat.completions.create({
      model: "gpt-4o-2024-05-13",  // Using GPT-4o model for better image analysis
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing images and extracting text content. When you see text in an image that contains a question or request, focus on understanding and returning that specific request."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Look at this image carefully and tell me what the user is asking for or requesting. If you see a specific question or request in the text, return that exact request. Focus on understanding the user's intent.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${file.type};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0,
    })

    const description = response.choices[0]?.message?.content || "No text found in image"
    console.log("OpenAI Response:", description)

    return NextResponse.json({
      success: true,
      description,
    })
  } catch (error: any) {
    console.error("Error analyzing image:", error)
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      response: error.response?.data
    })
    
    // Enhanced error handling
    if (error.message?.includes("model_not_found")) {
      return NextResponse.json({
        error: "The specified model is not available. Using gpt-4-turbo-preview for image analysis.",
        success: false,
      }, { status: 401 })
    }
    
    if (error.message?.includes("invalid_api_key")) {
      return NextResponse.json({
        error: "Invalid API key. Please check your OpenAI API key configuration.",
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

