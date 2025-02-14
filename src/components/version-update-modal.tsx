"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface VersionUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (version: string) => void
  currentVersion: string
}

export function VersionUpdateModal({ isOpen, onClose, onSubmit, currentVersion }: VersionUpdateModalProps) {
  const [newVersion, setNewVersion] = useState(currentVersion)
  const [error, setError] = useState('')

  const handleSubmit = () => {
    // Validate version format (x.x.x)
    const versionRegex = /^\d+\.\d+\.\d+$/
    if (!versionRegex.test(newVersion)) {
      setError('Please enter a valid version number (e.g., 1.0.0)')
      return
    }

    onSubmit(newVersion)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Plugin Version</DialogTitle>
          <DialogDescription>
            Enter a new version number for your plugin update. Current version: {currentVersion}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="version" className="text-right">
              Version
            </Label>
            <Input
              id="version"
              value={newVersion}
              onChange={(e) => {
                setNewVersion(e.target.value)
                setError('')
              }}
              className="col-span-3"
              placeholder="x.x.x"
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm col-span-4 text-center">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Update Version</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 