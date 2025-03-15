import { NextRequest, NextResponse } from 'next/server'
import * as ftp from 'basic-ftp'
import { Client } from 'ssh2'
import { Readable } from 'stream'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

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
      
      // Create a temporary file to download the debug log
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, 'wp-debug.log');
      
      // Download the debug log to a temporary file
      await client.downloadTo(tempFilePath, 'debug.log');
      
      // Read the file content
      const debugLogContent = fs.readFileSync(tempFilePath, 'utf-8');
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        console.error('Failed to delete temporary file:', e);
      }
      
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

// Function to handle SFTP operations
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
  return new Promise((resolve) => {
    console.log(`Connecting to SFTP server: ${sftpDetails.host}:${sftpDetails.port}`);
    
    // Set up connection timeout
    const connectionTimeout = setTimeout(() => {
      resolve({ 
        success: false, 
        message: 'SFTP connection timed out after 15 seconds' 
      });
    }, 15000);
    
    // Configure secure connection options
    const connectOptions: any = {
      host: sftpDetails.host,
      port: sftpDetails.port || 22,
      username: sftpDetails.username,
      password: sftpDetails.password,
      readyTimeout: 10000
    };
    
    // Add secure algorithms if secure is enabled
    if (sftpDetails.secure !== false) {
      connectOptions.algorithms = {
        kex: [
          'diffie-hellman-group-exchange-sha256',
          'diffie-hellman-group14-sha256',
          'diffie-hellman-group14-sha1'
        ],
        cipher: [
          'aes128-ctr',
          'aes192-ctr',
          'aes256-ctr'
        ]
      };
    }
    
    const conn = new Client();
    
    conn.on('ready', () => {
      clearTimeout(connectionTimeout);
      console.log('SFTP connection successful');
      
      conn.sftp((err: Error | undefined, sftp: any) => {
        if (err) {
          conn.end();
          resolve({ 
            success: false, 
            message: `SFTP error: ${err.message}` 
          });
          return;
        }
        
        if (operation === 'delete-plugin' && pluginSlug) {
          const pluginPath = `${sftpDetails.rootPath}/wp-content/plugins/${pluginSlug}`
          
          // Check if plugin directory exists
          sftp.readdir(pluginPath, (err: Error | null, list: any[]) => {
            if (err) {
              conn.end()
              resolve({ 
                success: false, 
                message: `Plugin '${pluginSlug}' not found or cannot be accessed` 
              })
              return
            }
            
            // Function to recursively delete a directory
            const deleteDirectory = (path: string, callback: (err?: Error) => void) => {
              sftp.readdir(path, (err: Error | null, list: any[]) => {
                if (err) {
                  callback(err)
                  return
                }
                
                let pending = list.length
                if (!pending) {
                  sftp.rmdir(path, callback)
                  return
                }
                
                list.forEach((item: any) => {
                  const itemPath = `${path}/${item.filename}`
                  
                  if (item.longname.startsWith('d')) {
                    // It's a directory
                    deleteDirectory(itemPath, (err) => {
                      if (err) {
                        callback(err)
                        return
                      }
                      
                      if (--pending === 0) {
                        sftp.rmdir(path, callback)
                      }
                    })
                  } else {
                    // It's a file
                    sftp.unlink(itemPath, (err: Error | null) => {
                      if (err) {
                        callback(err)
                        return
                      }
                      
                      if (--pending === 0) {
                        sftp.rmdir(path, callback)
                      }
                    })
                  }
                })
              })
            }
            
            // Delete the plugin directory
            deleteDirectory(pluginPath, (err) => {
              conn.end()
              
              if (err) {
                resolve({ 
                  success: false, 
                  message: `Failed to delete plugin: ${err.message}` 
                })
              } else {
                resolve({ 
                  success: true, 
                  message: `Plugin '${pluginSlug}' successfully deleted` 
                })
              }
            })
          })
        } 
        else if (operation === 'read-debug-log') {
          const debugLogPath = `${sftpDetails.rootPath}/wp-content/debug.log`
          
          // Create a temporary file to download the debug log
          const tempDir = os.tmpdir();
          const tempFilePath = path.join(tempDir, 'wp-debug.log');
          
          // Check if debug log exists and download it
          const readStream = sftp.createReadStream(debugLogPath);
          const writeStream = fs.createWriteStream(tempFilePath);
          
          readStream.on('error', (err: Error) => {
            conn.end();
            resolve({ 
              success: false, 
              message: `Debug log file not found or cannot be accessed: ${err.message}` 
            });
          });
          
          writeStream.on('error', (err: Error) => {
            conn.end();
            resolve({ 
              success: false, 
              message: `Failed to write temporary file: ${err.message}` 
            });
          });
          
          writeStream.on('close', () => {
            conn.end();
            
            try {
              // Read the file content
              const debugLogContent = fs.readFileSync(tempFilePath, 'utf-8');
              
              // Clean up the temporary file
              try {
                fs.unlinkSync(tempFilePath);
              } catch (e) {
                console.error('Failed to delete temporary file:', e);
              }
              
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
              
              resolve({ 
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
              });
            } catch (err) {
              resolve({ 
                success: false, 
                message: `Failed to read debug log: ${err instanceof Error ? err.message : String(err)}` 
              });
            }
          });
          
          // Pipe the read stream to the write stream
          readStream.pipe(writeStream);
        } else {
          conn.end()
          resolve({ 
            success: false, 
            message: 'Invalid operation' 
          })
        }
      })
    })
    
    conn.on('error', (err: Error) => {
      clearTimeout(connectionTimeout);
      
      // Check for specific SFTP errors
      let errorMessage = err.message;
      
      // Check for DNS resolution errors
      if (errorMessage.includes('getaddrinfo') || errorMessage.includes('ENOTFOUND')) {
        errorMessage = `Could not resolve hostname "${sftpDetails.host}". Please check the hostname and ensure it is correct.`;
      }
      // Check for connection refused errors
      else if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage = `Connection refused to ${sftpDetails.host}:${sftpDetails.port}. Please check that the SFTP server is running and the port is correct.`;
      }
      // Check for authentication errors
      else if (errorMessage.includes('authentication') || errorMessage.includes('auth failed')) {
        errorMessage = 'Authentication failed. Please check your username and password.';
      }
      
      resolve({ 
        success: false, 
        message: `SFTP error: ${errorMessage}` 
      });
    });
    
    conn.connect(connectOptions);
  });
}

export async function POST(req: NextRequest) {
  try {
    const { operation, ftpDetails, pluginSlug, filter_options } = await req.json()
    
    if (!operation || !ftpDetails) {
      return NextResponse.json(
        { success: false, message: 'Operation and FTP/SFTP details are required' },
        { status: 400 }
      )
    }
    
    if (operation === 'delete-plugin' && !pluginSlug) {
      return NextResponse.json(
        { success: false, message: 'Plugin slug is required for delete operation' },
        { status: 400 }
      )
    }
    
    // Validate FTP details
    if (!ftpDetails.host || !ftpDetails.username || !ftpDetails.password) {
      return NextResponse.json(
        { success: false, message: 'FTP/SFTP host, username, and password are required' },
        { status: 400 }
      )
    }
    
    // Set default secure option if not provided
    if (ftpDetails.secure === undefined) {
      ftpDetails.secure = true; // Default to secure connections
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
    
    console.log(`Performing emergency ${operation} operation via ${ftpDetails.protocol} (Secure: ${ftpDetails.secure})`);
    if (operation === 'read-debug-log') {
      console.log('Using filter options:', finalFilterOptions);
    }
    
    let result;
    if (ftpDetails.protocol === 'sftp') {
      result = await handleSftpOperation(
        operation as 'delete-plugin' | 'read-debug-log',
        ftpDetails,
        pluginSlug,
        finalFilterOptions
      )
    } else {
      result = await handleFtpOperation(
        operation as 'delete-plugin' | 'read-debug-log',
        ftpDetails,
        pluginSlug,
        finalFilterOptions
      )
    }
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: result.message,
      ...result.data
    })
  } catch (error) {
    console.error('Emergency access error:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    )
  }
} 