require("dotenv").config({ path: process.env.NODE_ENV !== "production" ? ".env.local" : "" })
const next = require("next")
const express = require("express")
const cors = require("cors")
const axios = require("axios")
const archiver = require("archiver")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const FormData = require("form-data")

const dev = process.env.NODE_ENV !== "production"
const hostname = "localhost"
const port = parseInt(process.env.PORT, 10) || 3000
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const INSTA_WP_API_URL = "https://app.instawp.io/api/v2"
const INSTA_WP_API_KEY = process.env.NEXT_PUBLIC_INSTA_WP_API_KEY

if (!INSTA_WP_API_KEY) {
  console.error("INSTA_WP_API_KEY is not set")
  process.exit(1)
}

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "logs")
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

// Setup logging
const logFile = path.join(logsDir, "app.log")
const errorLogFile = path.join(logsDir, "error.log")

const logStream = fs.createWriteStream(logFile, { flags: "a" })
const errorLogStream = fs.createWriteStream(errorLogFile, { flags: "a" })

// Log both to file and console
const log = (message) => {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  console.log(logMessage)
  logStream.write(logMessage)
}

const logError = (error) => {
  const timestamp = new Date().toISOString()
  const errorMessage = `[${timestamp}] ERROR: ${error.stack || error}\n`
  console.error(errorMessage)
  errorLogStream.write(errorMessage)
}

// Ensure temp directory exists
const tempDir = path.join(__dirname, "temp")
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

// Helper functions
const generateRandomSiteName = () => {
  return `wp-${crypto.randomBytes(8).toString("hex")}`
}

const pollTaskStatus = async (taskId) => {
  let status = "pending"
  while (status === "pending") {
    await new Promise((resolve) => setTimeout(resolve, 5000))
    const response = await axios.get(`${INSTA_WP_API_URL}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${INSTA_WP_API_KEY}` },
    })
    status = response.data.data.status
  }
  return status
}

const installPlugin = async (siteId, pluginZipUrl) => {
  const formData = new FormData()
  formData.append("plugin_zip_url", pluginZipUrl)

  const response = await axios.post(`${INSTA_WP_API_URL}/sites/${siteId}/plugins`, formData, {
    headers: {
      ...formData.getHeaders(),
      Authorization: `Bearer ${INSTA_WP_API_KEY}`,
    },
  })

  return response.data
}

const deleteSite = async (siteId) => {
  try {
    await axios.delete(`${INSTA_WP_API_URL}/sites/${siteId}`, {
      headers: { Authorization: `Bearer ${INSTA_WP_API_KEY}` },
    })
    return true
  } catch (error) {
    console.error("Error deleting site:", error)
    return false
  }
}

app.prepare().then(() => {
  const server = express()

  // Add middleware
  server.use(express.json({ limit: "50mb" }))
  server.use(express.urlencoded({ extended: true, limit: "50mb" }))
  server.use(cors())

  // Add security headers
  server.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("X-Frame-Options", "SAMEORIGIN")
    res.setHeader("X-XSS-Protection", "1; mode=block")
    next()
  })

  // Check if required API keys are set
  const requiredEnvVars = ['INSTA_WP_API_KEY', 'OPENAI_API_KEY']
  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key])
  
  if (missingEnvVars.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missingEnvVars.join(', ')}`)
    if (process.env.NODE_ENV === 'development') {
      console.log('Make sure these are set in your .env.local file')
    } else {
      console.log('Make sure these are set in your Vercel environment variables')
    }
  }

  // Basic health check endpoint
  server.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" })
  })

  // Add proxy server routes
  server.post("/preview-plugin", async (req, res) => {
    try {
      const { pluginName, pluginCode } = req.body

      // Create a temporary ZIP file
      const zipFilePath = path.join(tempDir, `${pluginName}.zip`)
      const output = fs.createWriteStream(zipFilePath)
      const archive = archiver("zip", { zlib: { level: 9 } })

      output.on("close", async () => {
        log("ZIP file created successfully")

        // Create a new WordPress site
        const siteName = generateRandomSiteName()
        const createSiteResponse = await axios.post(
          `${INSTA_WP_API_URL}/sites`,
          { name: siteName },
          { headers: { Authorization: `Bearer ${INSTA_WP_API_KEY}` } },
        )

        const siteId = createSiteResponse.data.data.id
        const taskId = createSiteResponse.data.data.task_id

        // Poll for site creation status
        const status = await pollTaskStatus(taskId)

        if (status === "completed") {
          // Install the plugin
          const pluginZipUrl = `file://${zipFilePath}`
          const installResponse = await installPlugin(siteId, pluginZipUrl)

          // Get the site URL
          const siteResponse = await axios.get(`${INSTA_WP_API_URL}/sites/${siteId}`, {
            headers: { Authorization: `Bearer ${INSTA_WP_API_KEY}` },
          })

          const siteUrl = siteResponse.data.data.url

          res.json({ success: true, siteUrl, siteId })
        } else {
          throw new Error("Site creation failed")
        }

        // Clean up the temporary ZIP file
        fs.unlinkSync(zipFilePath)
      })

      archive.on("error", (err) => {
        throw err
      })

      archive.pipe(output)
      archive.append(pluginCode, { name: `${pluginName}.php` })
      archive.finalize()
    } catch (error) {
      logError("Preview plugin error:", error)
      res.status(500).json({ error: "Failed to create preview site" })
    }
  })

  server.post("/delete-preview-site", async (req, res) => {
    try {
      const { siteId } = req.body
      const success = await deleteSite(siteId)
      res.json({ success })
    } catch (error) {
      logError("Delete preview site error:", error)
      res.status(500).json({ error: "Failed to delete preview site" })
    }
  })

  server.post("/export-plugin", async (req, res) => {
    log("Received export-plugin request")
    const { pluginName, code } = req.body

    if (!pluginName || !code) {
      return res.status(400).json({ error: "Plugin name and code are required." })
    }

    try {
      const pluginDir = path.join(tempDir, pluginName)
      const includesDir = path.join(pluginDir, "includes")
      const adminDir = path.join(pluginDir, "admin")
      const publicDir = path.join(pluginDir, "public")

      // Clean up any existing directory
      if (fs.existsSync(pluginDir)) {
        fs.rmSync(pluginDir, { recursive: true, force: true })
      }

      // Create directory structure
      fs.mkdirSync(includesDir, { recursive: true })
      fs.mkdirSync(adminDir, { recursive: true })
      fs.mkdirSync(publicDir, { recursive: true })

      // Write plugin files
      const mainPluginFile = path.join(pluginDir, `${pluginName}.php`)
      fs.writeFileSync(mainPluginFile, code)

      // Add standard plugin structure files
      fs.writeFileSync(path.join(includesDir, "class-loader.php"), "<?php\n// Plugin loader")
      fs.writeFileSync(path.join(adminDir, "admin.js"), "// Admin JavaScript")
      fs.writeFileSync(path.join(publicDir, "public.js"), "// Public JavaScript")

      // Create ZIP file
      const zipFilePath = path.join(tempDir, `${pluginName}.zip`)
      const output = fs.createWriteStream(zipFilePath)
      const archive = archiver("zip", { zlib: { level: 9 } })

      // Set up archive events
      output.on("close", () => {
        log(`ZIP created successfully: ${archive.pointer()} total bytes`)

        // Set correct headers for ZIP download
        res.setHeader("Content-Type", "application/zip")
        res.setHeader("Content-Disposition", `attachment; filename="${pluginName}.zip"`)

        // Stream the file
        const fileStream = fs.createReadStream(zipFilePath)
        fileStream.pipe(res)

        // Clean up after streaming is complete
        fileStream.on("end", () => {
          // Clean up files
          fs.rmSync(pluginDir, { recursive: true, force: true })
          fs.unlinkSync(zipFilePath)
          log("Cleanup completed")
        })
      })

      archive.on("error", (err) => {
        logError("Archive error:", err)
        res.status(500).json({ error: "Failed to create ZIP file" })
      })

      // Pipe archive data to the file
      archive.pipe(output)
      archive.directory(pluginDir, false)
      archive.finalize()
    } catch (error) {
      logError("Export plugin error:", error)
      res.status(500).json({
        error: "Failed to create plugin files",
        details: error.message,
      })
    }
  })

  server.get("/site-status", async (req, res) => {
    try {
      const { siteId } = req.query
      const response = await axios.get(`${INSTA_WP_API_URL}/sites/${siteId}`, {
        headers: { Authorization: `Bearer ${INSTA_WP_API_KEY}` },
      })
      res.json(response.data)
    } catch (error) {
      logError("Site status error:", error)
      res.status(500).json({ error: "Failed to get site status" })
    }
  })

  // Default catch-all handler for Next.js
  server.all("*", (req, res) => {
    return handle(req, res)
  })

  // Error handling middleware
  server.use((err, req, res, next) => {
    logError("Server error:", err)
    res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : "An unexpected error occurred",
    })
  })

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log("InstaWP API Key available:", !!INSTA_WP_API_KEY)
    log(`> Server ready on http://${hostname}:${port}`)
    log(`> Environment: ${process.env.NODE_ENV || "development"}`)
    log(`> Working directory: ${__dirname}`)
  })
})

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logError("Uncaught exception:", error)
})

process.on("unhandledRejection", (error) => {
  logError("Unhandled rejection:", error)
})

// Cleanup on exit
process.on("SIGINT", () => {
  log("Shutting down server...")
  // Clean up temp directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
  logStream.end()
  errorLogStream.end()
  process.exit(0)
})

