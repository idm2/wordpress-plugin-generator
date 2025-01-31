import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  console.log("\n=== Starting API Request ===")
  console.log("Timestamp:", new Date().toISOString())
  
  try {
    // Log request details
    console.log("\n1. Request Details:")
    console.log("Method:", req.method)
    console.log("Headers:", Object.fromEntries(req.headers.entries()))
    
    // Parse and log request body
    const body = await req.json()
    console.log("\n2. Request Body:")
    console.log(JSON.stringify(body, null, 2))
    
    const { messages } = body

    // Check API key
    console.log("\n3. Environment Check:")
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("❌ ANTHROPIC_API_KEY is missing")
      return Response.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      )
    }
    console.log("✓ ANTHROPIC_API_KEY present:", `${process.env.ANTHROPIC_API_KEY.slice(0, 5)}...`)

    try {
      // Initialize Anthropic client
      console.log("\n4. Initializing Anthropic Client:")
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
      console.log("✓ Anthropic client initialized")

      // Validate message structure
      console.log("\n5. Message Validation:")
      if (!messages?.[0]?.content?.[0]?.text) {
        console.error("❌ Invalid message format:", messages)
        return Response.json(
          { error: "Invalid message format" },
          { status: 400 }
        )
      }
      console.log("✓ Message format valid")

      // Extract and log message
      const messageText = messages[0].content[0].text
      console.log("\n6. Message Content Preview:")
      console.log("First 200 chars:", messageText.substring(0, 200))

      // Prepare API request
      console.log("\n7. Preparing Anthropic API Request:")
      const requestParams = {
        model: "claude-3-sonnet-20240229",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: messageText
          }
        ],
        system: "You are a WordPress plugin development expert. Generate clean, secure, and well-documented code."
      }
      console.log("Request parameters:", JSON.stringify(requestParams, null, 2))

      // Make API call
      console.log("\n8. Making Anthropic API Call...")
      let response
      try {
        response = await anthropic.messages.create(requestParams)
        console.log("\n9. Raw API Response:")
        console.log(JSON.stringify(response, null, 2))
      } catch (apiCallError) {
        console.error("\n❌ API Call Failed:")
        console.error("Error type:", apiCallError.constructor.name)
        console.error("Error message:", apiCallError.message)
        console.error("Full error:", apiCallError)
        throw apiCallError
      }

      // Validate response
      console.log("\n10. Validating Response:")
      if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
        console.error("❌ Invalid response structure:", response)
        return Response.json(
          { error: "Invalid response structure from Anthropic API" },
          { status: 500 }
        )
      }
      console.log("✓ Response structure valid")

      // Extract content
      const textContent = response.content[0].text
      if (!textContent) {
        console.error("❌ No text content in response")
        return Response.json(
          { error: "No text content in response" },
          { status: 500 }
        )
      }

      // Log success
      console.log("\n11. Success:")
      console.log("Content length:", textContent.length)
      console.log("Content preview:", textContent.substring(0, 200))

      console.log("\n=== Request Complete ===")
      return Response.json({ content: textContent })

    } catch (apiError) {
      console.error("\n❌ Anthropic API Error:")
      console.error("Error type:", apiError.constructor.name)
      console.error("Error message:", apiError.message)
      console.error("Full error object:", apiError)
      if (apiError.response) {
        console.error("API Response:", apiError.response)
      }
      return Response.json(
        { 
          error: apiError instanceof Error ? apiError.message : "Anthropic API error",
          details: process.env.NODE_ENV === 'development' ? apiError : undefined
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("\n❌ General Error:")
    console.error("Error type:", error.constructor.name)
    console.error("Error message:", error.message)
    console.error("Full error:", error)
    return Response.json(
      { 
        error: "Failed to generate code",
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

