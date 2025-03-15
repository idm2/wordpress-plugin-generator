import { NextRequest, NextResponse } from 'next/server'

/**
 * API route to check if a plugin exists on the WordPress site
 * This is used to determine whether to use the update or install endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const { apiKey, siteUrl, pluginSlug } = await req.json()
    
    if (!apiKey || !siteUrl || !pluginSlug) {
      return NextResponse.json(
        { success: false, message: 'API key, site URL, and plugin slug are required' },
        { status: 400 }
      )
    }
    
    console.log(`Checking if plugin ${pluginSlug} exists on WordPress site: ${siteUrl}`);
    
    // Construct the WordPress REST API endpoint URL
    const wpApiUrl = `${siteUrl}/wp-json/plugin-generator/v1/check-plugin-exists`
    
    // Make request to WordPress site
    const response = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        api_key: apiKey,
        plugin_slug: pluginSlug
      }),
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'Failed to check if plugin exists on WordPress site',
          exists: false
        },
        { status: response.status }
      )
    }
    
    return NextResponse.json({
      success: true,
      exists: data.exists,
      plugin_info: data.plugin_info
    })
  } catch (error) {
    console.error('WordPress plugin check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        exists: false
      },
      { status: 500 }
    )
  }
} 