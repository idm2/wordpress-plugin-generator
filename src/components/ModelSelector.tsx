"use client"

import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (model: string) => void
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      <Select
        value={selectedModel}
        onValueChange={(value) => onModelChange(value)}
      >
        <SelectTrigger className="w-[180px] bg-white">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectGroup>
            <SelectLabel>AI Models</SelectLabel>
            <SelectItem value="openai">OpenAI GPT-4</SelectItem>
            <SelectItem value="qwen">QWEN</SelectItem>
            <SelectItem value="deepseek">DeepSeek</SelectItem>
          </SelectGroup>
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

