'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

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
      await navigator.clipboard.writeText(code)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // Extract only the function code without plugin metadata
  const getCleanCode = (fullCode: string) => {
    const functionMatch = fullCode.match(/function.*?{[\s\S]*}/)
    return functionMatch ? `<?php\n${functionMatch[0]}` : fullCode
  }

  if (!mounted) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] p-0 bg-white">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Code Snippet</DialogTitle>
          <DialogDescription>
            Copy this code to use in your WordPress site
          </DialogDescription>
        </DialogHeader>
        <div className="relative px-6 pb-6">
          <div className="relative rounded-md border bg-white">
            <Button
              variant="outline"
              size="icon"
              className="absolute top-3 right-3 z-10 bg-white hover:bg-gray-50"
              onClick={handleCopy}
            >
              {isCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <div className="max-h-[400px] w-full overflow-auto rounded-md bg-white">
              <pre className="p-4">
                <code className="text-sm text-zinc-800">{getCleanCode(code)}</code>
              </pre>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

