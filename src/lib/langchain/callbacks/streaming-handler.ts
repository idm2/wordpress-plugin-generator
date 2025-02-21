import { BaseCallbackHandler } from "@langchain/core/callbacks/base"
import { LLMResult } from "@langchain/core/outputs"

export class StreamingHandler extends BaseCallbackHandler {
  name = "streaming_handler"
  
  private writer: WritableStreamDefaultWriter<any>
  private encoder: TextEncoder

  constructor(writer: WritableStreamDefaultWriter<any>) {
    super()
    this.writer = writer
    this.encoder = new TextEncoder()
  }

  async handleLLMNewToken(token: string) {
    await this.writer.write(
      this.encoder.encode(`data: ${JSON.stringify({ content: token })}\n\n`)
    )
  }

  async handleLLMEnd(output: LLMResult) {
    await this.writer.close()
  }

  async handleLLMError(err: Error) {
    await this.writer.write(
      this.encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    )
    await this.writer.close()
  }
} 