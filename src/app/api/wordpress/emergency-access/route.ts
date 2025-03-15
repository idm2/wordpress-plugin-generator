import { NextRequest, NextResponse } from 'next/server'
import * as ftp from 'basic-ftp'

// Function to handle FTP operations
async function handleFtpOperation(
  operation: 'delete-plugin' | 'read-debug-log',
  ftpDetails: {
    host: string,
    port: number,
    username: string,
    password: string,
    rootPath: string,
    secure?: boolean
  },
  pluginSlug?: string,
  filter_options?: {
    filter_by_plugin?: boolean,
    filter_by_time?: boolean,
    time_threshold?: string,
    max_lines?: number
  }
): Promise<{ success: boolean, message: string, data?: any }> {
  const client = new ftp.Client()
  
  // Set up logging
  client.ftp.verbose = false
  
  try {
    console.log(`Connecting to FTP server: ${ftpDetails.host}:${ftpDetails.port} (Secure: ${ftpDetails.secure !== false})`);
    
    // Configure secure connection options
    const secureOptions = {
      secure: ftpDetails.secure !== false, // Default to secure unless explicitly set to false
      secureOptions: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    };
    
    // Connect to the FTP server
    await client.access({
      host: ftpDetails.host,
      port: ftpDetails.port || 21,
      user: ftpDetails.username,
      password: ftpDetails.password,
      ...secureOptions
    })
    
    console.log('FTP connection successful');
    
    // Change to the root directory if provided
    if (ftpDetails.rootPath) {
      await client.cd(ftpDetails.rootPath)
    }
    
    if (operation === 'delete-plugin' && pluginSlug) {
      // Navigate to plugins directory
      await client.cd('wp-content/plugins')
      
      // Check if plugin directory exists
      const list = await client.list()
      const pluginDir = list.find((item: any) => item.name === pluginSlug && item.isDirectory)
      
      if (!pluginDir) {
        return { 
          success: false, 
          message: `Plugin '${pluginSlug}' not found` 
        }
      }
      
      // Delete the plugin directory
      await client.removeDir(pluginSlug)
      
      return { 
        success: true, 
        message: `Plugin '${pluginSlug}' successfully deleted` 
      }
    } 
    else if (operation === 'read-debug-log') {
      // Navigate to wp-content directory
      await client.cd('wp-content')
      
      // Check if debug.log exists
      const list = await client.list()
      const debugLog = list.find((item: any) => item.name === 'debug.log' && !item.isDirectory)
      
      if (!debugLog) {
        return { 
          success: false, 
          message: 'Debug log file not found' 
        }
      }
      
      // Create a temporary buffer to store the debug log content
      let debugLogContent = '';
      
      // Download the debug log content as a string
      await client.downloadTo(
        new (require('stream').Writable)({
          write(chunk: Buffer, encoding: string, callback: (error?: Error | null) => void) {
            debugLogContent += chunk.toString();
            callback();
          }
        }),
        'debug.log'
      );
      
      // Filter the debug log content based on options
      let filteredContent = debugLogContent;
      
      // Apply time-based filtering if enabled
      if (filter_options?.filter_by_time && filter_options.time_threshold) {
        console.log(`Filtering debug log by time: ${filter_options.time_threshold}`);
        const timeThreshold = new Date(filter_options.time_threshold);
        
        // Split the log into lines
        const lines = debugLogContent.split('\n');
        const filteredLines = lines.filter(line => {
          // Try to extract the timestamp from the line
          // WordPress debug log format is typically: [dd-MMM-yyyy HH:mm:ss UTC] PHP ...
          const timestampMatch = line.match(/\[([\d-]+\s[\d:]+)(?:\s[A-Z]+)?\]/);
          if (timestampMatch) {
            try {
              const lineTimestamp = new Date(timestampMatch[1].replace(/-/g, ' '));
              return lineTimestamp >= timeThreshold;
            } catch (e) {
              // If we can't parse the timestamp, include the line
              return true;
            }
          }
          // Include lines without timestamps
          return true;
        });
        
        filteredContent = filteredLines.join('\n');
        console.log(`Filtered debug log from ${lines.length} to ${filteredLines.length} lines based on time`);
      }
      
      // Filter for plugin-specific errors if requested
      let pluginErrors = null;
      if (filter_options?.filter_by_plugin && pluginSlug) {
        console.log(`Filtering debug log for plugin: ${pluginSlug}`);
        const lines = filteredContent.split('\n');
        const filteredLines = lines.filter((line: string) => 
          line.toLowerCase().includes(pluginSlug.toLowerCase())
        );
        
        if (filteredLines.length > 0) {
          pluginErrors = filteredLines.join('\n');
          console.log(`Filtered debug log from ${lines.length} to ${filteredLines.length} lines based on plugin slug`);
        }
      }
      
      // Limit the number of lines if specified
      if (filter_options?.max_lines && filter_options.max_lines > 0) {
        const contentToLimit = pluginErrors || filteredContent;
        const lines = contentToLimit.split('\n');
        
        if (lines.length > filter_options.max_lines) {
          const limitedLines = lines.slice(-filter_options.max_lines); // Get the last N lines
          
          if (pluginErrors) {
            pluginErrors = limitedLines.join('\n');
          } else {
            filteredContent = limitedLines.join('\n');
          }
          
          console.log(`Limited debug log to the last ${filter_options.max_lines} lines`);
        }
      }
      
      return { 
        success: true, 
        message: 'Debug log successfully read',
        data: {
          debug_log: filteredContent,
          plugin_errors: pluginErrors,
          filtering_applied: {
            time_filtered: filter_options?.filter_by_time || false,
            plugin_filtered: filter_options?.filter_by_plugin || false,
            line_limited: filter_options?.max_lines ? true : false
          }
        }
      };
    } 
    else {
      return { 
        success: false, 
        message: 'Invalid operation' 
      }
    }
  } catch (err) {
    console.error('FTP operation error:', err);
    
    // Check for specific FTP errors
    let errorMessage = err instanceof Error ? err.message : String(err);
    
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
    
    return { 
      success: false, 
      message: `FTP error: ${errorMessage}` 
    };
  } finally {
    client.close();
  }
}

// Simplified function to handle SFTP operations - returns a message that SFTP is not available in the Vercel deployment
async function handleSftpOperation(
  operation: 'delete-plugin' | 'read-debug-log',
  sftpDetails: {
    host: string,
    port: number,
    username: string,
    password: string,
    rootPath: string,
    secure?: boolean
  },
  pluginSlug?: string,
  filter_options?: {
    filter_by_plugin?: boolean,
    filter_by_time?: boolean,
    time_threshold?: string,
    max_lines?: number
  }
): Promise<{ success: boolean, message: string, data?: any }> {
  // In the Vercel deployment, SFTP functionality is disabled due to binary module compatibility issues
  console.log('SFTP functionality is disabled in the Vercel deployment');
  
  return {
    success: false,
    message: 'SFTP functionality is not available in the web deployment. Please use FTP instead, or use the desktop application for SFTP support.'
  };
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { operation, ftpDetails, pluginSlug, filter_options } = data;
    
    // Validate required parameters
    if (!operation) {
      return NextResponse.json({ 
        success: false, 
        message: 'Operation is required' 
      }, { status: 400 });
    }
    
    if (!ftpDetails) {
      return NextResponse.json({ 
        success: false, 
        message: 'FTP/SFTP details are required' 
      }, { status: 400 });
    }
    
    // Check if this is an SFTP or FTP connection
    const isSftp = ftpDetails.protocol === 'sftp';
    
    // Log the operation details
    console.log(`Emergency access operation: ${operation}`);
    console.log(`Connection type: ${isSftp ? 'SFTP' : 'FTP'}`);
    console.log(`Host: ${ftpDetails.host}:${ftpDetails.port}`);
    console.log(`Plugin slug: ${pluginSlug || 'N/A'}`);
    
    // Handle the operation based on the connection type
    let result;
    
    if (isSftp) {
      result = await handleSftpOperation(
        operation, 
        ftpDetails, 
        pluginSlug,
        filter_options
      );
    } else {
      result = await handleFtpOperation(
        operation, 
        ftpDetails, 
        pluginSlug,
        filter_options
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Emergency access error:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: `Server error: ${error instanceof Error ? error.message : String(error)}` 
    }, { status: 500 });
  }
} 