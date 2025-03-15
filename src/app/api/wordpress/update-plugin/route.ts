import { NextRequest, NextResponse } from 'next/server'

/**
 * API route for updating an existing WordPress plugin
 * This is specifically for updating plugins that are already installed
 */
export async function POST(req: NextRequest) {
  try {
    const { apiKey, siteUrl, pluginZip, pluginSlug, force_update = false } = await req.json()
    
    if (!apiKey || !siteUrl || !pluginZip || !pluginSlug) {
      return NextResponse.json(
        { success: false, message: 'API key, site URL, plugin ZIP, and plugin slug are required' },
        { status: 400 }
      )
    }
    
    console.log(`Updating plugin on WordPress site: ${siteUrl}`);
    console.log(`Plugin slug: ${pluginSlug}`);
    console.log(`Plugin ZIP size: ${pluginZip.length} characters`);
    console.log(`Force update: ${force_update}`);
    
    // Construct the WordPress REST API endpoint URL for updates
    // This endpoint should be implemented in the WordPress connector plugin
    const wpApiUrl = `${siteUrl}/wp-json/plugin-generator/v1/update-plugin`
    
    console.log(`Making request to WordPress API: ${wpApiUrl}`);
    
    // Make request to WordPress site with increased timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout
    
    try {
      const response = await fetch(wpApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          plugin_zip: pluginZip,
          plugin_slug: pluginSlug,
          force_update: force_update, // Pass the force_update parameter
          check_for_errors: true,
          read_debug_log: true,
          // Request additional information for better error reporting
          detailed_errors: true,
          check_plugin_header: true,
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`WordPress API response status: ${response.status}`);
      
      // Handle empty responses
      const responseText = await response.text();
      
      console.log(`WordPress API response length: ${responseText.length} characters`);
      
      if (!responseText || responseText.trim() === '') {
        console.error('Empty response from WordPress API');
        return NextResponse.json(
          { 
            success: false, 
            message: 'WordPress site returned an empty response',
            details: 'The WordPress site did not return any data. This could be due to a timeout, a server error, or an issue with the WordPress connector plugin.',
            error_type: 'EmptyResponse',
            troubleshooting_steps: [
              'Check if the WordPress site is accessible',
              'Verify that the Plugin Generator Connector plugin is active',
              'Check the server error logs for PHP errors',
              'Increase the PHP memory limit and execution time in wp-config.php',
              'Try deploying a smaller plugin'
            ]
          },
          { status: 500 }
        );
      }
      
      // Try to parse as JSON
      let data;
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
            error_type: 'JSONParseError',
            raw_response: responseText.substring(0, 2000)
          },
          { status: 500 }
        );
      }
      
      if (!response.ok) {
        // Extract as much error detail as possible
        const errorMessage = data.message || 'Failed to update plugin';
        const errorDetails = data.details || data.error_details || data.debug || '';
        
        console.error('WordPress update error:', {
          status: response.status,
          message: errorMessage,
          details: errorDetails,
          data
        });
        
        // If force_update is true and this is a specific error that can be resolved by force update,
        // try to use the deploy-plugin endpoint with delete_first=true
        if (force_update && (
          errorMessage.includes('already exists') || 
          errorMessage.includes('destination already exists') ||
          errorMessage.includes('could not create directory')
        )) {
          console.log('Force update enabled and encountered directory issue, trying deploy-plugin with delete_first=true');
          
          // Make a request to the deploy-plugin endpoint with delete_first=true
          const deployResponse = await fetch(`${siteUrl}/wp-json/plugin-generator/v1/deploy-plugin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              api_key: apiKey,
              plugin_zip: pluginZip,
              plugin_slug: pluginSlug,
              delete_first: true,
              force_update: true
            })
          });
          
          const deployData = await deployResponse.json();
          
          if (deployResponse.ok && deployData.success) {
            console.log('Force update successful using deploy-plugin endpoint');
            return NextResponse.json({
              success: true,
              message: 'Plugin updated successfully (force update)',
              details: 'Used force update method to delete and reinstall the plugin',
              force_update_used: true,
              ...deployData
            });
          }
        }
        
        return NextResponse.json(
          { 
            success: false, 
            message: errorMessage,
            details: errorDetails,
            debug: JSON.stringify(data, null, 2)
          },
          { status: response.status }
        )
      }
      
      console.log('WordPress plugin update successful');
      
      // Pass through all data from WordPress for maximum information
      return NextResponse.json({
        success: true,
        message: data.message || 'Plugin updated successfully',
        details: data.details || null,
        debug: data.debug || null,
        error_log: data.error_log || null,
        debug_log: data.debug_log || null,
        ...data // Include any other fields returned by WordPress
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle fetch errors (timeouts, network issues, etc.)
      console.error('Fetch error during WordPress plugin update:', fetchError);
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Request to WordPress site timed out',
            details: 'The request to the WordPress site took too long to complete. This could be due to a slow server, a large plugin, or server resource limitations.',
            error_type: 'TimeoutError',
            troubleshooting_steps: [
              'Try deploying a smaller plugin',
              'Increase the PHP memory limit and execution time in wp-config.php',
              'Check if the server is under heavy load',
              'Try again later'
            ]
          },
          { status: 504 } // Gateway Timeout
        );
      }
      
      throw fetchError; // Re-throw for the outer catch block
    }
  } catch (error: any) {
    console.error('WordPress plugin update error:', error)
    
    // Capture as much error detail as possible
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
        details: errorStack,
        error_type: error instanceof Error ? error.name : 'Unknown',
        troubleshooting_steps: [
          'Check if the WordPress site is accessible',
          'Verify that the Plugin Generator Connector plugin is active',
          'Check the server error logs for PHP errors',
          'Try deploying a smaller plugin',
          'Increase the PHP memory limit and execution time in wp-config.php'
        ]
      },
      { status: 500 }
    )
  }
} 