import { NextResponse } from "next/server"
import { config } from "../../../../config/env"
import type { ChatMessage } from "@/types/shared"
import OpenAI from "openai"

interface ApiResponse {
  content: string
}

async function handleDeepSeekRequest(messages: ChatMessage[]): Promise<ApiResponse> {
  if (!config.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured. Please check your environment variables.")
  }

  try {
    // First try using fetch to test the connection
    const testResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: 0.7,
        stream: false
      }),
    })

    const responseData = await testResponse.json().catch(() => ({}))
    console.log("DeepSeek API Response:", {
      status: testResponse.status,
      statusText: testResponse.statusText,
      data: responseData
    })

    if (!testResponse.ok) {
      throw new Error(`DeepSeek API error: ${testResponse.status} - ${JSON.stringify(responseData)}`)
    }

    if (!responseData.choices?.[0]?.message?.content) {
      throw new Error("Invalid response format from DeepSeek API")
    }

    return { content: responseData.choices[0].message.content }
  } catch (error) {
    console.error("DeepSeek API error details:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

async function handleQwenRequest(messages: ChatMessage[]): Promise<ApiResponse> {
  if (!config.QWEN_API_KEY) {
    throw new Error("QWEN_API_KEY is not configured. Please check your environment variables.")
  }

  try {
    const response = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.QWEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: 0.7,
        stream: false
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`QWEN API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    if (!data.choices?.[0]?.message?.content) {
      throw new Error("Invalid response format from QWEN API")
    }

    return { content: data.choices[0].message.content }
  } catch (error) {
    console.error("QWEN API error:", error)
    throw error
  }
}

async function handleOpenAIRequest(messages: ChatMessage[]): Promise<ApiResponse> {
  if (!config.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Please check your environment variables.")
  }

  const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
  })

  try {
    const response = await openai.chat.completions.create({
      model: config.OPENAI_API_MODEL,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
    })

    if (!response.choices?.[0]?.message?.content) {
      throw new Error("Invalid response format from OpenAI API")
    }

    return { content: response.choices[0].message.content }
  } catch (error) {
    console.error("OpenAI API error:", error)
    throw error
  }
}

export async function POST(req: Request) {
  try {
    const { messages, model = "openai" } = await req.json()

    let result: ApiResponse

    switch (model) {
      case "deepseek":
        result = await handleDeepSeekRequest(messages)
        break
      case "qwen":
        result = await handleQwenRequest(messages)
        break
      case "openai":
        result = await handleOpenAIRequest(messages)
        break
      default:
        throw new Error(`Unsupported model: ${model}`)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}

