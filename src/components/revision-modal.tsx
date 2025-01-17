'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileUpload } from './file-upload'

interface RevisionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (description: string, files: File[]) => void
  pluginName: string
}

export function RevisionModal({ isOpen, onClose, onSubmit, pluginName }: RevisionModalProps) {
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = () => {
    onSubmit(description, files)
    setDescription('')
    setFiles([])
    setIsFocused(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>Request Plugin Revision</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <Textarea
            placeholder="Describe the issues or changes needed..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="min-h-[100px]"
          />
          <FileUpload
            onFilesSelected={setFiles}
            accept="image/*,.pdf,.doc,.docx"
          />
          {files.length > 0 && (
            <Alert>
              <AlertDescription>
                Selected files: {files.map(f => f.name).join(', ')}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!isFocused && files.length === 0}
              variant="default"
            >
              Submit Revision Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

