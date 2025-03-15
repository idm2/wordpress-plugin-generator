import { NextRequest, NextResponse } from 'next/server'
import * as ftp from 'basic-ftp'

export async function POST(req: NextRequest) {
  try {
    const { apiKey, siteUrl, pluginSlug, ftpDetails } = await req.json()
    
    if (!apiKey || !siteUrl || !pluginSlug) {
      return NextResponse.json(
        { success: false, message: 'API key, site URL, and plugin slug are required' },
        { status: 400 }
      )
    }
    
    if (!ftpDetails) {
      return NextResponse.json(
        { success: false, message: 'FTP/SFTP details are required to delete a plugin' },
        { status: 400 }
      )
    }
    
    // First try to delete via WordPress API
    try {
      // Construct the WordPress REST API endpoint URL
      const wpApiUrl = `${siteUrl}/wp-json/plugin-generator/v1/delete-plugin`
      
      console.log(`Deleting plugin ${pluginSlug} from WordPress site: ${siteUrl}`);
      
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
        // Add a longer timeout for slow connections
        signal: AbortSignal.timeout(30000) // 30 seconds timeout
      })
      
      // Handle empty responses
      let data;
      const responseText = await response.text();
      
      if (responseText && responseText.trim() !== '') {
        try {
          // Try to parse as JSON if there's content
          data = JSON.parse(responseText);
          
          if (response.ok && data.success) {
            return NextResponse.json({
              success: true,
              message: data.message || 'Plugin successfully deleted',
              details: data.details || null
            });
          }
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          // Continue to FTP deletion as fallback
        }
      }
      
      // If we get here, the WordPress API deletion failed or returned an error
      console.log('WordPress API deletion failed, trying FTP deletion as fallback');
    } catch (apiError) {
      console.error('WordPress API deletion error:', apiError);
      // Continue to FTP deletion as fallback
    }
    
    // If WordPress API deletion failed, try FTP deletion
    console.log('Attempting to delete plugin via FTP/SFTP');
    
    const client = new ftp.Client();
    client.ftp.verbose = false;
    
    try {
      // Connect to FTP server
      if (ftpDetails.protocol === 'sftp') {
        await client.access({
          host: ftpDetails.host,
          port: ftpDetails.port || 22,
          user: ftpDetails.username,
          password: ftpDetails.password,
          secure: ftpDetails.secure
        });
      } else {
        await client.access({
          host: ftpDetails.host,
          port: ftpDetails.port || 21,
          user: ftpDetails.username,
          password: ftpDetails.password,
          secure: ftpDetails.secure
        });
      }
      
      // Navigate to plugins directory
      const pluginsPath = `${ftpDetails.rootPath}/wp-content/plugins`;
      await client.cd(pluginsPath);
      
      // Check if plugin directory exists
      const list = await client.list();
      const pluginDir = list.find(item => item.name === pluginSlug && item.type === 2); // type 2 is directory
      
      if (!pluginDir) {
        return NextResponse.json({
          success: false,
          message: `Plugin directory '${pluginSlug}' not found`,
          details: 'The plugin directory could not be found on the server.'
        }, { status: 404 });
      }
      
      // Delete the plugin directory
      await client.removeDir(pluginSlug);
      
      return NextResponse.json({
        success: true,
        message: 'Plugin successfully deleted via FTP/SFTP',
        details: `Plugin '${pluginSlug}' was deleted from the server using FTP/SFTP.`
      });
    } catch (ftpError) {
      console.error('FTP deletion error:', ftpError);
      
      // Check for specific FTP errors
      let errorMessage = ftpError instanceof Error ? ftpError.message : String(ftpError);
      
      // Check for TLS/security requirement errors
      if (errorMessage.includes('421') && 
          (errorMessage.includes('cleartext session') || 
           errorMessage.includes('TLS') || 
           errorMessage.includes('SSL') || 
           errorMessage.includes('secure') || 
           errorMessage.includes('cipher'))) {
        errorMessage = 'The FTP server requires a secure connection (FTPS/TLS). Please enable the "Secure Connection" option in the WordPress connection settings.';
      }
      // Check for DNS resolution errors
      else if (errorMessage.includes('getaddrinfo') || errorMessage.includes('ENOTFOUND')) {
        errorMessage = `Could not resolve hostname "${ftpDetails.host}". Please check the hostname and ensure it is correct.`;
      }
      // Check for connection refused errors
      else if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage = `Connection refused to ${ftpDetails.host}:${ftpDetails.port}. Please check that the FTP server is running and the port is correct.`;
      }
      // Check for authentication errors
      else if (errorMessage.includes('530') || errorMessage.includes('auth') || errorMessage.includes('login')) {
        errorMessage = 'Authentication failed. Please check your username and password.';
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: `Failed to delete plugin via FTP/SFTP: ${errorMessage}`,
          details: ftpError instanceof Error ? ftpError.stack : null
        },
        { status: 500 }
      );
    } finally {
      client.close();
    }
  } catch (error) {
    console.error('WordPress plugin deletion error:', error)
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