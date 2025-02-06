import { NextResponse } from "next/server"
import type { ChatMessage, ApiResponse } from "@/types/shared"

async function handleAnthropicRequest(messages: ChatMessage[]): Promise<ApiResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured")
  }

  const systemMessage = messages.find((m) => m.role === "system")?.content || ""
  const userMessage = messages.find((m) => m.role === "user")?.content || ""

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2024-01-01",
      },
      body: JSON.stringify({
        model: "claude-2",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `${systemMessage}\n\n${userMessage}`,
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${JSON.stringify(data)}`)
    }

    if (!data.content?.[0]?.text) {
      throw new Error("Invalid response format from Anthropic API")
    }

    return { content: data.content[0].text }
  } catch (error) {
    console.error("Anthropic API error:", error)
    throw error
  }
}

async function handleOllamaRequest(model: string, messages: ChatMessage[]): Promise<ApiResponse> {
  try {
    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Ollama API error: ${JSON.stringify(data)}`)
    }

    if (!data.message?.content) {
      throw new Error("Invalid response format from Ollama API")
    }

    return { content: data.message.content }
  } catch (error) {
    if (error instanceof Error && error.message.includes("fetch failed")) {
      throw new Error("Failed to connect to Ollama. Is it running on localhost:11434?")
    }
    console.error("Ollama API error:", error)
    throw error
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body?.messages || !Array.isArray(body.messages) || !body.model) {
      return NextResponse.json({ error: "Invalid request format: missing messages or model" }, { status: 400 })
    }

    const { messages, model } = body

    try {
      let result: ApiResponse

      if (model === "anthropic") {
        result = await handleAnthropicRequest(messages)
      } else {
        result = await handleOllamaRequest(model, messages)
      }

      return NextResponse.json(result)
    } catch (error) {
      console.error("API error:", error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unknown error occurred" },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Request parsing error:", error)
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
  }
}

