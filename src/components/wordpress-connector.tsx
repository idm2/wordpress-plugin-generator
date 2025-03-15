"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Link, Globe, Check, X, AlertCircle, Download, FileCode } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface WordPressConnection {
  apiKey: string
  siteName: string
  siteUrl: string
  wpVersion: string
  connected: boolean
  lastConnected: string
  enableDebugging?: boolean
  ftpDetails?: {
    host: string
    port: number
    username: string
    password: string
    protocol: 'ftp' | 'sftp'
    rootPath: string
    secure: boolean
  }
}

interface WordPressConnectorProps {
  onConnect: (connection: WordPressConnection) => void
  currentConnection: WordPressConnection | null
  onDownloadClick?: () => Promise<string | null>
  onDownloadConnectorPlugin?: () => Promise<void>
}

export function WordPressConnector({ onConnect, currentConnection }: WordPressConnectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [siteUrl, setSiteUrl] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerifyingFtp, setIsVerifyingFtp] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    api: boolean;
    ftp: boolean;
    message: string;
  } | null>(null)
  const [apiVerificationResult, setApiVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null)
  const [ftpVerificationResult, setFtpVerificationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enableDebugging, setEnableDebugging] = useState(false)
  const [activeTab, setActiveTab] = useState("connection")
  const [hasAddedFilesystemConstants, setHasAddedFilesystemConstants] = useState(false)
  const [hasAddedDebugSettings, setHasAddedDebugSettings] = useState(false)
  
  const [ftpHost, setFtpHost] = useState("")
  const [ftpPort, setFtpPort] = useState("21")
  const [ftpUsername, setFtpUsername] = useState("")
  const [ftpPassword, setFtpPassword] = useState("")
  const [ftpProtocol, setFtpProtocol] = useState<'ftp' | 'sftp'>('ftp')
  const [ftpRootPath, setFtpRootPath] = useState("/public_html")
  const [includeFtpDetails, setIncludeFtpDetails] = useState(false)
  const [ftpSecure, setFtpSecure] = useState(true)
  
  // Verify only the API connection
  const verifyApiConnection = async () => {
    if (!apiKey || !siteUrl) {
      setError("API key and site URL are required")
      return
    }
    
    setIsVerifying(true)
    setError(null)
    setApiVerificationResult(null)
    
    try {
      let formattedUrl = siteUrl
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl
      }
      
      if (formattedUrl.endsWith('/')) {
        formattedUrl = formattedUrl.slice(0, -1)
      }

      // Verify API connection
      const apiResponse = await fetch("/api/wordpress/validate-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          siteUrl: formattedUrl,
          verify_only: true
        }),
      })
      
      const apiData = await apiResponse.json()
      const apiSuccess = apiResponse.ok && apiData.success;
      
      // Set the API verification result
      setApiVerificationResult({
        success: apiSuccess,
        message: apiSuccess ? "API connection successful" : "API connection failed"
      });
      
      if (!apiSuccess) {
        throw new Error(apiData.message || "Failed to connect to WordPress site");
      }
    } catch (err) {
      console.error("API verification error:", err);
      setError(err instanceof Error ? err.message : "Failed to verify API connection");
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Verify only the FTP connection
  const verifyFtpConnection = async () => {
    if (!includeFtpDetails) {
      setError("Please enable FTP/SFTP details first");
      return;
    }
    
    if (!ftpHost || !ftpUsername || !ftpPassword) {
      setError("FTP/SFTP host, username, and password are required");
      return;
    }
    
    const portNumber = parseInt(ftpPort, 10);
    if (isNaN(portNumber) || portNumber <= 0 || portNumber > 65535) {
      setError("Please enter a valid port number (1-65535)");
      return;
    }
    
    setIsVerifyingFtp(true);
    setError(null);
    setFtpVerificationResult(null);
    
    try {
      // Also verify API connection for completeness
      let apiSuccess = false;
      if (apiKey && siteUrl) {
        let formattedUrl = siteUrl;
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
          formattedUrl = 'https://' + formattedUrl;
        }
        
        if (formattedUrl.endsWith('/')) {
          formattedUrl = formattedUrl.slice(0, -1);
        }
        
        const apiResponse = await fetch("/api/wordpress/validate-connection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: apiKey,
            siteUrl: formattedUrl,
            verify_only: true
          }),
        });
        
        const apiData = await apiResponse.json();
        apiSuccess = apiResponse.ok && apiData.success;
      }
      
      // Verify FTP connection
      const ftpResponse = await fetch("/api/wordpress/verify-ftp-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: ftpHost,
          port: portNumber,
          username: ftpUsername,
          password: ftpPassword,
          protocol: ftpProtocol,
          rootPath: ftpRootPath,
          secure: ftpSecure
        }),
      });
      
      const ftpData = await ftpResponse.json();
      const ftpSuccess = ftpResponse.ok && ftpData.success;
      
      // Set the FTP verification result
      setFtpVerificationResult({
        success: ftpSuccess,
        message: ftpSuccess 
          ? "FTP connection successful" 
          : `FTP verification failed: ${ftpData.message || "Unknown error"}`
      });
      
      // Also update the combined verification result for backward compatibility
      setVerificationResult({
        api: apiSuccess,
        ftp: ftpSuccess,
        message: ftpSuccess 
          ? (apiSuccess ? "All connections verified successfully" : "FTP connection successful, but API verification failed")
          : "FTP connection failed"
      });
      
      if (!ftpSuccess) {
        throw new Error(ftpData.message || "Failed to connect to FTP server");
      }
    } catch (err) {
      console.error("FTP verification error:", err);
      setError(err instanceof Error ? err.message : "Failed to verify FTP connection");
    } finally {
      setIsVerifyingFtp(false);
    }
  };

  const handleConnect = async () => {
    if (!apiKey || !siteUrl) {
      setError("API key and site URL are required")
      return
    }
    
    if (!hasAddedFilesystemConstants) {
      setError("Please confirm that you have added the filesystem constants to wp-config.php")
      setActiveTab("filesystem")
      return
    }

    // Check if debugging is enabled but FTP details are not provided
    if (enableDebugging && hasAddedDebugSettings && !includeFtpDetails) {
      setError("FTP/SFTP details are required when debugging is enabled")
      setIncludeFtpDetails(true)
      setActiveTab("ftp")
      return
    }

    if (includeFtpDetails) {
      if (!ftpHost || !ftpUsername || !ftpPassword) {
        setError("FTP/SFTP host, username, and password are required")
        setActiveTab("ftp")
        return
      }
      
      const portNumber = parseInt(ftpPort, 10)
      if (isNaN(portNumber) || portNumber <= 0 || portNumber > 65535) {
        setError("Please enter a valid port number (1-65535)")
        setActiveTab("ftp")
        return
      }
    }
    
    setIsConnecting(true)
    setError(null)
    
    try {
      let formattedUrl = siteUrl
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = 'https://' + formattedUrl
      }
      
      if (formattedUrl.endsWith('/')) {
        formattedUrl = formattedUrl.slice(0, -1)
      }

      const response = await fetch("/api/wordpress/validate-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          siteUrl: formattedUrl,
          enableDebugging: enableDebugging && hasAddedDebugSettings,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to connect to WordPress site")
      }
      
      const connection: WordPressConnection = {
        apiKey,
        siteUrl: formattedUrl,
        siteName: data.siteName || new URL(formattedUrl).hostname,
        wpVersion: data.wpVersion,
        connected: true,
        lastConnected: new Date().toISOString(),
        enableDebugging: enableDebugging && hasAddedDebugSettings
      }
      
      if (includeFtpDetails) {
        connection.ftpDetails = {
          host: ftpHost,
          port: parseInt(ftpPort, 10),
          username: ftpUsername,
          password: ftpPassword,
          protocol: ftpProtocol,
          rootPath: ftpRootPath,
          secure: ftpSecure
        }
      } else if (enableDebugging && hasAddedDebugSettings) {
        // If debugging is enabled but we somehow got here without FTP details,
        // redirect to the FTP tab
        setError("FTP/SFTP details are required when debugging is enabled")
        setIncludeFtpDetails(true)
        setActiveTab("ftp")
        return
      }
      
      onConnect(connection)
      setIsOpen(false)
    } catch (err) {
      console.error("Connection error:", err)
      setError(err instanceof Error ? err.message : "Failed to connect to WordPress site")
    } finally {
      setIsConnecting(false)
    }
  }
  
  return (
    <>
      {currentConnection ? (
          <Button 
            variant="black" 
            size="sm"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 wordpress-connector-button"
          >
            <Check className="h-4 w-4 text-green-500" />
            Connected
          </Button>
      ) : (
        <Button 
          onClick={() => {
            setIsOpen(true)
            if (currentConnection && typeof currentConnection === 'object') {
              const conn = currentConnection as WordPressConnection;
              setApiKey(conn.apiKey || "")
              setSiteUrl(conn.siteUrl || "")
              setEnableDebugging(conn.enableDebugging || false)
              
              if (conn.ftpDetails) {
                setFtpHost(conn.ftpDetails.host || "")
                setFtpPort(conn.ftpDetails.port?.toString() || "21")
                setFtpUsername(conn.ftpDetails.username || "")
                setFtpPassword(conn.ftpDetails.password || "")
                setFtpProtocol(conn.ftpDetails.protocol || 'ftp')
                setFtpRootPath(conn.ftpDetails.rootPath || "/public_html")
                setIncludeFtpDetails(true)
                setFtpSecure(conn.ftpDetails.secure || true)
              }
            }
          }}
          variant="black"
          size="sm"
          className="flex items-center gap-2 wordpress-connector-button"
        >
          <Link className="h-4 w-4" />
          Connect to WordPress
        </Button>
      )}
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[75rem] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Connect to WordPress</DialogTitle>
            <DialogDescription>
              Connect to your WordPress site to deploy plugins directly.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="connection" value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="connection">Connection</TabsTrigger>
              <TabsTrigger value="filesystem">Filesystem</TabsTrigger>
              <TabsTrigger value="debugging">Debug Mode</TabsTrigger>
              <TabsTrigger value="ftp">FTP/SFTP</TabsTrigger>
            </TabsList>
            
            <TabsContent value="connection" className="mt-4 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your WordPress API key"
                  />
                  <p className="text-sm text-muted-foreground">
                    This is the API key from the Plugin Generator Connector plugin.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="site-url">WordPress Site URL</Label>
                  <Input
                    id="site-url"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="https://your-wordpress-site.com"
                  />
                  <p className="text-sm text-muted-foreground">
                    The URL of your WordPress site (e.g., https://example.com).
                  </p>
                </div>
                
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    onClick={verifyApiConnection} 
                    disabled={isVerifying || !apiKey || !siteUrl}
                    className="flex items-center gap-1"
                  >
                    {isVerifying ? (
                      <>Verifying...</>
                    ) : (
                      <>
                        <Globe className="h-4 w-4" />
                        Verify API Connection
                      </>
                    )}
                  </Button>
                </div>
                
                {apiVerificationResult && (
                  <div className={`p-4 rounded-md ${
                    apiVerificationResult.success 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-amber-50 border border-amber-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {apiVerificationResult.success ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">API Connection Verification</p>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm flex items-center gap-1">
                            API Connection: 
                            {apiVerificationResult.success ? (
                              <><Check className="h-4 w-4 text-green-500" /> Success</>
                            ) : (
                              <><X className="h-4 w-4 text-red-500" /> Failed</>
                            )}
                          </p>
                        </div>
                        <p className="text-sm mt-1">{apiVerificationResult.message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="filesystem" className="mt-4 space-y-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">Required Filesystem Constants</h3>
                <p className="text-sm mb-3">
                  WordPress requires filesystem constants to be defined in your wp-config.php file for plugin installation and updates to work properly.
                </p>
                <div className="bg-white p-4 rounded-md border border-blue-200 mb-3">
                  <h4 className="text-sm font-medium mb-2">Step 1: Edit your wp-config.php file</h4>
                  <p className="text-sm mb-2">
                    Open your wp-config.php file in a text editor. This file is located in the root directory of your WordPress installation.
                  </p>
                  
                  <h4 className="text-sm font-medium mb-2 mt-4">Step 2: Add the following code</h4>
                  <p className="text-sm mb-2">
                    Add these lines just before the line that says <code className="bg-blue-50 px-1 py-0.5 rounded">/* That's all, stop editing! Happy publishing. */</code>:
                  </p>
                  <pre className="bg-blue-100 p-3 rounded text-xs overflow-auto font-mono">
                    define('FS_CHMOD_DIR', 0755);<br/>
                    define('FS_CHMOD_FILE', 0644);
                  </pre>
                  
                  <h4 className="text-sm font-medium mb-2 mt-4">Step 3: Save the file</h4>
                  <p className="text-sm">
                    Save the wp-config.php file and upload it back to your server if you're editing it locally.
                  </p>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-md">
                  <div className="flex-shrink-0 mt-0.5">
                    <Checkbox 
                      id="added-filesystem-constants" 
                      checked={hasAddedFilesystemConstants}
                      onCheckedChange={(checked) => setHasAddedFilesystemConstants(checked === true)}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="added-filesystem-constants"
                      className="text-base font-medium"
                    >
                      I have added the filesystem constants to wp-config.php
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      You must add these constants to your wp-config.php file before connecting to WordPress
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="debugging" className="mt-4 space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-md">
                <div className="flex-shrink-0 mt-0.5">
                  <Checkbox 
                    id="enable-debugging" 
                    checked={enableDebugging}
                    onCheckedChange={(checked) => setEnableDebugging(checked === true)}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="enable-debugging"
                    className="text-base font-medium"
                  >
                    Enable WordPress debugging
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enables debug mode to help identify plugin errors by reading WordPress debug logs
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">Debug Mode Information</h3>
                <p className="text-sm mb-3">
                  To enable WordPress debugging, you need to add the following code to your wp-config.php file:
                </p>
                <pre className="bg-blue-100 p-3 rounded text-xs overflow-auto font-mono">
                  define('WP_DEBUG', true);<br/>
                  define('WP_DEBUG_LOG', true);<br/>
                  define('WP_DEBUG_DISPLAY', false);<br/>
                  @ini_set('display_errors', 0);
                </pre>
                
                <div className="mt-4 p-3 bg-amber-100 rounded-md text-sm text-amber-800 flex items-start">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Important:</strong> When debugging is enabled, you must also provide FTP/SFTP details to allow access to debug logs, especially when WordPress encounters errors.
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-md mt-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Checkbox 
                      id="added-debug-settings" 
                      checked={hasAddedDebugSettings}
                      onCheckedChange={(checked) => setHasAddedDebugSettings(checked === true)}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="added-debug-settings"
                      className="text-base font-medium"
                    >
                      I have added the debug settings to wp-config.php
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      You must add these settings to your wp-config.php file to enable debugging
                    </p>
                  </div>
                </div>
                
                {enableDebugging && hasAddedDebugSettings && !includeFtpDetails && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-md mt-3">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-red-800">FTP/SFTP Details Required</h4>
                        <p className="text-sm text-red-700 mt-1">
                          To use debugging features, you must provide FTP/SFTP connection details. This allows the system to access debug logs when WordPress is experiencing issues.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
                          onClick={() => {
                            setIncludeFtpDetails(true);
                            setActiveTab("ftp");
                          }}
                        >
                          Go to FTP/SFTP Settings
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="ftp" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="include-ftp-details" 
                    checked={includeFtpDetails} 
                    onCheckedChange={(checked) => setIncludeFtpDetails(checked as boolean)}
                  />
                  <label 
                    htmlFor="include-ftp-details" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Include FTP/SFTP details for emergency access
                  </label>
                </div>
                
                {includeFtpDetails && (
                  <>
                    <div className="bg-amber-50 p-4 rounded-md">
                      <p className="text-amber-800 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        FTP/SFTP access is used for emergency operations when your WordPress site is down.
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">Why FTP/SFTP Access is Important</h3>
                <p className="text-sm mb-3">
                  FTP/SFTP access provides a direct connection to your WordPress files, which is crucial in these scenarios:
                </p>
                <ul className="list-disc ml-5 text-sm space-y-2">
                  <li><strong>Emergency Plugin Removal:</strong> If a plugin causes your site to crash or become inaccessible, FTP/SFTP access allows us to directly delete the problematic plugin files.</li>
                  <li><strong>Debug Log Access:</strong> When your site is down, we can still access debug logs to identify the cause of the issue.</li>
                  <li><strong>Direct File Editing:</strong> Make emergency changes to fix critical issues without needing the WordPress admin area.</li>
                </ul>
                <div className="mt-3 p-3 bg-amber-100 rounded-md text-sm text-amber-800 flex items-start">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Security Note:</strong> Your FTP/SFTP credentials are stored securely and only used for emergency access to your WordPress files. We never share these details with third parties.
                  </div>
                </div>
              </div>
              
              {includeFtpDetails && (
                <div className="grid gap-4 mt-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ftp-protocol" className="text-right font-medium">
                      Protocol
                    </Label>
                    <div className="col-span-3">
                      <Select
                        value={ftpProtocol}
                        onValueChange={(value) => setFtpProtocol(value as 'ftp' | 'sftp')}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select protocol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ftp">FTP</SelectItem>
                          <SelectItem value="sftp">SFTP (SSH)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        SFTP is more secure than standard FTP
                      </p>
                    </div>
                  </div>
                  
                  {ftpProtocol === 'ftp' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="ftp-secure" className="text-right font-medium">
                        Secure Connection
                      </Label>
                      <div className="col-span-3 flex items-center space-x-2">
                        <Checkbox 
                          id="ftp-secure" 
                          checked={ftpSecure}
                          onCheckedChange={(checked) => setFtpSecure(checked === true)}
                        />
                        <Label htmlFor="ftp-secure" className="text-sm">
                          Use FTPS (FTP over TLS/SSL)
                        </Label>
                        <p className="text-xs text-muted-foreground ml-2">
                          Required by many modern FTP servers for security
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ftp-host" className="text-right font-medium">
                      Host
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="ftp-host"
                        value={ftpHost}
                        onChange={(e) => setFtpHost(e.target.value)}
                        placeholder="ftp.example.com"
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        The hostname or IP address of your FTP/SFTP server
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ftp-port" className="text-right font-medium">
                      Port
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="ftp-port"
                        value={ftpPort}
                        onChange={(e) => setFtpPort(e.target.value)}
                        placeholder="21"
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Standard ports: 21 for FTP, 22 for SFTP
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ftp-username" className="text-right font-medium">
                      Username
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="ftp-username"
                        value={ftpUsername}
                        onChange={(e) => setFtpUsername(e.target.value)}
                        placeholder="username"
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ftp-password" className="text-right font-medium">
                      Password
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="ftp-password"
                        type="password"
                        value={ftpPassword}
                        onChange={(e) => setFtpPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ftp-root-path" className="text-right font-medium">
                      WordPress Root Path
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="ftp-root-path"
                        value={ftpRootPath}
                        onChange={(e) => setFtpRootPath(e.target.value)}
                        placeholder="/public_html"
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        The path to your WordPress installation (e.g., /public_html or /www)
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      onClick={verifyFtpConnection} 
                      disabled={isVerifyingFtp || !ftpHost || !ftpUsername || !ftpPassword}
                      className="flex items-center gap-1"
                    >
                      {isVerifyingFtp ? (
                        <>Verifying FTP...</>
                      ) : (
                        <>
                          <Globe className="h-4 w-4" />
                          Verify FTP Connection
                        </>
                      )}
                    </Button>
                    
                    {ftpVerificationResult && (
                      <div className={`mt-4 p-4 rounded-md ${
                        ftpVerificationResult.success 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-amber-50 border border-amber-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {ftpVerificationResult.success ? (
                              <Check className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-amber-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">FTP Connection Verification</p>
                            <div className="mt-1 space-y-1">
                              <p className="text-sm flex items-center gap-1">
                                FTP Connection: 
                                {ftpVerificationResult.success ? (
                                  <><Check className="h-4 w-4 text-green-500" /> Success</>
                                ) : (
                                  <><X className="h-4 w-4 text-red-500" /> Failed</>
                                )}
                              </p>
                            </div>
                            <p className="text-sm mt-1">{ftpVerificationResult.message}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 mb-4 border-t pt-4">
            <h3 className="text-sm font-medium mb-2">WordPress Connector Plugin</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Download and install this plugin on your WordPress site to generate an API key for connecting to the WordPress Plugin Generator.
            </p>
            <div className="flex justify-start mb-4">
              <a 
                href="/plugin-generator-connector.zip" 
                download="plugin-generator-connector.zip"
                className="inline-flex items-center gap-1 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md"
              >
                <Download className="h-4 w-4" />
                Download Connector Plugin
              </a>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row items-start gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting || !apiKey || !siteUrl}
            >
              {isConnecting ? "Connecting..." : "Save Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 