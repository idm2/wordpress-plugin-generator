import OpenAI from "openai"
import { NextResponse } from "next/server"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
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
      model: "gpt-4-vision-preview",
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
    return NextResponse.json(
      {
        error: error.message || "Failed to analyze image",
        success: false,
      },
      { status: 500 },
    )
  }
}

