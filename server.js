require('dotenv').config()
const next = require('next')
const express = require('express')
const cors = require('cors')
const axios = require('axios')
const archiver = require('archiver')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const FormData = require('form-data')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const INSTA_WP_API_URL = 'https://app.instawp.io/api/v2'
const INSTA_WP_API_KEY = process.env.INSTA_WP_API_KEY

if (!INSTA_WP_API_KEY) {
  console.error('INSTA_WP_API_KEY is not set')
  process.exit(1)
}

// Helper function to generate a random site name
function generateRandomSiteName() {
  return `preview-${crypto.randomBytes(8).toString('hex')}`
}

// Helper function to poll task status
async function pollTaskStatus(taskId, maxAttempts = 30) {
  let attempt = 0
  const pollInterval = 2000 // 2 seconds

  while (attempt < maxAttempts) {
    try {
      const response = await axios.get(
        `${INSTA_WP_API_URL}/tasks/${taskId}/status`,
        {
          headers: {
            Authorization: `Bearer ${INSTA_WP_API_KEY}`
          }
        }
      )

      console.log(`Polling attempt ${attempt + 1}:`, response.data)

      if (response.data.data.status === 'completed') {
        // Get the site details
        const siteId = response.data.data.resource_id
        const siteResponse = await axios.get(
          `${INSTA_WP_API_URL}/sites/${siteId}`,
          {
            headers: {
              Authorization: `Bearer ${INSTA_WP_API_KEY}`
            }
          }
        )
        
        if (siteResponse.data.status) {
          return siteResponse.data.data
        }
      } else if (response.data.data.status === 'failed') {
        throw new Error('Site creation failed')
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval))
      attempt++
    } catch (error) {
      console.error(`Error polling task status:`, error)
      throw error
    }
  }

  throw new Error('Site creation timed out')
}

// Helper function to install plugin
async function installPlugin(siteUrl, username, password, pluginCode, pluginName) {
  try {
    // Add delay to ensure WordPress is fully initialized
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    const authString = Buffer.from(`${username}:${password}`).toString('base64')
    
    // First, create a temporary file
    const tempDir = path.join(__dirname, 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir)
    }
    
    const pluginFile = path.join(tempDir, `${pluginName}.php`)
    fs.writeFileSync(pluginFile, pluginCode)
    
    // Create form data with plugin file
    const formData = new FormData()
    formData.append('file', fs.createReadStream(pluginFile))
    
    console.log('Attempting to install plugin via WordPress REST API...')
    
    // Install plugin via WordPress REST API
    const pluginResponse = await axios.post(
      `${siteUrl}/wp-json/wp/v2/plugins`,
      formData,
      {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'multipart/form-data'
        },
        maxBodyLength: Infinity
      }
    )

    // Clean up temp file
    fs.unlinkSync(pluginFile)

    console.log('Plugin installation response:', pluginResponse.data)
    return { success: true, data: pluginResponse.data }
  } catch (error) {
    console.error('Plugin installation error:', error)
    return { 
      success: false, 
      error: error.response?.data || error.message
    }
  }
}

async function deleteSite(siteId) {
  try {
    const response = await axios.delete(`${INSTA_WP_API_URL}/sites/${siteId}`, {
      headers: {
        Authorization: `Bearer ${INSTA_WP_API_KEY}`
      }
    })
    console.log(`Site ${siteId} deleted successfully:`, response.data)
    return response.data
  } catch (error) {
    console.error(`Error deleting site ${siteId}:`, error)
    throw error
  }
}

app.prepare().then(() => {
  const server = express()
  
  // Add middleware
  server.use(express.json())
  server.use(cors())

  // Add proxy server routes
  server.post('/preview-plugin', async (req, res) => {
    console.log('Received preview request')
    const { pluginName, code } = req.body

    if (!pluginName || !code) {
      return res.status(400).json({
        status: false,
        error: 'Plugin name and code are required.'
      })
    }

    try {
      if (!INSTA_WP_API_KEY) {
        throw new Error('InstaWP API key is not configured')
      }

      const siteName = generateRandomSiteName()
      console.log('Creating site:', siteName)

      // Create the site
      const createResponse = await axios.post(
        `${INSTA_WP_API_URL}/sites`,
        {
          site_name: siteName,
          wp_version: 'latest',
          php_version: '8.0',
          mysql_version: '8.0'
        },
        {
          headers: {
            Authorization: `Bearer ${INSTA_WP_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      ).catch(error => {
        console.error('Error creating site:', error.response?.data || error.message)
        throw new Error(error.response?.data?.message || 'Failed to create site')
      })

      console.log('Create site response:', createResponse.data)

      let siteData
      
      // Check if site is from pool (ready immediately)
      if (createResponse.data.data.is_pool) {
        console.log('Site created from pool, ready immediately')
        siteData = createResponse.data.data
      } else if (createResponse.data.data.task_id) {
        // Site creation in progress, poll for completion
        console.log('Site creation in progress, polling for completion...')
        try {
          siteData = await pollTaskStatus(createResponse.data.data.task_id)
        } catch (pollError) {
          console.error('Error polling task status:', pollError)
          throw new Error('Failed to create site: ' + pollError.message)
        }
      } else {
        throw new Error('Invalid response from InstaWP API')
      }

      if (siteData?.wp_url) {
        // Add additional delay to ensure WordPress is fully initialized
        await new Promise(resolve => setTimeout(resolve, 10000))

        // Try to verify site is accessible
        try {
          const siteCheck = await axios.get(`${siteData.wp_url}/wp-admin/admin-ajax.php`)
          if (siteCheck.status !== 200) {
            throw new Error('Site is not responding')
          }
        } catch (error) {
          console.log('Site accessibility check failed, waiting additional time...')
          // Wait additional time if first check fails
          await new Promise(resolve => setTimeout(resolve, 10000))
        }

        // Return the site data
        res.json({
          status: true,
          data: {
            id: siteData.id,
            wp_url: siteData.wp_url,
            wp_username: siteData.wp_username,
            wp_password: siteData.wp_password,
            s_hash: siteData.s_hash,
            is_pool: siteData.is_pool
          }
        })

        // Try to install plugin in the background
        try {
          await installPlugin(
            siteData.wp_url,
            siteData.wp_username,
            siteData.wp_password,
            code,
            pluginName
          )
        } catch (pluginError) {
          console.error('Plugin installation error (non-fatal):', pluginError)
        }
      } else {
        throw new Error('Invalid site data received')
      }
    } catch (error) {
      console.error('Error in preview-plugin:', error)
      res.status(500).json({
        status: false,
        error: 'Error creating preview site',
        details: error.message
      })
    }
  })

  server.post('/delete-preview-site', async (req, res) => {
    const { siteId } = req.body
    if (!siteId) {
      return res.status(400).send({ error: 'Site ID is required.' })
    }

    try {
      await deleteSite(siteId)
      res.status(200).send({ message: 'Site deleted successfully' })
    } catch (error) {
      console.error('Error deleting site:', error)
      res.status(500).send({ error: 'Error deleting site' })
    }
  })

  server.post('/export-plugin', (req, res) => {
    console.log('Received export-plugin request')
    const { pluginName, code } = req.body
    if (!pluginName || !code) {
      return res.status(400).send({ error: 'Plugin name and code are required.' })
    }

    try {
      const pluginDir = path.join(__dirname, 'temp', pluginName)
      const includesDir = path.join(pluginDir, 'includes')
      const adminDir = path.join(pluginDir, 'admin')
      const publicDir = path.join(pluginDir, 'public')

      // Ensure temp directory exists and is empty
      if (fs.existsSync(pluginDir)) {
        fs.rmSync(pluginDir, { recursive: true, force: true })
      }
      fs.mkdirSync(includesDir, { recursive: true })
      fs.mkdirSync(adminDir, { recursive: true })
      fs.mkdirSync(publicDir, { recursive: true })

      const mainPluginFile = path.join(pluginDir, `${pluginName}.php`)
      fs.writeFileSync(mainPluginFile, code)

      fs.writeFileSync(path.join(includesDir, 'sample-include.php'), "<?php\n// Sample include file\n")
      fs.writeFileSync(path.join(adminDir, 'admin-scripts.js'), "// Sample admin script\n")
      fs.writeFileSync(path.join(publicDir, 'public-scripts.js'), "// Sample public script\n")

      const zipFilePath = path.join(__dirname, `${pluginName}.zip`)
      const output = fs.createWriteStream(zipFilePath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      output.on('close', () => {
        console.log(`ZIP file created: ${zipFilePath} (${archive.pointer()} total bytes)`)
        res.download(zipFilePath, `${pluginName}.zip`, (err) => {
          if (err) {
            console.error('Error downloading file:', err)
          }
          // Clean up files after download
          fs.rmSync(pluginDir, { recursive: true, force: true })
          fs.unlinkSync(zipFilePath)
        })
      })

      archive.on('error', (err) => {
        console.error('Error creating ZIP archive:', err)
        res.status(500).send({ error: 'Error creating ZIP file.' })
      })

      archive.pipe(output)
      archive.directory(pluginDir, false)
      archive.finalize()
    } catch (error) {
      console.error('Error in export-plugin:', error)
      res.status(500).send({ error: 'Error creating plugin files.' })
    }
  })

  server.get('/site-status', async (req, res) => {
    const { siteName } = req.query
    
    try {
      // Get list of recent sites
      const response = await axios.get(
        `${INSTA_WP_API_URL}/sites`,
        {
          headers: {
            Authorization: `Bearer ${INSTA_WP_API_KEY}`
          }
        }
      )
      
      // Find the site by name
      const site = response.data.data.find(s => s.site_name.includes(siteName))
      
      if (site) {
        res.json({
          status: true,
          data: {
            id: site.id,
            wp_url: site.wp_url,
            wp_username: site.wp_username,
            wp_password: site.wp_password,
            s_hash: site.s_hash,
            is_pool: site.is_pool
          }
        })
      } else {
        res.status(404).json({
          status: false,
          error: 'Site not found'
        })
      }
    } catch (error) {
      console.error('Error getting site status:', error)
      res.status(500).json({
        status: false,
        error: 'Error getting site status',
        details: error.response?.data || error.message
      })
    }
  })

  // Default catch-all handler for Next.js
  server.all('*', (req, res) => {
    return handle(req, res)
  })

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log('InstaWP API Key available:', !!INSTA_WP_API_KEY)
  })
})

