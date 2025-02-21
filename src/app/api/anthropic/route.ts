import { NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import { config } from "@/config/env";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const anthropic = new Anthropic({
      apiKey: config.ANTHROPIC_API_KEY,
    });

    // Convert messages to Anthropic format
    const systemMessage = messages.find(msg => msg.role === "system");
    const userMessages = messages.filter(msg => msg.role === "user" || msg.role === "assistant");

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      temperature: 0.7,
      system: systemMessage?.content || "You are an expert WordPress plugin developer. Generate high-quality WordPress plugin code.",
      messages: userMessages.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      })),
    });

    // Return the content from the response
    return NextResponse.json({ response: response.content[0].text }, { status: 200 });
  } catch (error) {
    console.error("Anthropic API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" }, 
      { status: 500 }
    );
  }
} 