import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  previewUrl: string | null
}

export function PreviewModal({ isOpen, onClose, previewUrl }: PreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] h-[80vh]">
        <DialogHeader>
          <DialogTitle>Plugin Preview</DialogTitle>
        </DialogHeader>
        <div className="mt-4 h-full">
          {previewUrl ? (
            <iframe src={previewUrl} className="w-full h-full border-0" title="WordPress Preview" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">No preview available</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

