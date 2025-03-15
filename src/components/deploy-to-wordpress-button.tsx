"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, Check, AlertCircle, Download, UploadCloud, Info, MessageSquare, Trash2, FileCode, RefreshCw, Globe, Loader2, Link } from "lucide-react"
import { WordPressConnection } from "./wordpress-connector"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DeployToWordPressButtonProps {
  pluginZip: string // Base64 encoded plugin ZIP
  pluginName: string
  pluginSlug?: string // Plugin slug for deletion
  connection: WordPressConnection | null
  onOpenConnectModal: () => void // Function to open the WordPress connection modal
  disabled?: boolean
  generatedCode?: boolean // Whether a plugin has been generated
  onDownloadClick: () => Promise<string | null> // Function to generate ZIP without downloading
  onSendToDiscussion?: (message: string) => void // Function to send error to discussion
  onGeneratePluginZip?: () => Promise<string | null> // Function to generate plugin ZIP
  onDeploymentSuccess?: (pluginSlug: string) => void // Callback when deployment is successful
}

interface DeploymentDetails {
  success: boolean;
  message: string;
  activated?: boolean;
  plugin_url?: string;
  admin_url?: string;
}

export function DeployToWordPressButton({ 
  pluginZip, 
  pluginName, 
  pluginSlug,
  connection, 
  onOpenConnectModal,
  disabled = false,
  generatedCode = false,
  onDownloadClick,
  onSendToDiscussion,
  onGeneratePluginZip,
  onDeploymentSuccess
}: DeployToWordPressButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<string | null>(null)
  const [deploymentSuccess, setDeploymentSuccess] = useState(false)
  const [deploymentMessage, setDeploymentMessage] = useState("")
  const [deploymentDetails, setDeploymentDetails] = useState<DeploymentDetails | null>(null)
  const [debugLog, setDebugLog] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("details")
  const [pluginHeaderInfo, setPluginHeaderInfo] = useState<any>(null)
  const [activationErrorType, setActivationErrorType] = useState<string | null>(null)
  const [activationTroubleshooting, setActivationTroubleshooting] = useState<string[] | null>(null)
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false)
  const [isCheckingDebugLog, setIsCheckingDebugLog] = useState(false)
  const [debugLogContent, setDebugLogContent] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState(false)
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false)
  const [isPerformingEmergencyOperation, setIsPerformingEmergencyOperation] = useState(false)
  const [emergencyOperation, setEmergencyOperation] = useState<'delete-plugin' | 'read-debug-log'>('delete-plugin')
  const [emergencyResult, setEmergencyResult] = useState<any | null>(null)
  const [forceUpdate, setForceUpdate] = useState(false)
  const [deploymentResult, setDeploymentResult] = useState<any | null>(null)
  const [troubleshootingSteps, setTroubleshootingSteps] = useState<string[] | null>(null)
  const [debugLogs, setDebugLogs] = useState<string | null>(null)
  const [hasUpdatedConnection, setHasUpdatedConnection] = useState(false)
  const connectionRef = useRef(connection)
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [isZipGenerated, setIsZipGenerated] = useState(false);
  const [zipGenerationError, setZipGenerationError] = useState<string | null>(null);
  const [freshZipContent, setFreshZipContent] = useState<string | null>(null);
  
  // Add a useEffect to reset emergencyResult when connection changes
  useEffect(() => {
    if (emergencyResult && !emergencyResult.success) {
      console.log("Connection details changed, resetting emergency result");
      setEmergencyResult(null);
    }
  }, [connection]);
  
  // Add a useEffect to detect connection changes and auto-retry operations
  useEffect(() => {
    // Check if connection has changed
    if (connection !== connectionRef.current) {
      console.log("Connection details have been updated");
      connectionRef.current = connection;
      setHasUpdatedConnection(true);
      
      // If the emergency modal is open, automatically retry the operation
      if (isEmergencyModalOpen && emergencyResult && !emergencyResult.success) {
        console.log("Automatically retrying operation with new connection details");
        // Small delay to ensure state updates have completed
        setTimeout(() => {
          performEmergencyOperation();
        }, 100);
      }
    }
  }, [connection, isEmergencyModalOpen, emergencyResult]);
  
  // Function to detect ModSecurity issues
  const detectModSecurityIssue = (errorMessage: string): boolean => {
    const modSecurityIndicators = [
      "403 Forbidden",
      "Access Denied",
      "ModSecurity",
      "Firewall",
      "WAF",
      "blocked",
      "security rule"
    ];
    
    return modSecurityIndicators.some(indicator => 
      errorMessage.toLowerCase().includes(indicator.toLowerCase())
    );
  };
  
  // Component to display ModSecurity warning
  const ModSecurityWarning = () => (
    <div className="bg-amber-50 border border-amber-300 p-4 rounded-md mt-4">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-amber-800">Possible ModSecurity Issue Detected</h4>
          <p className="text-sm text-amber-700 mt-1">
            The error you're experiencing may be caused by ModSecurity rules on your WordPress server.
            ModSecurity is a web application firewall that can block REST API requests.
          </p>
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-amber-800">Recommended Actions:</p>
            <ol className="list-decimal list-inside text-sm text-amber-700 space-y-1 ml-2">
              <li>Contact your hosting provider to check if ModSecurity is enabled</li>
              <li>Ask them to whitelist WordPress REST API endpoints (wp-json/)</li>
              <li>Specifically request them to allow the plugin-generator endpoints</li>
              <li>If you have access to server configuration, add these endpoints to the ModSecurity whitelist</li>
            </ol>
          </div>
          <p className="text-sm text-amber-700 mt-3">
            Common ModSecurity rules that block WordPress REST API requests include rules against POST requests
            with JSON data, file uploads, and PHP code in request bodies.
          </p>
        </div>
      </div>
    </div>
  );
  
  const handleDeploy = async () => {
    if (!connection) {
      onOpenConnectModal()
      return
    }
    
    // Open the dialog immediately to show loading state
    setIsOpen(true)
    setIsDeploying(false) // Don't show deployment loading yet
    setIsGeneratingZip(true) // Show ZIP generation loading
    setIsZipGenerated(false) // Reset ZIP generation state
    setZipGenerationError(null) // Clear any previous ZIP generation errors
    setError(null) // Clear any previous errors
    setErrorDetails(null)
    
    console.log("Starting ZIP generation process for deployment...");
    
    try {
      // IMPORTANT: Always generate a fresh ZIP to ensure we have the latest code
      // Don't use the cached pluginZip as it might be outdated
      if (generatedCode) {
        console.log("Generating fresh plugin ZIP with current code for deployment...");
        
        // Try to use onGeneratePluginZip if available
        if (onGeneratePluginZip) {
          try {
            console.log("Using onGeneratePluginZip to generate fresh ZIP...");
            const generatedZipContent = await onGeneratePluginZip();
            
            if (generatedZipContent && generatedZipContent.length > 100) {
              console.log(`Successfully generated fresh plugin ZIP with size: ${generatedZipContent.length} characters`);
              setIsGeneratingZip(false);
              setIsZipGenerated(true);
              
              // Store the fresh ZIP content for deployment
              setFreshZipContent(generatedZipContent);
              return; // Exit early, don't auto-deploy
            }
          } catch (err) {
            console.error("Error in onGeneratePluginZip:", err);
          }
        }
        
        // Fallback to onDownloadClick if onGeneratePluginZip failed or is not available
        if (onDownloadClick) {
          try {
            console.log("Falling back to onDownloadClick to generate fresh ZIP...");
            const downloadedZipContent = await onDownloadClick();
            
            if (downloadedZipContent && downloadedZipContent.length > 100) {
              console.log(`Successfully generated fresh plugin ZIP with size: ${downloadedZipContent.length} characters`);
              setIsGeneratingZip(false);
              setIsZipGenerated(true);
              
              // Store the fresh ZIP content for deployment
              setFreshZipContent(downloadedZipContent);
              return; // Exit early, don't auto-deploy
            }
          } catch (err) {
            console.error("Error in onDownloadClick:", err);
          }
        }
      }
      
      // If we get here, all ZIP generation methods failed
      setIsGeneratingZip(false);
      setZipGenerationError("Failed to generate plugin ZIP. Please try again or download the plugin manually.");
    } catch (err) {
      console.error("Error in ZIP generation process:", err);
      setIsGeneratingZip(false);
      setZipGenerationError(`Error generating plugin ZIP: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };
  
  // New function to handle the actual deployment after ZIP is generated
  const handleDeployAfterZipGeneration = async () => {
    if (!connection) {
      onOpenConnectModal()
      return
    }
    
    setIsDeploying(true) // Show deployment loading
    setError(null) // Clear any previous errors
    setErrorDetails(null)
    
    console.log("Starting deployment process...");
    
    try {
      // IMPORTANT: Always generate a fresh ZIP before deployment to ensure we have the latest code
      let zipContentForDeployment = freshZipContent;
      
      // If we don't have a fresh ZIP content or want to ensure we have the absolute latest,
      // generate a new one
      if (!zipContentForDeployment || zipContentForDeployment.length < 100) {
        console.log("No valid ZIP content available, generating fresh ZIP for deployment...");
        
        if (onGeneratePluginZip) {
          try {
            console.log("Using onGeneratePluginZip to generate fresh ZIP for deployment...");
            zipContentForDeployment = await onGeneratePluginZip();
            
            if (!zipContentForDeployment || zipContentForDeployment.length < 100) {
              throw new Error("Failed to generate valid ZIP content");
            }
            
            console.log(`Successfully generated fresh ZIP with size: ${zipContentForDeployment.length} characters`);
          } catch (err) {
            console.error("Error generating fresh ZIP:", err);
            throw new Error("Failed to generate plugin ZIP for deployment");
          }
        } else if (onDownloadClick) {
          try {
            console.log("Using onDownloadClick to generate fresh ZIP for deployment...");
            zipContentForDeployment = await onDownloadClick();
            
            if (!zipContentForDeployment || zipContentForDeployment.length < 100) {
              throw new Error("Failed to generate valid ZIP content");
            }
            
            console.log(`Successfully generated fresh ZIP with size: ${zipContentForDeployment.length} characters`);
          } catch (err) {
            console.error("Error generating fresh ZIP:", err);
            throw new Error("Failed to generate plugin ZIP for deployment");
          }
        } else {
          throw new Error("No ZIP generation method available");
        }
      }
      
      // Now deploy the fresh ZIP content
      if (!zipContentForDeployment || zipContentForDeployment.length < 100) {
        throw new Error("No valid plugin ZIP available for deployment");
      }
      
      console.log(`Using fresh plugin ZIP with size: ${zipContentForDeployment.length} characters for deployment`);
      await confirmDeploy(zipContentForDeployment);
    } catch (err) {
      console.error("Error in deployment process:", err);
      setError("Error deploying plugin");
      setErrorDetails(`An error occurred during deployment: ${err instanceof Error ? err.message : "Unknown error"}`);
      setIsDeploying(false);
    }
  };
  
  // Modify confirmDeploy to accept a ZIP parameter and ensure it's used
  const confirmDeploy = async (zipContent: string) => {
    if (!connection) {
      setError("No WordPress connection");
      setErrorDetails("Please connect to a WordPress site before deploying.");
      setIsDeploying(false);
      return;
    }
    
    // Ensure we have a valid ZIP to deploy
    if (!zipContent || zipContent.length < 100) {
      console.error("Invalid ZIP content provided to confirmDeploy");
      setError("Invalid plugin ZIP file");
      setErrorDetails("The plugin ZIP file appears to be invalid or empty. Please try regenerating the plugin.");
      setIsDeploying(false);
      return;
    }
    
    console.log(`Starting deployment process with ZIP size: ${zipContent.length} characters`);
    setIsDeploying(true);
    setError(null);
    setErrorDetails(null);
    setErrorType(null);
    setRawResponse(null);
    setDeploymentSuccess(false);
    setDeploymentDetails(null);
    setDeploymentMessage("");
    setPluginHeaderInfo(null);
    setDebugLog(null);
    
    // Create an AbortController to handle timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error("Request timed out after 60 seconds");
    }, 60000); // 60 second timeout
    
    try {
      // Always use the deploy-plugin endpoint
      const apiEndpoint = `${window.location.origin}/api/wordpress/deploy-plugin`;
      
      console.log(`Using API endpoint: ${apiEndpoint}`);
      
      const deploymentTimestamp = new Date().toISOString();
      console.log(`Deployment timestamp: ${deploymentTimestamp}`);
      
      // Determine if this is an update (pluginSlug is provided)
      const isUpdate = !!pluginSlug;
      
      // For updates or when force update is checked, delete the existing plugin first
      if (isUpdate || forceUpdate) {
        const pluginToDelete = pluginSlug;
        if (pluginToDelete) {
          console.log(`${isUpdate ? "This is an update operation" : "Force update is enabled"}. Deleting existing plugin first...`);
          const deletionSuccess = await deletePluginWithFallbacks(pluginToDelete);
          
          if (deletionSuccess) {
            console.log("Successfully deleted existing plugin");
            // Add a delay to ensure filesystem operations complete
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.warn("Failed to delete existing plugin. Continuing with deployment anyway.");
          }
        }
      }
      
      // Always set delete_first to true if it's an update or force update is checked
      const shouldDeleteFirst = isUpdate || forceUpdate;
      
      console.log(`Deployment type: ${isUpdate ? 'Update' : 'New installation'}`);
      console.log(`Will delete first: ${shouldDeleteFirst}`);
      console.log(`Force update: ${forceUpdate}`);
      
      console.log("Preparing request to:", `${apiEndpoint}`);
      console.log("Request payload size:", JSON.stringify({ 
        apiKey: "REDACTED",
        siteUrl: connection.siteUrl,
        pluginZip: "BASE64_ZIP_CONTENT_REDACTED",
        pluginSlug,
        deployment_timestamp: deploymentTimestamp,
        force_update: forceUpdate,
        delete_first: shouldDeleteFirst
      }).length, "bytes");
      
      console.log("Making API request...");
      const response = await fetch(`${apiEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          apiKey: connection.apiKey,
          siteUrl: connection.siteUrl,
          pluginZip: zipContent, // Use the provided ZIP content directly
          pluginSlug,
          deployment_timestamp: deploymentTimestamp,
          // For updates (when pluginSlug is provided) or when force update is checked, always delete first
          force_update: forceUpdate,
          delete_first: shouldDeleteFirst
        }),
        signal: controller.signal
      });
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);
      
      console.log(`Deployment response received. Status: ${response.status}`);
      
      let data;
      console.log("Reading response text...");
      const responseText = await response.text();
      
      console.log(`Response text length: ${responseText.length} characters`);
      console.log(`Response text sample (first 100 chars): ${responseText.substring(0, 100)}`);
      
      try {
        console.log("Parsing response as JSON...");
        data = JSON.parse(responseText);
        console.log("Response parsed successfully:", data);
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        setRawResponse(responseText);
        throw new Error("Invalid response from WordPress");
      }
      
      if (!response.ok || !data.success) {
        console.error("Deployment failed:", data);
        setError(data.message || "Failed to deploy plugin");
        setErrorDetails(data.details || "");
        setErrorType(data.error_type || "UnknownError");
        setRawResponse(responseText);
        
        // If there are troubleshooting steps, display them
        if (data.troubleshootingSteps) {
          console.log("Troubleshooting steps:", data.troubleshootingSteps);
          setTroubleshootingSteps(data.troubleshootingSteps);
        }
        
        throw new Error(data.message || "Failed to deploy plugin");
      }
      
      console.log("Deployment successful:", data);
      setDeploymentSuccess(true);
      setDeploymentDetails(data);
      setDeploymentMessage(data.message || "Plugin deployed successfully");
      
      // Call the onDeploymentSuccess callback with the deployed plugin slug
      if (onDeploymentSuccess) {
        // Use the actual plugin slug from the deployment response if available,
        // otherwise fall back to the one we passed in the request
        const deployedPluginSlug = data.plugin_slug || pluginSlug || pluginName.toLowerCase().replace(/\s+/g, '-');
        console.log(`Calling onDeploymentSuccess with plugin slug: ${deployedPluginSlug}`);
        onDeploymentSuccess(deployedPluginSlug);
      }
      
      // If the plugin was installed but activation failed, try to fetch debug log
      if (data.message && data.message.includes("activation failed")) {
        console.log("Activation failed. Attempting to fetch debug log via FTP/SFTP...");
        try {
          await fetchDebugLog();
        } catch (debugError) {
          console.error("Failed to fetch debug log:", debugError);
        }
      }
      
    } catch (error: any) {
      console.error("Deployment error:", error);
      
      // Check if this is an abort error (timeout)
      if (error.name === 'AbortError') {
        setError("Request timed out");
        setErrorDetails("The deployment request took too long to complete. This could be due to network issues or server-side processing delays.");
      } else {
        setError(error instanceof Error ? error.message : "Failed to deploy plugin");
        
        // If activation failed, try to fetch debug log
        if (error instanceof Error && error.message.includes("activation failed")) {
          console.log("Activation failed. Attempting to fetch debug log via FTP/SFTP...");
          try {
            await fetchDebugLog();
          } catch (debugError) {
            console.error("Failed to fetch debug log:", debugError);
          }
        }
      }
    } finally {
      // Make sure to clear the timeout in case of errors
      clearTimeout(timeoutId);
      console.log("Deployment process completed.");
      setIsDeploying(false);
    }
  };
  
  // Add a new function that tries multiple methods to delete a plugin
  const deletePluginWithFallbacks = async (pluginSlugToDelete: string): Promise<boolean> => {
    if (!connection) return false;
    
    console.log(`Attempting to delete plugin: ${pluginSlugToDelete} using multiple methods`);
    
    // Method 1: Try WordPress API (custom endpoint)
    try {
      console.log("Method 1: Trying WordPress API (custom endpoint)");
      const wpApiUrl = `${connection.siteUrl}/wp-json/plugin-generator/v1/delete-plugin`;
      
      const response = await fetch(wpApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
          api_key: connection.apiKey,
          plugin_slug: pluginSlugToDelete
            }),
          });
          
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log("WordPress API deletion successful");
        // Add a delay to ensure filesystem operations complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
      }
      
      console.log("WordPress API deletion failed, trying next method");
    } catch (error) {
      console.error("WordPress API deletion error:", error);
    }
    
    // Method 2: Try the delete-plugin API route (uses both WordPress API and FTP)
    if (connection.ftpDetails) {
      try {
        console.log("Method 2: Trying delete-plugin API route");
        const response = await fetch(`${window.location.origin}/api/wordpress/delete-plugin`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              apiKey: connection.apiKey,
              siteUrl: connection.siteUrl,
            pluginSlug: pluginSlugToDelete,
            ftpDetails: connection.ftpDetails
            }),
          });
          
        const data = await response.json();
        
        if (response.ok && data.success) {
          console.log("delete-plugin API route deletion successful");
          return true;
        }
        
        console.log("delete-plugin API route deletion failed, trying next method");
      } catch (error) {
        console.error("delete-plugin API route error:", error);
      }
    }
    
    // Method 3: Try emergency access (direct FTP/SFTP)
    if (connection.ftpDetails) {
      try {
        console.log("Method 3: Trying emergency access deletion");
        const response = await fetch(`${window.location.origin}/api/wordpress/emergency-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
            operation: "delete-plugin",
            ftpDetails: connection.ftpDetails,
            pluginSlug: pluginSlugToDelete
          }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          console.log("Emergency access deletion successful");
          return true;
        }
        
        console.log("Emergency access deletion failed");
      } catch (error) {
        console.error("Emergency access error:", error);
      }
    }
    
    console.log("All deletion methods failed");
    return false;
  };

  // Function to perform emergency operations (delete plugin or read debug log)
  const performEmergencyOperation = async () => {
    console.log(`Performing emergency operation: ${emergencyOperation}`);
    
    // Clear any previous results
    setEmergencyResult(null);
    setTroubleshootingSteps(null);
    setDebugLogs(null);
    
    // Get the latest connection details from the connection prop
    const latestConnection = connection;
    
    // Check if we have FTP details
    if (!latestConnection || !latestConnection.ftpDetails) {
      console.error("No FTP details available for emergency operation");
      setEmergencyResult({
        success: false,
        message: "FTP connection details are required for this operation. Please update your connection details.",
        needsConnection: true
      });
      return;
    }
    
    console.log(`Performing ${emergencyOperation} operation for plugin: ${pluginSlug}`);
    console.log(`Using connection:`, latestConnection);
    
    try {
      // Prepare the request body with the latest connection details
      const requestBody: any = {
        ftpDetails: latestConnection.ftpDetails,
        siteUrl: latestConnection.siteUrl,
        pluginSlug: pluginSlug
      };
      
      // Add operation-specific data
      if (emergencyOperation === 'read-debug-log') {
        requestBody.operation = 'read-debug-log';
        // Add filter options for read-debug-log operation
        requestBody.filter_options = {
          filter_by_plugin: true,
          plugin_slug: pluginSlug,
          filter_by_time: true,
          time_threshold: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Last hour
          max_lines: 500
        };
      } else if (emergencyOperation === 'delete-plugin') {
        requestBody.operation = 'delete-plugin';
      }
      
      // Fetch the emergency access API
      const response = await fetch('/api/wordpress/emergency-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log("Emergency operation successful:", data);
        
        // For debug log operation, set the logs
        if (emergencyOperation === 'read-debug-log') {
          // Store both the full debug log and plugin-specific errors
          setDebugLogs(data.debug_log || null);
          
          setEmergencyResult({
            success: true,
            message: data.message || 'Debug log read successfully',
            debug_log: data.debug_log || null,
            plugin_errors: data.plugin_errors || null
          });
        } else {
          setEmergencyResult({
            success: true,
            message: data.message || 'Plugin deleted successfully'
          });
        }
      } else {
        console.error("Emergency operation failed:", data);
        
        // Check if this might be a ModSecurity issue
        const isPossibleModSecurityIssue = data.message && detectModSecurityIssue(data.message);
        
        // Generate troubleshooting steps
        const steps = [];
        
        if (data.message && data.message.includes("Authentication failed")) {
          steps.push("Verify your FTP username and password are correct.");
          steps.push("Ensure your FTP host is correct and accessible.");
        }
        
        if (isPossibleModSecurityIssue) {
          steps.push("Your server may have ModSecurity or another Web Application Firewall blocking the request.");
          steps.push("Contact your hosting provider to check if ModSecurity rules are blocking WordPress API requests.");
        }
        
        if (steps.length > 0) {
          setTroubleshootingSteps(steps);
        }
        
        setEmergencyResult({
          success: false,
          message: data.message || `Failed to ${emergencyOperation === 'delete-plugin' ? 'delete plugin' : 'read debug log'}`,
          needsConnection: data.message && data.message.includes("Authentication failed")
        });
      }
    } catch (error) {
      console.error("Error performing emergency operation:", error);
      setEmergencyResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        needsConnection: false
      });
    }
  };

  // Add function to send debug log to discussion
  const sendDebugLogToDiscussion = () => {
    if (!onSendToDiscussion || !emergencyResult || !emergencyResult.debug_log) return;
    
    const pluginInfo = pluginSlug ? `Plugin: ${pluginName || pluginSlug} (${pluginSlug})` : '';
    
    let message = `## WordPress Debug Log Analysis Request\n\n`;
    message += pluginInfo ? `${pluginInfo}\n\n` : '';
    message += `I need help analyzing my WordPress debug log. `;
    message += `Please review the log below and identify any issues with my plugin.\n\n`;
    
    // Add information about filtering
    if (emergencyResult.filtering_applied) {
      message += `*Note: This log has been filtered `;
      if (emergencyResult.filtering_applied.plugin_filtered) {
        message += `to show only entries related to this plugin `;
      }
      if (emergencyResult.filtering_applied.time_filtered) {
        message += `and limited to recent entries `;
      }
      message += `.*\n\n`;
    }
    
    // Add tabs for different views
    message += `### Plugin Log Files\n\n`;
    
    // Add the plugin-specific errors if available
    if (emergencyResult.plugin_errors) {
      message += `\`\`\`php\n${emergencyResult.plugin_errors}\n\`\`\`\n\n`;
    }
    
    message += `### Complete Log File\n\n`;
    
    // Add the full debug log
    message += `\`\`\`php\n${emergencyResult.debug_log}\n\`\`\`\n\n`;
    
    message += `Please help me fix any errors shown in this log. If you need to update the plugin code to resolve these issues, please do so.`;
    
    onSendToDiscussion(message);
    setIsEmergencyModalOpen(false);
  };

  // Update the fetchDebugLog function to handle errors better
  const fetchDebugLog = async () => {
    if (!connection?.ftpDetails?.host || !pluginSlug) {
      console.log("FTP details or plugin slug missing, cannot fetch debug log");
      return;
    }
    
    try {
      console.log("Attempting to fetch debug log via API");
      const response = await fetch(`${window.location.origin}/api/wordpress/read-debug-log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ftpDetails: connection.ftpDetails,
          pluginSlug,
          filter_options: {
            filter_by_plugin: true,
            plugin_slug: pluginSlug,
            filter_by_time: true,
            time_threshold: new Date(Date.now() - 60 * 60 * 1000).toISOString()
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response from debug log API:", errorData);
        
        // Try emergency access as fallback
        console.log("Trying emergency access to fetch debug log");
        const emergencyResponse = await fetch("/api/wordpress/emergency-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
            operation: "read-debug-log",
            ftpDetails: connection.ftpDetails,
            pluginSlug,
          filter_options: {
            filter_by_plugin: true,
              plugin_slug: pluginSlug,
            filter_by_time: true,
              time_threshold: new Date(Date.now() - 60 * 60 * 1000).toISOString()
            }
          }),
        });
        
        if (!emergencyResponse.ok) {
          throw new Error("Failed to read debug log via emergency access");
        }
        
        const emergencyData = await emergencyResponse.json();
        if (emergencyData.debug_log) {
          setDebugLog(emergencyData.debug_log);
          return;
        }
        
        throw new Error("No debug log content found");
      }
      
      const data = await response.json();
      
      if (data.debug_log) {
        setDebugLog(data.debug_log);
      } else {
        console.log("No debug log content found");
      }
    } catch (error) {
      console.error("Error fetching debug log:", error);
      throw error;
    }
  };
  
  const handleClose = () => {
    setIsOpen(false)
    setError(null)
    setErrorDetails(null)
    setErrorType(null)
    setRawResponse(null)
    setDebugLog(null)
    setDeploymentSuccess(false)
    setDeploymentMessage("")
    setDeploymentDetails(null)
    setPluginHeaderInfo(null)
    setActivationErrorType(null)
    setActivationTroubleshooting(null)
    setActiveTab("details")
  }
  
  const handleSendToDiscussion = () => {
    if (onSendToDiscussion) {
      // Create a detailed error message with all available information
      let errorMessage = `Error deploying plugin: ${error || "Unknown error"}\n\n`;
      
      if (errorDetails) {
        errorMessage += `Error Details:\n${errorDetails}\n\n`;
      }
      
      if (errorType) {
        errorMessage += `Error Type: ${errorType}\n\n`;
      }
      
      if (rawResponse) {
        // Limit the raw response to a reasonable size
        const limitedResponse = rawResponse.length > 5000 
          ? rawResponse.substring(0, 5000) + "... [truncated]" 
          : rawResponse;
        errorMessage += `Raw Response:\n${limitedResponse}\n\n`;
      }
      
      if (debugLog) {
        // Limit the debug log to a reasonable size
        const limitedDebugLog = debugLog.length > 5000 
          ? debugLog.substring(0, 5000) + "... [truncated]" 
          : debugLog;
        errorMessage += `Debug Log:\n${limitedDebugLog}\n\n`;
      }
      
      // Add plugin information if available
      if (pluginName) {
        errorMessage += `Plugin Name: ${pluginName}\n`;
      }
      
      if (pluginSlug) {
        errorMessage += `Plugin Slug: ${pluginSlug}\n`;
      }
      
      // Add a request for the AI to fix the issue
      errorMessage += `\nPlease fix this issue by generating updated plugin code that addresses the error. The plugin should be deployable to WordPress without errors.`;
      
      console.log("Sending to discussion:", errorMessage);
      
      // Send the error message to the discussion
      onSendToDiscussion(errorMessage);
      
      // Close the modal after sending to discussion
      setIsOpen(false);
    }
  }
  
  // Check if we should show the help box (for errors or activation failures)
  const isActivationFailure = deploymentSuccess && deploymentMessage && (
    deploymentMessage.toLowerCase().includes("activation failed") || 
    deploymentMessage.toLowerCase().includes("valid header") ||
    deploymentMessage.toLowerCase().includes("could not be activated")
  );
  
  // Force show help box for any deployment with a success message containing specific text
  const forceShowHelpBox = deploymentSuccess && (
    document.querySelector('.bg-green-50')?.textContent?.includes('activation failed') || false
  );
  
  // Determine if we have a PHP syntax error
  const isPhpSyntaxError = errorType === 'PHPError' || 
    errorType === 'PHPSyntaxError' || 
    (error && error.toLowerCase().includes('php') && error.toLowerCase().includes('syntax'));
  
  // Check if we should show the help box
  const showHelpBox = error || isActivationFailure || forceShowHelpBox || 
    // Fallback check - always show for successful deployments with specific text in the message
    (deploymentSuccess && deploymentMessage && deploymentMessage.toLowerCase().includes("activation failed"));
  
  // Check if the error might be related to ModSecurity
  const isPossibleModSecurityIssue = error && detectModSecurityIssue(error);
  
  // Add a new component for success messages
  const SuccessMessage = () => {
    const isPartialSuccess = deploymentMessage && deploymentMessage.toLowerCase().includes("activation failed");
    const canAccessDebugLog = connection?.enableDebugging && connection?.ftpDetails?.host;
  
  return (
      <div className="fixed bottom-4 right-4 z-50 max-w-md">
        <Alert className={isPartialSuccess ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}>
          <div className="flex items-start">
            {isPartialSuccess ? (
              <AlertCircle className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0" />
            ) : (
              <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
            )}
            <div>
              <AlertTitle className="text-lg font-semibold">
                {isPartialSuccess ? "Plugin Installed with Warnings" : "Success!"}
              </AlertTitle>
              <AlertDescription className="text-base mt-1">
                {deploymentMessage}
                
                {isPartialSuccess && (
                  <div className="mt-2">
                    {onSendToDiscussion && (
      <Button 
                        onClick={() => {
                          const message = `I'm having issues with my WordPress plugin "${pluginName}". The plugin was installed but could not be activated. The error message is: "${deploymentMessage}"\n\nPlease help me fix the activation issue.`;
                          onSendToDiscussion(message);
                        }} 
                        size="sm" 
                        variant="outline"
                        className="mr-2"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Send to Discussion
      </Button>
                    )}
                    
                    {canAccessDebugLog && (
      <Button 
                        onClick={() => {}} 
                        size="sm" 
                        variant="outline"
                      >
                        <FileCode className="h-4 w-4 mr-1" />
                        View Debug Log
            </Button>
                    )}
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
        </Alert>
      </div>
    );
  };
  
  // Handle updating connection details
  const handleUpdateConnectionClick = () => {
    // Close the emergency modal
    setIsEmergencyModalOpen(false);
    // Open the WordPress connection modal
    onOpenConnectModal();
  };
  
  // Add a function to handle emergency modal state changes
  const handleEmergencyModalChange = (open: boolean) => {
    // If the modal is being closed, reset the emergency result
    if (!open) {
      setEmergencyResult(null);
      setTroubleshootingSteps(null);
      setDebugLogs(null);
    } else if (hasUpdatedConnection && emergencyResult && !emergencyResult.success) {
      // If the modal is being opened and connection was updated, retry the operation
      console.log("Connection was updated, automatically retrying operation");
      setHasUpdatedConnection(false);
      // Small delay to ensure state updates have completed
      setTimeout(() => {
        performEmergencyOperation();
      }, 100);
    }
    setIsEmergencyModalOpen(open);
  };
  
  // Function to open the emergency modal with a specific operation
  const openEmergencyModal = (operation: 'delete-plugin' | 'read-debug-log') => {
    // Reset any previous results
    setEmergencyResult(null);
    setTroubleshootingSteps(null);
    setDebugLogs(null);
    
    // Set the operation type
    setEmergencyOperation(operation);
    
    // Open the modal
    setIsEmergencyModalOpen(true);
  };
  
  // Add a function to handle emergency button click
  const handleEmergencyButtonClick = () => {
    // Get the operation from the data attribute
    const operation = document.body.getAttribute('data-emergency-operation') as 'delete-plugin' | 'read-debug-log';
    
    if (operation) {
      // Clear the data attribute
      document.body.removeAttribute('data-emergency-operation');
      
      // Open the emergency modal with the specified operation
      openEmergencyModal(operation);
    } else {
      // Default to delete-plugin if no operation is specified
      openEmergencyModal('delete-plugin');
    }
  };
  
  return (
    <>
      <div className="flex gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={handleDeploy}
                disabled={disabled || !generatedCode}
                className="flex items-center gap-1 deploy-to-wordpress-button text-white"
              >
                <UploadCloud className="h-4 w-4" />
                Deploy to WordPress
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Deploy your plugin directly to WordPress</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Hidden button for emergency access */}
        <Button 
          className="hidden emergency-access-button" 
          onClick={handleEmergencyButtonClick}
        >
          Emergency Access
        </Button>
      </div>

      {/* Show success message if deployment was successful */}
      {deploymentSuccess && deploymentMessage && <SuccessMessage />}
      
      {/* Add Delete Plugin Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Delete Plugin</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete this plugin from your WordPress site?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {deleteError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}
            
            {deleteSuccess ? (
              <Alert variant="default" className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-800">Success</AlertTitle>
                <AlertDescription className="text-green-700">
                  Plugin deleted successfully
                </AlertDescription>
              </Alert>
            ) : (
              <p>
                This will permanently delete the plugin <strong>{pluginName}</strong> from your WordPress site.
                This action cannot be undone.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              {deleteSuccess ? "Close" : "Cancel"}
            </Button>
            
            {!deleteSuccess && (
              <Button 
                onClick={() => {}}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Plugin
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Emergency Access Modal */}
      <Dialog open={isEmergencyModalOpen} onOpenChange={handleEmergencyModalChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              {emergencyOperation === 'delete-plugin' 
                ? 'Delete Plugin on WordPress Site' 
                : 'Read Debug Log File'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {emergencyOperation === 'delete-plugin'
                ? 'Confirm you want to delete the plugin from WordPress'
                : 'View the WordPress debug log file'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex flex-col gap-4">
              {/* Delete Plugin Confirmation UI */}
              {emergencyOperation === 'delete-plugin' && !emergencyResult && (
                <div className="flex flex-col items-center my-4">
                  {isPerformingEmergencyOperation ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <p className="text-sm text-gray-500">Deleting plugin...</p>
                    </div>
                  ) : (
                    <Button 
                      onClick={performEmergencyOperation}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Plugin
                    </Button>
                  )}
                </div>
              )}
              
              {/* Read Debug Log UI */}
              {emergencyOperation === 'read-debug-log' && !emergencyResult && (
                <div className="flex flex-col items-center my-4">
                  {isPerformingEmergencyOperation ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <p className="text-sm text-gray-500">Reading debug log...</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center mb-6">
                        <p className="text-gray-700 mb-4">
                          This will read the WordPress debug log file from your server.
                        </p>
                        <p className="text-gray-700">
                          The log will be filtered to show entries related to the plugin "{pluginName}".
                        </p>
                      </div>
                      <div className="flex justify-center w-full">
                        <Button variant="default" onClick={performEmergencyOperation}>
                          <FileCode className="mr-2 h-4 w-4" />
                          Read Debug Log
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {emergencyResult && (
                <div className={`p-4 rounded-md ${emergencyResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start">
                    {emergencyResult.success ? (
                      <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">{emergencyResult.success ? 'Success' : 'Error'}</p>
                      <p className="text-sm mt-1">{emergencyResult.message}</p>
                      
                      {/* Show a Connect button for authentication errors */}
                      {emergencyResult && !emergencyResult.success && 
                       (emergencyResult.message.includes("Authentication failed") || 
                        emergencyResult.needsConnection) && 
                       (onOpenConnectModal ? (
                        <div className="mt-4">
                          <Button 
                            onClick={() => {
                              // Close the emergency modal
                              setIsEmergencyModalOpen(false);
                              // Open the WordPress connection modal
                              onOpenConnectModal();
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Link className="mr-2 h-4 w-4" />
                            Update Connection Details
                          </Button>
                        </div>
                       ) : null)}
                      
                      {/* Only show debug log content for read-debug-log operation */}
                      {emergencyResult.success && emergencyOperation === 'read-debug-log' && (
                        <div className="mt-4">
                          <p className="font-medium mb-2">Debug Log Content:</p>
                          
                          {/* Add tabs for different views */}
                          <Tabs defaultValue="plugin-errors" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="plugin-errors">Plugin Log Files</TabsTrigger>
                              <TabsTrigger value="full-log">Complete Log File</TabsTrigger>
                            </TabsList>
                            <TabsContent value="plugin-errors" className="mt-2">
                              <div className="bg-white p-3 rounded border border-gray-200 max-h-[300px] overflow-y-auto">
                                {emergencyResult.plugin_errors ? (
                                  <pre className="text-xs font-mono whitespace-pre-wrap">{emergencyResult.plugin_errors}</pre>
                                ) : (
                                  <p className="text-gray-500 text-sm">No plugin-specific errors found.</p>
                                )}
                              </div>
                            </TabsContent>
                            <TabsContent value="full-log" className="mt-2">
                              <div className="bg-white p-3 rounded border border-gray-200 max-h-[300px] overflow-y-auto">
                                {emergencyResult.debug_log ? (
                                  <pre className="text-xs font-mono whitespace-pre-wrap">{emergencyResult.debug_log}</pre>
                                ) : (
                                  <p className="text-gray-500 text-sm">No debug log content available.</p>
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                          
                          {/* Add button to send to discussion - now left-aligned with black background */}
                          <div className="mt-4 flex justify-start">
                            <Button 
                              className="bg-black hover:bg-gray-800 text-white"
                              onClick={() => {
                                if (onSendToDiscussion && emergencyResult.debug_log) {
                                  onSendToDiscussion(`Debug Log:\n\`\`\`\n${emergencyResult.debug_log}\n\`\`\``);
                                  setIsEmergencyModalOpen(false);
                                }
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Send to Discussion
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmergencyModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDebugModalOpen} onOpenChange={setIsDebugModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Debug Log</DialogTitle>
            <DialogDescription>
              WordPress debug log for your plugin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-4 bg-gray-50 rounded-md my-4">
            {debugLogContent ? (
              <pre className="text-xs font-mono whitespace-pre-wrap">{debugLogContent}</pre>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No debug log content available</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsDebugModalOpen(false)}>
              Close
            </Button>
            
            {debugLogContent && onSendToDiscussion && (
              <Button 
                onClick={() => {}}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send to Discussion
      </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isOpen} onOpenChange={(open) => {
        // If the user is explicitly trying to close the dialog (open is false),
        // allow it regardless of deployment success
        if (!open) {
          setIsOpen(false);
          return;
        }
        
        // For opening the dialog, always allow it
        if (open) {
          setIsOpen(true);
        }
      }}>
        <DialogContent className="sm:max-w-[75rem]">
          <DialogHeader>
            <DialogTitle>Deploy Plugin to WordPress</DialogTitle>
            <DialogDescription>
              Deploy your plugin directly to a WordPress site.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {/* ZIP Generation Phase UI */}
            {isGeneratingZip && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Generating plugin ZIP file...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
              </div>
            )}
            
            {/* ZIP Generation Error UI */}
            {zipGenerationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>ZIP Generation Failed</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">{zipGenerationError}</AlertDescription>
              </Alert>
            )}
            
            {/* ZIP Generated Successfully UI */}
            {isZipGenerated && !isDeploying && !error && !deploymentSuccess && (
              <div className="space-y-6">
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <Check className="h-5 w-5 text-green-500" />
                  <AlertTitle className="text-green-800">Plugin ZIP Generated Successfully</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Your plugin ZIP file has been generated and downloaded to your computer.
                    Click "Deploy Plugin" below to upload it to your WordPress site.
                  </AlertDescription>
                </Alert>
                
                <div className="flex justify-center">
                  <Button 
                    onClick={handleDeployAfterZipGeneration}
                    disabled={!connection}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    <UploadCloud className="mr-2 h-5 w-5" />
                    Deploy Plugin
                  </Button>
                </div>
              </div>
            )}
            
            {/* Deployment Error UI */}
            {error && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{error}</AlertTitle>
                  {errorDetails && <AlertDescription className="whitespace-pre-wrap">{errorDetails}</AlertDescription>}
                </Alert>
                
                {/* Add Send to Discussion button */}
                {onSendToDiscussion && (
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSendToDiscussion} 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Send to Discussion
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Deployment Success UI */}
            {deploymentSuccess && (
              <div className="flex flex-col gap-4">
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-800">Success</AlertTitle>
                  <AlertDescription className="text-green-700">
                    {deploymentMessage}
                  </AlertDescription>
                </Alert>
                
                {deploymentDetails?.plugin_url && (
                  <div className="flex flex-col gap-2">
                    <p className="font-medium">Plugin Details:</p>
                    <div className="flex flex-col gap-1">
                      {deploymentDetails.plugin_url && (
                        <a 
                          href={deploymentDetails.plugin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          View Plugin
                        </a>
                      )}
                      {deploymentDetails.admin_url && (
                        <a 
                          href={deploymentDetails.admin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          <Globe className="h-4 w-4 mr-2" />
                          WordPress Admin
                        </a>
                      )}
                    </div>
                    
                    {connection?.enableDebugging && connection?.ftpDetails?.host && (
                      <Button 
                        onClick={() => {}} 
                        variant="outline" 
                        size="sm"
                        className="flex items-center"
                      >
                        <FileCode className="h-4 w-4 mr-2" />
                        Check Plugin Errors
                      </Button>
                    )}
                    
                    {connection && !connection.enableDebugging && (
                      <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-4">
                        <Info className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold mb-1">WordPress Debugging Not Enabled</p>
                          <p className="text-sm">
                            For better error reporting, enable debugging in the WordPress connection settings.
                            This helps identify PHP errors in your plugin.
                          </p>
                          <Button 
                            onClick={() => {
                              handleClose();
                              // Open the WordPress connection modal
                              const connectButton = document.querySelector('.wordpress-connector-button') as HTMLButtonElement;
                              if (connectButton) {
                                connectButton.click();
                              }
                            }} 
                            variant="outline"
                            size="sm"
                            className="mt-2"
                          >
                            Open Connection Settings
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Deployment Loading UI */}
            {isDeploying && !error && !deploymentSuccess && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Deploying plugin to WordPress...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
              </div>
            )}
            
            {/* Check for help box conditions */}
            {(() => {
              // Check if we should show the help box (for errors or activation failures)
              const isActivationFailure = deploymentSuccess && deploymentMessage && (
                deploymentMessage.toLowerCase().includes("activation failed") || 
                deploymentMessage.toLowerCase().includes("valid header") ||
                deploymentMessage.toLowerCase().includes("could not be activated")
              );
              
              // Force show help box for any deployment with a success message containing specific text
              const forceShowHelpBox = deploymentSuccess && (
                document.querySelector('.bg-green-50')?.textContent?.includes('activation failed') || false
              );
              
              // Determine if we have a PHP syntax error
              const isPhpSyntaxError = errorType === 'PHPError' || 
                errorType === 'PHPSyntaxError' || 
                (error && error.toLowerCase().includes('php') && error.toLowerCase().includes('syntax'));
              
              // Check if we should show the help box
              const showHelpBox = error || isActivationFailure || forceShowHelpBox || 
                // Fallback check - always show for successful deployments with specific text in the message
                (deploymentSuccess && deploymentMessage && deploymentMessage.toLowerCase().includes("activation failed"));
              
              // Check if the error might be related to ModSecurity
              const isPossibleModSecurityIssue = error && detectModSecurityIssue(error);
              
              if (showHelpBox) {
                return (
                  <div className="mt-4">
                    {isPossibleModSecurityIssue && <ModSecurityWarning />}
                  </div>
                );
              }
              
              return null;
            })()}
          </div>
          
          <DialogFooter>
            {deploymentSuccess ? (
              <Button onClick={handleClose}>Close</Button>
            ) : (
              <>
                <div className="flex flex-1 justify-start">
                  {/* Add download button */}
                  {generatedCode && onDownloadClick && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        console.log("Download button clicked");
                        onDownloadClick().catch(err => {
                          console.error("Error downloading plugin:", err);
                        });
                      }}
                      disabled={disabled || !generatedCode || isGeneratingZip}
                      className="mr-2"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Plugin
                    </Button>
                  )}
                </div>
                <Button variant="outline" onClick={handleClose} disabled={isGeneratingZip || isDeploying}>
                  Cancel
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 