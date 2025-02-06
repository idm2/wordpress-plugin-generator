import type { ChatMessage } from "@/types/shared"

export interface OllamaModel {
  name: string
  size: string
  digest: string
  modified_at: string
}

export async function listModels(): Promise<OllamaModel[]> {
  try {
    const response = await fetch("http://localhost:11434/api/tags")
    if (!response.ok) {
      throw new Error("Failed to fetch models")
    }
    const data = await response.json()
    return data.models || []
  } catch (error) {
    console.error("Error fetching models:", error)
    return [] // Return empty array instead of throwing to handle offline case gracefully
  }
}

export async function generateResponse(
  model: string,
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
): Promise<void> {
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
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to generate response")
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response stream available")
    }

    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split("\n").filter(Boolean)

      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          if (data.message?.content) {
            onChunk(data.message.content)
          }
        } catch (e) {
          console.error("Error parsing chunk:", e)
        }
      }
    }
  } catch (error) {
    console.error("Error generating response:", error)
    throw error
  }
}

