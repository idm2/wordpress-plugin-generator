"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

interface CodeSnippetModalProps {
  isOpen: boolean
  onClose: () => void
  code: string
}

export function CodeSnippetModal({ isOpen, onClose, code }: CodeSnippetModalProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getProcessedCode(code))
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  // Process the code to create a standalone functions.php snippet
  const getProcessedCode = (fullCode: string) => {
    // First remove the plugin header if it exists
    let processedCode = fullCode
      .replace(/^<\?php\s*\/\*[\s\S]*?\*\/\s*/m, '') // Remove plugin header
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove all other block comments
      .replace(/\/\/[^\n]*(\n|$)/g, '') // Remove all single-line comments
      .replace(/```[\s\S]*?```/g, '') // Remove any markdown code blocks
      .replace(/```php[\s\S]*?```/g, '') // Remove any PHP markdown blocks
      .replace(/\n+\s*(?:Note|This|Please|Here|The|Usage|Installation)[^{}\n]*(?:\n|$)/gi, '\n') // Remove explanatory text
      .replace(/\n+\s*[A-Za-z](?![({`'"])[^\n{};]*(?:\n|$)/g, '\n') // Remove any lines with just text
      .replace(/^\s*<\?php\s*/m, '') // Remove opening PHP tag
      .replace(/defined\s*\(\s*['"]ABSPATH['"]\s*\)\s*\|\|\s*exit\s*;/, '') // Remove ABSPATH check
      .replace(/\n+\s*This plugin.*$/gm, '') // Remove any trailing plugin description
      .replace(/\n+\s*The plugin.*$/gm, '') // Remove any trailing plugin explanation
      .replace(/\n+\s*For more information.*$/gm, '') // Remove any trailing information
      .replace(/\n+\s*@.*$/gm, '') // Remove any trailing documentation
      .replace(/\n+\s*\*.*$/gm, '') // Remove any trailing block comments
      .replace(/\n+\s*```.*$/gm, '') // Remove any trailing markdown
      .trim()

    // Add ABSPATH check at the beginning
    let snippetCode = `if (!defined('ABSPATH')) exit;\n\n`

    // Extract namespace if it exists
    const namespaceMatch = processedCode.match(/namespace\s+([^;]+);/)
    const namespace = namespaceMatch ? namespaceMatch[1] : null

    // Remove namespace declaration if it exists
    processedCode = processedCode.replace(/namespace\s+[^;]+;/, '')

    // If there was a namespace, wrap the code in a namespace block
    if (namespace) {
      snippetCode += `namespace ${namespace} {\n${processedCode}\n}`
    } else {
      snippetCode += processedCode
    }

    // Fix common PHP syntax issues
    snippetCode = snippetCode
      .replace(/=\s*['"]([^'"\n]*?)(?:\n|$)/g, "= '$1'") // Add missing closing quotes
      .replace(/=\s*['"]([^'"\n]*?)\s*;/g, "= '$1';") // Fix string assignments
      .replace(/admin_url\s*\(/g, "admin_url(") // Fix admin_url spacing
      .replace(/wp_redirect\s*\(/g, "wp_redirect(") // Fix wp_redirect spacing
      .replace(/wp_verify_nonce\s*\(/g, "wp_verify_nonce(") // Fix nonce function spacing
      .replace(/<\?php\s*(new\s+[\w_]+\s*\([^)]*\))\s*;?\s*\?>/g, "$1;") // Fix class instantiation
      .replace(/<\?php\s*([$\w\->]+\s*=\s*new\s+[\w_]+)\s*\(\s*\$args\s*\)\s*;?\s*\?>/g, "$1($args);") // Fix WP_Query instantiation
      .replace(/<\?php\s*([\w_]+(?:->[\w_]+)*\([^)]*\))\s*;?\s*\?>/g, "$1;") // Fix method calls
      .replace(/\$posts\s*=\s*new\s*<\?php\s*WP_Query/g, "$posts = new WP_Query") // Fix WP_Query instantiation
      .replace(/\?>\s*\);\s*\?>/g, ");") // Fix double closing tags
      .replace(/\?>\s*;\s*\?>/g, ";") // Fix semicolon between tags
      .replace(/(\s*)\?>\s*<(div|form|h[1-6])/g, "$1?>\n$1<$2") // Add newline before block elements
      .replace(/(\s*)<\/(div|form|h[1-6])>\s*\?>/g, "$1</$2>\n$1<?php") // Add newline after block elements
      .replace(/>\s*;(?:\s*\?>)?/g, ">") // Remove semicolons after HTML tags
      .replace(/\?>\s*<\?php\s*/g, "") // Remove empty PHP transitions
      .replace(/>\s*\?>\s*<?php\s*</g, ">\n<") // Remove PHP transitions between tags
      .replace(/>\s*\?>\s*<?php\s*$/gm, ">") // Remove trailing PHP tags
      .replace(/^\s*\?>\s*<?php\s*</gm, "<") // Remove leading PHP tags
      .replace(/\n{3,}/g, "\n\n") // Remove excessive newlines
      .replace(/(\s*)\?>\s*\n\s*</g, "$1?>\n$1<") // Fix indentation after PHP closing tag
      .replace(/>\s*\n\s*(\s*)\?>/g, ">\n$1<?php") // Fix indentation before PHP opening tag
      .replace(/\?>\s*<\?php\s*/g, "") // Remove any remaining empty PHP transitions
      .replace(/\s+$/gm, "") // Remove trailing whitespace
      .replace(/\{\s*\n+\s*\n+/g, "{\n") // Fix spacing after opening braces
      .replace(/\n+\s*\}/g, "\n}") // Fix spacing before closing braces
      .trim()

    return snippetCode
  }

  if (!mounted) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-white">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Code Snippet</DialogTitle>
          <DialogDescription>
            Copy this code to use in your WordPress site&apos;s functions.php file or code snippets plugin
          </DialogDescription>
        </DialogHeader>
        <div className="relative px-6 pb-6">
          <div className="relative max-h-[600px] w-full overflow-auto rounded-md border">
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                className="absolute top-3 right-3 z-10 bg-white hover:bg-gray-50"
                onClick={handleCopy}
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <pre className="p-4 bg-white">
                <code className="text-sm text-zinc-800 font-mono whitespace-pre-wrap break-words">
                  {getProcessedCode(code)}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

