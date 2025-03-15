import { NextRequest, NextResponse } from 'next/server'

/**
 * Analyzes a plugin ZIP file to extract header information
 */
async function analyzePluginZip(pluginZip: string) {
  try {
    // Decode the base64 plugin ZIP
    const zipBuffer = Buffer.from(pluginZip, 'base64');
    
    // Use JSZip to extract the main plugin file
    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(zipBuffer);
    
    // Find the main plugin file (usually has the same name as the plugin slug)
    let mainPluginFile = null;
    let mainPluginContent = '';
    
    // First, try to find a PHP file in the root that might be the main file
    for (const filename in zip.files) {
      if (filename.endsWith('.php') && !filename.includes('/')) {
        mainPluginFile = filename;
        mainPluginContent = await zip.files[filename].async('string');
        break;
      }
    }
    
    // If not found, look for any PHP file that might be the main file
    if (!mainPluginFile) {
      for (const filename in zip.files) {
        if (filename.endsWith('.php')) {
          mainPluginFile = filename;
          mainPluginContent = await zip.files[filename].async('string');
          break;
        }
      }
    }
    
    // If we found a main plugin file, analyze its header
    if (mainPluginFile && mainPluginContent) {
      console.log(`Analyzing plugin header in file: ${mainPluginFile}`);
      return extractPluginHeaderInfo(mainPluginContent);
    } else {
      console.log('Could not find a main plugin file to analyze');
      return null;
    }
  } catch (headerError) {
    console.error('Error analyzing plugin header:', headerError);
    return null;
  }
}

/**
 * Extracts plugin header information from a PHP file
 */
function extractPluginHeaderInfo(fileContent: string) {
  // Check if the file starts with <?php
  const startsWithPhp = fileContent.trim().startsWith('<?php');
  
  // Look for the plugin header comment
  const headerRegex = /\/\*\*?\s*\n(?:\s*\*\s*(?:@)?([^@\n]+):\s*([^\n]*)\n)+\s*\*\//;
  const headerMatch = fileContent.match(headerRegex);
  
  if (!headerMatch) {
    return {
      headerFound: false,
      startsWithPhp,
      possibleIssues: [
        'No WordPress plugin header comment found',
        !startsWithPhp ? 'File does not start with <?php' : null
      ].filter(Boolean)
    };
  }
  
  // Extract individual header fields
  const headerFields: Record<string, string> = {};
  const fieldRegex = /\*\s*(?:@)?([^@\n]+):\s*([^\n]*)/g;
  let fieldMatch;
  
  while ((fieldMatch = fieldRegex.exec(headerMatch[0])) !== null) {
    const key = fieldMatch[1].trim();
    const value = fieldMatch[2].trim();
    headerFields[key] = value;
  }
  
  // Check for required fields
  const requiredFields = ['Plugin Name', 'Version', 'Description', 'Author', 'Text Domain'];
  const missingFields = requiredFields.filter(field => !headerFields[field]);
  
  return {
    headerFound: true,
    startsWithPhp,
    fields: headerFields,
    missingFields,
    isValid: missingFields.length === 0 && startsWithPhp
  };
}

// Fix the linter error by correcting the variable name
function extractPhpError(html: string): { message: string, details: string, error_type?: string, troubleshootingSteps?: string[] } | null {
  // Check if it's an HTML response
  if (!html.includes('<html') && !html.includes('<!DOCTYPE html')) {
    return null;
  }
  
  // Check for specific FS_CHMOD_FILE error
  if (html.includes('Undefined constant "FS_CHMOD_FILE"')) {
    return {
      message: 'WordPress filesystem constants not defined',
      details: 'The WordPress site is missing required filesystem constants. Add the following to your wp-config.php file:\n\n' +
               'define(\'FS_CHMOD_DIR\', 0755);\n' +
               'define(\'FS_CHMOD_FILE\', 0644);',
      error_type: 'FilesystemConstantsError',
      troubleshootingSteps: [
        'Add the filesystem constants to your wp-config.php file',
        'Reconnect to WordPress using the connection dialog',
        'Ensure your web server has write permissions to the plugins directory'
      ]
    };
  }
  
  // Check for JSON error response
  try {
    const jsonMatch = html.match(/{[\s\S]*}/);
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[0]);
      if (jsonData.data && jsonData.data.error) {
        const error = jsonData.data.error;
        if (error.message && error.message.includes('Undefined constant "FS_CHMOD_FILE"')) {
          return {
            message: 'WordPress filesystem constants not defined',
            details: 'The WordPress site is missing required filesystem constants. Add the following to your wp-config.php file:\n\n' +
                     'define(\'FS_CHMOD_DIR\', 0755);\n' +
                     'define(\'FS_CHMOD_FILE\', 0644);',
            error_type: 'FilesystemConstantsError',
            troubleshootingSteps: [
              'Add the filesystem constants to your wp-config.php file',
              'Reconnect to WordPress using the connection dialog',
              'Ensure your web server has write permissions to the plugins directory'
            ]
          };
        }
        
        return {
          message: `WordPress Error: ${error.message.split("\n")[0]}`,
          details: `${error.message}\n\nFile: ${error.file}\nLine: ${error.line}`,
          error_type: 'WordPressError',
          troubleshootingSteps: [
            'Check the error message for syntax issues in your plugin code',
            'Verify that your plugin is compatible with your WordPress version',
            'Check for conflicts with other plugins',
            'Enable debugging in WordPress to get more detailed error information'
          ]
        };
      }
    }
  } catch (e) {
    // If JSON parsing fails, continue with regular error extraction
    console.error('Error parsing JSON in HTML response:', e);
  }
  
  // Common PHP error patterns
  const errorPatterns = [
    /Parse error:\s*(.*?)\s*in\s*(.*?)\s*on line\s*(\d+)/i,
    /Fatal error:\s*(.*?)\s*in\s*(.*?)\s*on line\s*(\d+)/i,
    /Warning:\s*(.*?)\s*in\s*(.*?)\s*on line\s*(\d+)/i,
    /Notice:\s*(.*?)\s*in\s*(.*?)\s*on line\s*(\d+)/i,
    /WordPress database error\s*(.*?)\s*for query/i,
    /There has been a critical error on this website/i
  ];
  
  for (const pattern of errorPatterns) {
    const match = html.match(pattern);
    if (match) {
      if (match.length >= 4) {
        // For errors with file and line number
        const errorType = match[0].split(':')[0].toLowerCase().includes('parse') ? 'PHPSyntaxError' : 'PHPError';
        const troubleshootingSteps = errorType === 'PHPSyntaxError' ? [
          'Fix the syntax error in your plugin code',
          'Check for missing semicolons, brackets, or quotes',
          'Validate your PHP code with a linter before deploying',
          'Simplify complex expressions that might be causing the error'
        ] : [
          'Check the error message for clues about the issue',
          'Verify that your plugin is compatible with your WordPress version',
          'Check for conflicts with other plugins',
          'Enable debugging in WordPress to get more detailed error information'
        ];
        
        return {
          message: `PHP ${match[0].split(':')[0]}: ${match[1]}`,
          details: `File: ${match[2]}\nLine: ${match[3]}\n\nThis is a syntax error in your plugin code. Please fix the issue and try again.`,
          error_type: errorType,
          troubleshootingSteps
        };
      } else if (match.length >= 2) {
        // For errors with just a message
        return {
          message: `PHP Error: ${match[1] || match[0]}`,
          details: `An error was detected in your plugin code. Please check the syntax and try again.`,
          error_type: 'PHPError',
          troubleshootingSteps: [
            'Check the error message for clues about the issue',
            'Verify that your plugin is compatible with your WordPress version',
            'Check for conflicts with other plugins',
            'Enable debugging in WordPress to get more detailed error information'
          ]
        };
      } else {
        // Generic error
        return {
          message: 'PHP Error detected',
          details: `The WordPress site returned an error page instead of a JSON response. This usually indicates a syntax error in your plugin code.`,
          error_type: 'PHPError',
          troubleshootingSteps: [
            'Enable debugging in WordPress to get more detailed error information',
            'Check your plugin code for syntax errors',
            'Verify that your plugin is compatible with your WordPress version',
            'Try deploying a simpler version of your plugin'
          ]
        };
      }
    }
  }
  
  // Check for specific WordPress errors
  if (html.includes('There has been a critical error on this website')) {
    return {
      message: 'WordPress Critical Error',
      details: 'WordPress encountered a critical error while processing your request. This is often caused by a PHP error in your plugin code.',
      error_type: 'WordPressCriticalError',
      troubleshootingSteps: [
        'Enable debugging in WordPress to get more detailed error information',
        'Check your plugin code for syntax errors',
        'Verify that your plugin is compatible with your WordPress version',
        'Try deploying a simpler version of your plugin',
        'Check your server\'s PHP error logs'
      ]
    };
  }
  
  // If we found HTML but no specific error pattern
  return {
    message: 'WordPress returned an HTML error page',
    details: `The WordPress site returned an HTML page instead of a JSON response. This usually indicates a PHP error or server misconfiguration.\n\nHTML snippet: ${html.substring(0, 500)}...`,
    error_type: 'HTMLResponse',
    troubleshootingSteps: [
      'Enable debugging in WordPress to get more detailed error information',
      'Check your server\'s PHP error logs',
      'Verify that the Plugin Generator Connector plugin is active and up to date',
      'Check your plugin code for syntax errors',
      'Try deploying a simpler version of your plugin'
    ]
  };
}

// Configure route handler
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Handle POST requests for plugin deployment
export async function POST(req: NextRequest) {
  try {
    const { 
      apiKey, 
      siteUrl, 
      pluginZip,
      pluginSlug,
      force_update = false,
      delete_first = false
    } = await req.json()
    
    if (!apiKey || !siteUrl || !pluginZip) {
      return NextResponse.json(
        { success: false, message: 'API key, site URL, and plugin ZIP are required' },
        { status: 400 }
      )
    }
    
    console.log(`Deploying plugin to WordPress site: ${siteUrl}`)
    console.log(`Plugin ZIP size: ${pluginZip.length} characters`)
    console.log(`Plugin slug: ${pluginSlug || 'Not provided'}`)
    console.log(`Force update: ${force_update}`)
    console.log(`Delete first: ${delete_first}`)
    
    // First check if we need to delete an existing plugin
    if (delete_first && pluginSlug) {
      console.log(`Deleting existing plugin: ${pluginSlug} before installation`)
      try {
        // Use the custom endpoint for deleting plugins
        const deleteUrl = `${siteUrl}/wp-json/plugin-generator/v1/delete-plugin`
        console.log(`Making POST request to: ${deleteUrl}`)
        
        const deleteResponse = await fetch(deleteUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            api_key: apiKey,
            plugin_slug: pluginSlug
          })
        });
        
        const deleteResult = await deleteResponse.json();
        console.log(`Delete plugin response:`, deleteResult);
        
        if (deleteResponse.ok) {
          console.log(`Successfully deleted plugin: ${pluginSlug}`);
        } else {
          console.warn(`Warning: Failed to delete plugin: ${pluginSlug}. Status: ${deleteResponse.status}. Continuing with installation anyway.`);
        }
        
        // Add a small delay to ensure filesystem operations complete
        console.log('Waiting for filesystem operations to complete...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (deleteError) {
        console.error('Error deleting existing plugin:', deleteError)
        // Continue with installation even if deletion fails
        console.log('Continuing with installation despite deletion error')
      }
    }
    
    // Use the install-plugin endpoint
    const wpApiUrl = `${siteUrl}/wp-json/plugin-generator/v1/install-plugin`
    console.log(`Installing plugin using endpoint: ${wpApiUrl}`)
    
    try {
      // Make request to WordPress site
      const response = await fetch(wpApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          api_key: apiKey,
          plugin_zip: pluginZip,
          // Include additional parameters only if they're provided
          ...(pluginSlug && { plugin_slug: pluginSlug }),
          ...(force_update && { force_update: true }),
          ...(delete_first && { delete_first: true })
        })
      })
      
      // First get the raw response text
      const responseText = await response.text()
      console.log('Raw response:', responseText)
      
      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
        console.log('Parsed response data:', data)
      } catch (e) {
        console.error('Error parsing response as JSON:', e)
        
        // Log more details about the response
        console.error('Response status:', response.status)
        console.error('Response headers:', Object.fromEntries(response.headers.entries()))
        console.error('Response text (first 1000 chars):', responseText.substring(0, 1000))
        
        // Check if this is a WordPress error page
        if (responseText.includes('There has been a critical error')) {
          // Extract error from debug.log if available
          const errorMatch = responseText.match(/PHP Fatal error:\s*(.*?)(?:\sin|$)/i)
          const error = errorMatch ? errorMatch[1] : 'Unknown WordPress error'
          
          console.error('WordPress critical error detected:', error)
          return NextResponse.json({
            success: false,
            message: error,
            details: 'WordPress encountered a critical error. Check the debug.log file for more details.',
            error_type: 'WordPressCriticalError',
            troubleshootingSteps: [
              'Check WordPress debug.log for detailed error message',
              'Ensure the WordPress Filesystem API is properly configured',
              'Verify the plugin-generator-connector plugin is up to date',
              'Check file permissions on the WordPress plugins directory'
            ],
            raw_response: responseText.substring(0, 2000) // Include part of the raw response
          }, { status: 500 })
        }
        
        // Check for PHP errors in the HTML response
        const phpError = extractPhpError(responseText)
        if (phpError) {
          console.error('PHP error detected in response:', phpError)
          return NextResponse.json({
            success: false,
            message: phpError.message,
            details: phpError.details,
            error_type: phpError.error_type || 'PHPError',
            troubleshootingSteps: phpError.troubleshootingSteps,
            raw_response: responseText.substring(0, 2000) // Include part of the raw response
          }, { status: 500 })
        }
        
        console.error('Invalid response format (not JSON):', responseText.substring(0, 500))
        return NextResponse.json({
          success: false,
          message: 'Invalid response from WordPress',
          details: responseText.substring(0, 1000),
          error_type: 'InvalidResponse',
          raw_response: responseText.substring(0, 2000) // Include part of the raw response
        }, { status: 500 })
      }
      
      if (!response.ok) {
        console.error('WordPress API error:', data)
        return NextResponse.json({ 
          success: false, 
          message: data.message || 'Failed to deploy plugin to WordPress site',
          details: data.details || data.error || null,
          error_type: data.error_type || 'DeploymentError'
        }, { status: response.status })
      }
      
      // Check for activation failures in successful installations
      if (data.success && data.message && data.message.toLowerCase().includes('activation failed')) {
        console.warn('Plugin installed but activation failed:', data.message)
        return NextResponse.json({
          success: true,
          message: data.message,
          activated: false,
          plugin_url: data.plugin_url,
          admin_url: data.admin_url,
          activation_error: true
        })
      }
      
      console.log('Plugin deployment successful:', data)
      return NextResponse.json({
        success: true,
        message: data.message || 'Plugin deployed successfully',
        activated: data.activated,
        plugin_url: data.plugin_url,
        admin_url: data.admin_url
      })
      
    } catch (error: any) {
      console.error('Error deploying plugin:', error)
      return NextResponse.json({ 
        success: false, 
        message: error.message || 'Failed to deploy plugin',
        details: error.stack || 'An unexpected error occurred',
        error_type: 'NetworkError'
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Error processing request:', error)
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to process request',
      details: error.stack || 'An unexpected error occurred',
      error_type: 'RequestError'
    }, { status: 400 })
  }
} 