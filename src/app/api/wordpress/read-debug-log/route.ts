import { NextRequest, NextResponse } from 'next/server'
import * as ftp from 'basic-ftp'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface FilterOptions {
  filter_by_plugin?: boolean
  plugin_slug?: string
  filter_by_time?: boolean
  time_threshold?: string
}

interface FTPDetails {
  host: string
  username: string
  password: string
  secure: boolean
  port?: number
}

export async function POST(req: NextRequest) {
  try {
    const { ftpDetails, pluginSlug, filter_options } = await req.json() as {
      ftpDetails: FTPDetails
      pluginSlug: string
      filter_options?: FilterOptions
    }
    
    if (!ftpDetails || !pluginSlug) {
      return NextResponse.json(
        { success: false, message: 'FTP details and plugin slug are required' },
        { status: 400 }
      )
    }
    
    const client = new ftp.Client()
    client.ftp.verbose = false
    
    try {
      // Connect to FTP server
      await client.access({
        host: ftpDetails.host,
        user: ftpDetails.username,
        password: ftpDetails.password,
        secure: ftpDetails.secure,
        port: ftpDetails.port || (ftpDetails.secure ? 22 : 21)
      })
      
      // Navigate to wp-content directory
      await client.cd('wp-content')
      
      // Try to read debug.log
      const tempFile = 'debug.log'
      await client.downloadTo(tempFile, 'debug.log')
      
      // Read the downloaded file
      const fs = require('fs')
      const debugLog = fs.readFileSync(tempFile, 'utf8')
      
      // Delete the temporary file
      fs.unlinkSync(tempFile)
      
      // Filter the log if filter options are provided
      let filteredLog = debugLog
      if (filter_options) {
        const lines = debugLog.split('\n')
        filteredLog = lines
          .filter((line: string) => {
            // Filter by plugin
            if (filter_options.filter_by_plugin) {
              if (!line.toLowerCase().includes(pluginSlug.toLowerCase())) {
                return false
              }
            }
            
            // Filter by time
            if (filter_options.filter_by_time && filter_options.time_threshold) {
              const timestamp = line.match(/\[(.*?)\]/)
              if (timestamp) {
                const lineTime = new Date(timestamp[1])
                const thresholdTime = new Date(filter_options.time_threshold)
                if (lineTime < thresholdTime) {
                  return false
                }
              }
            }
            
            return true
          })
          .join('\n')
      }
      
      return NextResponse.json({
        success: true,
        debug_log: filteredLog
      })
      
    } catch (ftpError) {
      console.error('FTP error:', ftpError)
      return NextResponse.json({
        success: false,
        message: 'Failed to read debug log via FTP',
        details: ftpError instanceof Error ? ftpError.message : 'Unknown FTP error'
      }, { status: 500 })
    } finally {
      client.close()
    }
    
  } catch (error) {
    console.error('Error reading debug log:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to read debug log',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 