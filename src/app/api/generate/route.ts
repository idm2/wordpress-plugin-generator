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

  const maxRetries = 3;
  const timeout = 30000; // 30 seconds timeout
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting Qwen API request (attempt ${attempt}/${maxRetries}) with key:`, config.QWEN_API_KEY.substring(0, 10) + "...")
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const requestBody = {
        model: "qwen-plus",
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: 0.7,
        stream: false
      }
      
      console.log("Request body:", JSON.stringify(requestBody, null, 2))

      const response = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.QWEN_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId);
      
      console.log("Qwen API Response Status:", response.status)
      
      const responseData = await response.json()
      console.log("Qwen API Response:", JSON.stringify(responseData, null, 2))

      if (!response.ok) {
        throw new Error(`QWEN API error: ${response.status} - ${JSON.stringify(responseData)}`)
      }

      if (!responseData.choices?.[0]?.message?.content) {
        console.error("Invalid Qwen API response format:", responseData)
        throw new Error("Invalid response format from QWEN API")
      }

      return { content: responseData.choices[0].message.content }
    } catch (error) {
      console.error(`Qwen API error on attempt ${attempt}:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      })
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Request timed out after ${timeout}ms`)
      }
      
      // If this was our last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(`Failed to get response from Qwen API after ${maxRetries} attempts. Last error: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw new Error("Failed to get response from Qwen API")
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

    // Create a new TransformStream for streaming
    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Start the response stream
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

    // Handle different models
    const writeChunk = async (chunk: string) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`))
    }

    const writeError = async (error: string) => {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error })}\n\n`))
      await writer.close()
    }

    // Process based on model selection
    try {
      switch (model) {
        case "openai": {
          if (!config.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not configured")
          }

          const openai = new OpenAI({
            apiKey: config.OPENAI_API_KEY,
          })

          const completion = await openai.chat.completions.create({
            model: config.OPENAI_API_MODEL,
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            stream: true,
          })

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              await writeChunk(content)
            }
          }
          break
        }
        
        case "deepseek": {
          if (!config.DEEPSEEK_API_KEY) {
            throw new Error("DEEPSEEK_API_KEY is not configured")
          }

          const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
              stream: true
            }),
          })

          if (!response.ok) {
            throw new Error(`DeepSeek API error: ${response.status}`)
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error("No response stream available")

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n').filter(Boolean)
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6))
                if (data.choices?.[0]?.delta?.content) {
                  await writeChunk(data.choices[0].delta.content)
                }
              }
            }
          }
          break
        }

        case "qwen": {
          if (!config.QWEN_API_KEY) {
            throw new Error("QWEN_API_KEY is not configured")
          }

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
              stream: true
            }),
          })

          if (!response.ok) {
            throw new Error(`Qwen API error: ${response.status}`)
          }

          const reader = response.body?.getReader()
          if (!reader) throw new Error("No response stream available")

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n').filter(Boolean)
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6))
                if (data.choices?.[0]?.delta?.content) {
                  await writeChunk(data.choices[0].delta.content)
                }
              }
            }
          }
          break
        }

        default:
          throw new Error(`Unsupported model: ${model}`)
      }

      await writer.close()
    } catch (error) {
      await writeError(error instanceof Error ? error.message : "Unknown error occurred")
    }

    return response
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    )
  }
}

