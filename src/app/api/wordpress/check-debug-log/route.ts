import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { apiKey, siteUrl, pluginSlug, filter_options } = await req.json()
    
    if (!apiKey || !siteUrl) {
      return NextResponse.json(
        { success: false, message: 'API key and site URL are required' },
        { status: 400 }
      )
    }
    
    // Construct the WordPress REST API endpoint URL
    const wpApiUrl = `${siteUrl}/wp-json/plugin-generator/v1/check-debug-log`
    
    console.log(`Checking debug log for WordPress site: ${siteUrl}`);
    if (pluginSlug) {
      console.log(`Filtering for plugin: ${pluginSlug}`);
    }
    
    // Set default filter options if not provided
    const defaultFilterOptions = {
      filter_by_plugin: !!pluginSlug,
      filter_by_time: true,
      // Default to last 10 minutes
      time_threshold: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      max_lines: 200
    };
    
    // Merge provided filter options with defaults
    const finalFilterOptions = {
      ...defaultFilterOptions,
      ...(filter_options || {})
    };
    
    console.log('Using filter options:', finalFilterOptions);
    
    // Make request to WordPress site
    const response = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        api_key: apiKey,
        plugin_slug: pluginSlug, // Pass the plugin slug to filter errors
        filter_options: finalFilterOptions
      }),
      // Add a longer timeout for slow connections
      signal: AbortSignal.timeout(30000) // 30 seconds timeout
    })
    
    // Handle empty responses
    let data;
    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'WordPress site returned an empty response',
          details: 'The WordPress site did not return any data. This could be due to a timeout, a server error, or an issue with the WordPress connector plugin.'
        },
        { status: 500 }
      );
    }
    
    try {
      // Try to parse as JSON if there's content
      data = responseText ? JSON.parse(responseText) : { message: 'No response data' };
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.log('Raw response:', responseText);
      
      // Return the raw text as part of the error
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to parse WordPress response',
          details: `Raw response: ${responseText.substring(0, 1000)}...`,
          error_type: 'JSONParseError'
        },
        { status: 500 }
      );
    }
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: data.message || 'Failed to check debug log',
          details: data.details || null
        },
        { status: response.status }
      )
    }
    
    // If we have a plugin slug, filter the debug log for plugin-specific errors
    let pluginErrors = null;
    if (pluginSlug && data.debug_log) {
      const lines = data.debug_log.split('\n');
      const filteredLines = lines.filter((line: string) => 
        line.toLowerCase().includes(pluginSlug.toLowerCase())
      );
      
      if (filteredLines.length > 0) {
        pluginErrors = filteredLines.join('\n');
      }
    }
    
    return NextResponse.json({
      success: true,
      debug_log: data.debug_log || null,
      plugin_errors: pluginErrors,
      has_errors: data.has_errors || false,
      error_count: data.error_count || 0
    })
  } catch (error) {
    console.error('WordPress debug log check error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    )
  }
} 