"use client"

import { useEffect, useState } from "react"

interface OllamaModel {
  name: string
  size: string
  digest: string
  modified_at: string
}

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

async function listModels(): Promise<OllamaModel[]> {
  try {
    const response = await fetch("http://localhost:11434/api/tags")
    if (!response.ok) {
      throw new Error("Failed to fetch models")
    }
    const data = await response.json()
    return data.models || []
  } catch (error) {
    console.error("Error fetching models:", error)
    return [] // Return empty array instead of throwing
  }
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<OllamaModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchModels() {
      try {
        const availableModels = await listModels()
        setModels(availableModels)

        // If no model is selected and we have models, select the first one
        if (!selectedModel && availableModels.length > 0) {
          onModelChange(availableModels[0].name)
        }
      } catch (err) {
        setError("Failed to fetch models. Is Ollama running?")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchModels()
  }, [selectedModel, onModelChange])

  if (loading) {
    return <div>Loading models...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <select
      value={selectedModel}
      onChange={(e) => onModelChange(e.target.value)}
      className="w-[180px] rounded-md border border-input bg-background px-3 py-2"
    >
      <option value="anthropic">Anthropic Claude</option>
      <option value="openai">OpenAI</option>
      {models.map((model) => (
        <option key={model.digest} value={model.name}>
          {model.name}
        </option>
      ))}
    </select>
  )
}

