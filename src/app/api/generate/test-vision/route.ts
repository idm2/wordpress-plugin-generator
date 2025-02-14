import { NextResponse } from "next/server"
import OpenAI from "openai"
import { config } from "../../../../../config/env"

export async function GET() {
  if (!config.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 })
  }

  const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
  })

  try {
    // First, list all available models
    const models = await openai.models.list()
    const availableModels = models.data.map(model => model.id)
    const hasVisionAccess = availableModels.includes("gpt-4-vision-preview")

    // Try to make a simple vision API call
    let visionTest = null
    if (hasVisionAccess) {
      try {
        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "What's in this image?" },
                {
                  type: "image_url",
                  image_url: {
                    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
                  }
                }
              ]
            }
          ],
          max_tokens: 100
        })
        visionTest = "Vision API call successful"
      } catch (error: any) {
        visionTest = `Vision API test failed: ${error.message}`
      }
    }

    return NextResponse.json({
      success: true,
      hasVisionAccess,
      availableModels,
      visionTest,
      apiKeyPrefix: config.OPENAI_API_KEY?.slice(0, 7), // Just show the first few chars to verify key
      message: hasVisionAccess 
        ? `You have access to GPT-4 Vision! ${visionTest ? `\nTest result: ${visionTest}` : ''}`
        : "You don't have access to GPT-4 Vision. Available models: " + availableModels.join(", "),
    })
  } catch (error: any) {
    console.error("Error checking vision access:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to check vision access",
        success: false,
      },
      { status: 500 },
    )
  }
} 