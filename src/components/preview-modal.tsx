'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  previewUrl: string | null
}

export function PreviewModal({ isOpen, onClose, previewUrl }: PreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] bg-white">
        <DialogHeader>
          <DialogTitle>Plugin Preview</DialogTitle>
        </DialogHeader>
        {previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-[80vh] border-0"
            title="WordPress Plugin Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-[80vh]">
            Loading preview...
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

