import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { api_key, siteUrl, enableDebugging, verify_only = false } = await req.json()
    
    if (!api_key || !siteUrl) {
      return NextResponse.json(
        { success: false, message: 'API key and site URL are required' },
        { status: 400 }
      )
    }
    
    // Construct the WordPress REST API endpoint URL
    const wpApiUrl = `${siteUrl}/wp-json/plugin-generator/v1/validate`
    
    // Debug settings are now only used for enabling debug log reading
    // We no longer attempt to modify wp-config.php
    const debugSettings = enableDebugging ? {
      read_debug_log: true,
      check_for_errors: true
    } : null;
    
    console.log('Sending debug settings to WordPress:', debugSettings);
    console.log('Verify only mode:', verify_only);
    
    // Make request to WordPress site
    const response = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        api_key: api_key,
        enable_debugging: enableDebugging,
        debug_settings: debugSettings,
        verify_only: verify_only
      }),
      // Add a timeout for slow connections
      signal: AbortSignal.timeout(15000) // 15 seconds timeout
    })
    
    // Handle empty responses
    let data;
    const responseText = await response.text();
    
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
          message: data.message || 'Failed to connect to WordPress site',
          details: data.details || null
        },
        { status: response.status }
      )
    }
    
    // If this is just a verification request, return a simplified response
    if (verify_only) {
      return NextResponse.json({
        success: true,
        message: 'WordPress connection verified successfully',
        siteName: data.site_name,
        siteUrl: siteUrl,
        wpVersion: data.wp_version
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'WordPress connection successful',
      siteName: data.site_name,
      siteUrl: siteUrl,
      wpVersion: data.wp_version,
      debuggingEnabled: enableDebugging || false
    })
  } catch (error) {
    console.error('WordPress connection error:', error)
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