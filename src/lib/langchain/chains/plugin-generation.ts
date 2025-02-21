import { BaseCallbackHandler } from "@langchain/core/callbacks/base"
import { getModel, type ModelType } from "../models/model-config"
import { logger } from "../utils/logger"
import { usageTracker } from "../utils/usage-tracker"
import { handleAPIError, LLMError } from "../utils/error-tracker"
import { AIMessage } from "@langchain/core/messages"

interface PluginDetails {
  name: string
  description: string
  version: string
  author: string
  functionality: string
}

export class PluginGenerationChain {
  private model
  private handler: BaseCallbackHandler
  private modelType: ModelType

  constructor(modelType: ModelType, handler: BaseCallbackHandler) {
    this.model = getModel(modelType)
    this.handler = handler
    this.modelType = modelType
  }

  async generatePlugin(details: PluginDetails) {
    const requestId = usageTracker.startRequest(this.modelType)
    
    try {
      logger.info("Starting plugin generation", { details })

      const response = await this.model.invoke(
        [
          {
            role: "system",
            content: `You are a WordPress plugin development expert. Generate a WordPress plugin based on the following details:
              - Plugin Name: ${details.name}
              - Description: ${details.description}
              - Version: ${details.version}
              - Author: ${details.author}
              
              The plugin should implement the following functionality:
              ${details.functionality}
              
              Generate the plugin code following WordPress coding standards and best practices.
              Include proper error handling, security measures, and documentation.`
          }
        ],
        {
          callbacks: [this.handler],
        }
      )

      // Since we're using streaming, we don't have usage stats
      // We'll estimate based on input/output length
      const estimatedUsage = {
        prompt: Math.ceil(details.functionality.length / 4),
        completion: Math.ceil(response.content.length / 4),
        total: 0
      }
      estimatedUsage.total = estimatedUsage.prompt + estimatedUsage.completion

      usageTracker.completeRequest(this.modelType, estimatedUsage)

      logger.info("Plugin generation completed", {
        requestId,
        estimatedUsage
      })

      return response.content

    } catch (error) {
      const llmError = new LLMError(
        error instanceof Error ? error.message : "Unknown error occurred",
        this.modelType,
        { details }
      )
      
      usageTracker.failRequest(this.modelType, llmError.message)
      logger.error("Plugin generation failed", {
        requestId,
        error: llmError
      })
      
      throw handleAPIError(llmError)
    }
  }
} 