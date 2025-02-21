"use client"

import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { config } from "@/config/env"

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const availableModels = [
    { id: "openai", name: "OpenAI GPT-4", requiresKey: config.OPENAI_API_KEY },
    { id: "anthropic", name: "Claude 3", requiresKey: config.ANTHROPIC_API_KEY },
    { id: "deepseek", name: "DeepSeek", requiresKey: config.DEEPSEEK_API_KEY },
    { id: "qwen", name: "QWEN", requiresKey: config.QWEN_API_KEY },
  ]

  const enabledModels = availableModels.filter(model => model.requiresKey)

  return (
    <div className="space-y-2">
      <Select
        value={selectedModel}
        onValueChange={(value) => onModelChange(value)}
      >
        <SelectTrigger className="w-[200px] bg-white">
          <SelectValue placeholder="Select Model" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          {enabledModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              {model.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedModel === "deepseek" && (
        <Alert variant="destructive" className="bg-yellow-50 text-yellow-800 border-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            DeepSeek is currently unavailable due to resource constraints on the DeepSeek platform
          </AlertDescription>
        </Alert>
      )}

      {selectedModel === "qwen" && (
        <Alert variant="destructive" className="bg-yellow-50 text-yellow-800 border-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            QWEN is still under development
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

