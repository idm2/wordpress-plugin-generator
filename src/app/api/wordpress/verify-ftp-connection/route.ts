import { NextRequest, NextResponse } from 'next/server'
import * as ftp from 'basic-ftp'
import * as ssh2 from 'ssh2'
import { Client } from 'ssh2'

/**
 * API route to verify FTP/SFTP connection
 */
export async function POST(req: NextRequest) {
  try {
    const { 
      host, 
      port, 
      username, 
      password, 
      protocol = 'ftp',
      rootPath = '/public_html',
      secure = true
    } = await req.json()
    
    if (!host || !username || !password) {
      return NextResponse.json(
        { success: false, message: 'Host, username, and password are required' },
        { status: 400 }
      )
    }
    
    console.log(`Verifying ${protocol.toUpperCase()} connection to ${host}:${port}`);
    
    if (protocol === 'ftp') {
      return await verifyFtpConnection(host, port, username, password, secure);
    } else if (protocol === 'sftp') {
      return await verifySftpConnection(host, port, username, password, rootPath);
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid protocol. Must be "ftp" or "sftp"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('FTP/SFTP verification error:', error)
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

/**
 * Verify FTP connection
 */
async function verifyFtpConnection(
  host: string, 
  port: number, 
  username: string, 
  password: string,
  secure: boolean
): Promise<NextResponse> {
  const client = new ftp.Client()
  client.ftp.verbose = false
  
  try {
    // Set a timeout for the connection
    const connectionTimeout = setTimeout(() => {
      client.close()
      throw new Error('Connection timed out after 15 seconds')
    }, 15000)
    
    // Configure secure connection if requested
    if (secure) {
      await client.access({
        host,
        port,
        user: username,
        password,
        secure: true,
        secureOptions: {
          rejectUnauthorized: false // Allow self-signed certificates
        }
      })
    } else {
      await client.access({
        host,
        port,
        user: username,
        password
      })
    }
    
    clearTimeout(connectionTimeout)
    
    // Try to list the root directory to verify access
    await client.list()
    
    client.close()
    
    return NextResponse.json({
      success: true,
      message: 'FTP connection verified successfully'
    })
  } catch (error) {
    client.close()
    
    // Handle specific FTP errors
    let errorMessage = 'Failed to connect to FTP server'
    let errorType = 'FTPConnectionError'
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Check for specific error types
      if (errorMessage.includes('ENOTFOUND')) {
        errorMessage = `Host not found: ${host}. Please check the hostname and try again.`
        errorType = 'HostNotFound'
      } else if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage = `Connection refused to ${host}:${port}. Please check the port and ensure the FTP server is running.`
        errorType = 'ConnectionRefused'
      } else if (errorMessage.includes('timed out')) {
        errorMessage = `Connection to ${host}:${port} timed out. The server might be down or behind a firewall.`
        errorType = 'ConnectionTimeout'
      } else if (errorMessage.includes('530')) {
        errorMessage = 'Authentication failed. Please check your username and password.'
        errorType = 'AuthenticationFailed'
      } else if (errorMessage.includes('cleartext')) {
        errorMessage = 'Server requires a secure connection. Please enable the "Secure Connection" option.'
        errorType = 'SecureConnectionRequired'
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: errorMessage,
        error_type: errorType
      },
      { status: 500 }
    )
  }
}

/**
 * Verify SFTP connection
 */
async function verifySftpConnection(
  host: string, 
  port: number, 
  username: string, 
  password: string,
  rootPath: string
): Promise<NextResponse> {
  return new Promise((resolve) => {
    console.log(`Connecting to SFTP server: ${host}:${port}`);
    
    const conn = new Client();
    
    // Set a timeout for the connection
    const connectionTimeout = setTimeout(() => {
      conn.end();
      resolve(NextResponse.json(
        { 
          success: false, 
          message: `Connection to ${host}:${port} timed out after 15 seconds`,
          error_type: 'ConnectionTimeout'
        },
        { status: 500 }
      ));
    }, 15000);
    
    conn.on('ready', () => {
      clearTimeout(connectionTimeout);
      console.log('SFTP connection established');
      
      conn.sftp((err: Error | undefined, sftp: any) => {
        if (err) {
          conn.end();
          resolve(NextResponse.json(
            { 
              success: false, 
              message: `SFTP subsystem error: ${err.message}`,
              error_type: 'SFTPSubsystemError'
            },
            { status: 500 }
          ));
          return;
        }
        
        // Try to read the directory to verify access
        sftp.readdir(rootPath, (err: Error | null, list: any[]) => {
          conn.end();
          
          if (err) {
            resolve(NextResponse.json(
              { 
                success: false, 
                message: `Failed to read directory ${rootPath}: ${err.message}`,
                error_type: 'DirectoryAccessError'
              },
              { status: 500 }
            ));
          } else {
            resolve(NextResponse.json({
              success: true,
              message: 'SFTP connection verified successfully',
              directory_items: list.length
            }));
          }
        });
      });
    });
    
    conn.on('error', (err: Error) => {
      clearTimeout(connectionTimeout);
      console.error('SFTP connection error:', err);
      
      let errorMessage = err.message;
      let errorType = 'SFTPConnectionError';
      
      // Check for specific error types
      if (errorMessage.includes('ENOTFOUND')) {
        errorMessage = `Host not found: ${host}. Please check the hostname and try again.`;
        errorType = 'HostNotFound';
      } else if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage = `Connection refused to ${host}:${port}. Please check the port and ensure the SFTP server is running.`;
        errorType = 'ConnectionRefused';
      } else if (errorMessage.includes('Authentication failed')) {
        errorMessage = 'Authentication failed. Please check your username and password.';
        errorType = 'AuthenticationFailed';
      }
      
      resolve(NextResponse.json(
        { 
          success: false, 
          message: errorMessage,
          error_type: errorType
        },
        { status: 500 }
      ));
    });
    
    conn.connect({
      host,
      port,
      username,
      password,
      readyTimeout: 10000,
      algorithms: {
        kex: [
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
          'diffie-hellman-group-exchange-sha256',
          'diffie-hellman-group14-sha256',
          'diffie-hellman-group14-sha1'
        ],
        cipher: [
          'aes128-ctr',
          'aes192-ctr',
          'aes256-ctr',
          'aes128-gcm',
          'aes128-gcm@openssh.com',
          'aes256-gcm',
          'aes256-gcm@openssh.com'
        ]
      }
    });
  });
} 