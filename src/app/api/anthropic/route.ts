import { NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import { config } from "@/config/env";

export const runtime = 'edge';

interface Message {
  role: string;
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    if (!config.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }

    const anthropic = new Anthropic({
      apiKey: config.ANTHROPIC_API_KEY,
    });

    // Convert messages to Anthropic format
    const systemMessage = messages.find((msg: Message) => msg.role === "system");
    const userMessages = messages.filter((msg: Message) => msg.role === "user" || msg.role === "assistant");

    console.log("Anthropic messages:", userMessages);

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const stream = await anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 4096,
            temperature: 0.7,
            system: systemMessage?.content || "You are an expert WordPress plugin developer. Generate high-quality WordPress plugin code.",
            messages: userMessages.map((msg: Message) => ({
              role: msg.role as "user" | "assistant",
              content: msg.content
            })),
            stream: true,
          });

          // Send the SSE headers
          controller.enqueue(encoder.encode("event: start\ndata: {}\n\n"));

          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
              const text = chunk.delta.text;
              // Send the chunk as an SSE event
              controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify({ text })}\n\n`));
            }
          }

          // Send the end event
          controller.enqueue(encoder.encode("event: end\ndata: {}\n\n"));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" })}\n\n`)
          );
          controller.close();
        }
      }
    });

    const encoder = new TextEncoder();
    
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Anthropic API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" }, 
      { status: 500 }
    );
  }
} 