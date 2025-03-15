import { NextRequest, NextResponse } from 'next/server'

/**
 * Catch-all API route for WordPress operations
 * This handles multiple operations including checking if a plugin exists
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { operation: string[] } }
) {
  try {
    const operation = params.operation[0];
    console.log(`WordPress API operation: ${operation}`);
    
    // Parse the request body
    const body = await req.json();
    const { apiKey, siteUrl, pluginSlug, pluginZip } = body;
    
    // Validate common required fields
    if (!apiKey || !siteUrl) {
      return NextResponse.json(
        { success: false, message: 'API key and site URL are required' },
        { status: 400 }
      );
    }
    
    // Handle different operations
    switch (operation) {
      case 'check-plugin-exists':
        return handleCheckPluginExists(apiKey, siteUrl, pluginSlug);
        
      case 'plugin-exists':
        return handleCheckPluginExists(apiKey, siteUrl, pluginSlug);
        
      default:
        return NextResponse.json(
          { success: false, message: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('WordPress API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Handler for checking if a plugin exists
 */
async function handleCheckPluginExists(apiKey: string, siteUrl: string, pluginSlug: string) {
  if (!pluginSlug) {
    return NextResponse.json(
      { success: false, message: 'Plugin slug is required' },
      { status: 400 }
    );
  }
  
  console.log(`Checking if plugin ${pluginSlug} exists on WordPress site: ${siteUrl}`);
  
  try {
    // Construct the WordPress REST API endpoint URL
    const wpApiUrl = `${siteUrl}/wp-json/plugin-generator/v1/check-plugin-exists`;
    
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
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'Failed to check if plugin exists on WordPress site',
          exists: false
        },
        { status: response.status }
      );
    }
    
    return NextResponse.json({
      success: true,
      exists: data.exists,
      plugin_info: data.plugin_info
    });
  } catch (error) {
    console.error('WordPress plugin check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        exists: false
      },
      { status: 500 }
    );
  }
} 