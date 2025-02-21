import { ChatOpenAI } from "@langchain/openai"
import { ChatAnthropic } from "@langchain/anthropic"
import { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { config } from "@/config/env"

export type ModelType = "openai" | "anthropic" | "deepseek" | "qwen"

export function getModel(type: ModelType): BaseChatModel {
  switch (type) {
    case "openai":
      if (!config.OPENAI_API_KEY) {
        throw new Error("OpenAI API key not configured")
      }
      return new ChatOpenAI({
        modelName: "gpt-4-turbo-preview",
        temperature: 0.7,
        openAIApiKey: config.OPENAI_API_KEY,
        streaming: true,
      })
    case "anthropic":
      if (!config.ANTHROPIC_API_KEY) {
        throw new Error("Anthropic API key not configured")
      }
      return new ChatAnthropic({
        modelName: "claude-3-sonnet-20240229",
        temperature: 0.7,
        anthropicApiKey: config.ANTHROPIC_API_KEY,
        streaming: true,
        maxTokens: 4096
      })
    case "deepseek":
      // TODO: Implement DeepSeek when available in LangChain
      throw new Error("DeepSeek integration not yet implemented")
    case "qwen":
      // TODO: Implement Qwen when available in LangChain
      throw new Error("Qwen integration not yet implemented")
    default:
      throw new Error(`Unsupported model type: ${type}`)
  }
} 