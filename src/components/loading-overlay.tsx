"use client"

import React from "react"
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingOverlayProps {
  isOpen: boolean
  message?: string
}

export function LoadingOverlay({ isOpen, message = "Generating plugin..." }: LoadingOverlayProps) {
  return (
    <Dialog open={isOpen} modal={true}>
      <DialogOverlay 
        className="fixed inset-0 z-100 w-full h-full bg-white/85 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.85)', 
          backdropFilter: 'none',
          zIndex: 100
        }} 
      />
      <DialogContent 
        className={cn(
          "sm:max-w-[425px] bg-white p-8 border-none shadow-lg",
          "loading-overlay-dialog",
          "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[101]"
        )}
        style={{
          zIndex: 101
        }}
      >
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-lg font-medium text-purple-600">{message}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
} 