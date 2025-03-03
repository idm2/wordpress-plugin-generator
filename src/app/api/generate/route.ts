import { NextRequest, NextResponse } from "next/server"
import { config } from "@/config/env"
import { ChatMessage } from "@/types/shared"
import { Readable } from "stream"

interface ApiResponse {
  stream: ReadableStream<Uint8Array>
  response: Response
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 })
    }

    if (!model) {
      return NextResponse.json({ error: "Model is required" }, { status: 400 })
    }

    // Create a new TransformStream
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()

    const writeChunk = async (chunk: string) => {
      await writer.write(encoder.encode("data: " + JSON.stringify({ content: chunk }) + "\n\n"))
    }

    const writeError = async (errorMessage: string) => {
      await writer.write(
        encoder.encode("data: " + JSON.stringify({ error: errorMessage }) + "\n\n")
      )
    }

    const response = new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })

    try {
      switch (model) {
        case "openai":
          await handleOpenAIRequest(messages, writeChunk, writeError)
          break
        case "anthropic":
          await handleAnthropicRequest(messages, writeChunk, writeError)
          break
        case "deepseek":
          await handleDeepSeekRequest(messages, writeChunk, writeError)
          break
        default:
          throw new Error("Unsupported model: " + model)
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

async function handleOpenAIRequest(
  messages: ChatMessage[],
  writeChunk: (chunk: string) => Promise<void>,
  writeError: (errorMessage: string) => Promise<void>
): Promise<void> {
  if (!config.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Please check your environment variables.")
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + config.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: config.OPENAI_API_MODEL,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: 0.7,
        stream: true,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error("OpenAI API error: " + (error.error?.message || "Unknown error"))
    }

    if (!response.body) {
      throw new Error("OpenAI API response body is null")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine || trimmedLine === "data: [DONE]") continue

        try {
          const data = trimmedLine.replace(/^data: /, "")
          const json = JSON.parse(data)
          const content = json.choices[0]?.delta?.content || ""
          if (content) {
            await writeChunk(content)
          }
        } catch (error) {
          console.error("Error parsing OpenAI stream:", error)
        }
      }
    }
  } catch (error) {
    console.error("OpenAI API error:", error)
    throw error
  }
}

async function handleAnthropicRequest(
  messages: ChatMessage[],
  writeChunk: (chunk: string) => Promise<void>,
  writeError: (errorMessage: string) => Promise<void>
): Promise<void> {
  if (!config.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured. Please check your environment variables.")
  }

  try {
    // Convert messages to Anthropic format
    const anthropicMessages = []
    for (const msg of messages) {
      anthropicMessages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      })
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        messages: anthropicMessages,
        temperature: 0.7,
        stream: true,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error("Anthropic API error: " + (error.error?.message || "Unknown error"))
    }

    if (!response.body) {
      throw new Error("Anthropic API response body is null")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine || trimmedLine === "data: [DONE]") continue

        try {
          const data = trimmedLine.replace(/^data: /, "")
          if (data === "") continue

          const json = JSON.parse(data)
          const content = json.delta?.text || ""
          if (content) {
            await writeChunk(content)
          }
        } catch (error) {
          console.error("Error parsing Anthropic stream:", error)
        }
      }
    }
  } catch (error) {
    console.error("Anthropic API error:", error)
    throw error
  }
}

async function handleDeepSeekRequest(
  messages: ChatMessage[],
  writeChunk: (chunk: string) => Promise<void>,
  writeError: (errorMessage: string) => Promise<void>
): Promise<void> {
  if (!config.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is not configured. Please check your environment variables.")
  }

  console.log("Using DeepSeek API key:", config.DEEPSEEK_API_KEY.substring(0, 5) + "..." + config.DEEPSEEK_API_KEY.substring(config.DEEPSEEK_API_KEY.length - 5));

  try {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Make a streaming request directly without the test request first
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + config.DEEPSEEK_API_KEY
      },
      body: JSON.stringify({
        model: "deepseek-coder",
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: 0.7,
        stream: true,
        max_tokens: 4000
      }),
      signal: controller.signal
    }).catch(error => {
      if (error.name === 'AbortError') {
        throw new Error("DeepSeek API request timed out after 30 seconds");
      }
      throw error;
    });

    // Clear the timeout
    clearTimeout(timeoutId);

    // Log the response status
    console.log("DeepSeek API response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("DeepSeek API error response:", errorText);
      
      let errorMessage = "DeepSeek API error: " + response.status;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage += " - " + (errorJson.error?.message || errorJson.error || errorText);
      } catch (e) {
        errorMessage += " - " + errorText;
      }
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error("DeepSeek API response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      console.log("Received chunk:", chunk.substring(0, 50) + (chunk.length > 50 ? "..." : ""));
      
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === "data: [DONE]") continue;

        try {
          const data = trimmedLine.replace(/^data: /, "");
          if (data === "") continue;

          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content || "";
          if (content) {
            await writeChunk(content);
          }
        } catch (error) {
          console.error("Error parsing DeepSeek stream:", error);
        }
      }
    }
  } catch (error) {
    console.error("DeepSeek API error:", error);
    throw error;
  }
}

