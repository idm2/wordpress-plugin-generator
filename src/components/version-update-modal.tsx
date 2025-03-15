"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { PluginDetails } from './plugin-details-modal'

interface VersionUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (newVersion: string, updateDetails?: boolean, updatedDetails?: Partial<PluginDetails>) => void
  currentVersion: string
  pluginDetails?: PluginDetails | null
}

export function VersionUpdateModal({ isOpen, onClose, onSubmit, currentVersion, pluginDetails }: VersionUpdateModalProps) {
  const [newVersion, setNewVersion] = useState(currentVersion)
  const [error, setError] = useState('')
  const [updatePluginDetails, setUpdatePluginDetails] = useState(false)
  const [updatedDetails, setUpdatedDetails] = useState<Partial<PluginDetails>>({
    name: pluginDetails?.name || '',
    description: pluginDetails?.description || '',
    author: pluginDetails?.author || '',
    uri: pluginDetails?.uri || ''
  })

  const handleSubmit = () => {
    // Validate version format (x.x.x)
    const versionRegex = /^\d+\.\d+\.\d+$/
    if (!versionRegex.test(newVersion)) {
      setError('Please enter a valid version number (e.g., 1.0.0)')
      return
    }

    onSubmit(newVersion, updatePluginDetails, updatePluginDetails ? updatedDetails : undefined)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white max-h-[90vh] overflow-y-auto">
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
          
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox 
              id="update-details" 
              checked={updatePluginDetails}
              onCheckedChange={(checked) => setUpdatePluginDetails(checked === true)}
            />
            <Label htmlFor="update-details">Update plugin details</Label>
          </div>
          
          {updatePluginDetails && (
            <div className="space-y-4 mt-2 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="plugin-name">Plugin Name</Label>
                <Input
                  id="plugin-name"
                  value={updatedDetails.name}
                  onChange={(e) => setUpdatedDetails({...updatedDetails, name: e.target.value})}
                  placeholder={pluginDetails?.name || "Plugin Name"}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plugin-description">Description</Label>
                <Textarea
                  id="plugin-description"
                  value={updatedDetails.description}
                  onChange={(e) => setUpdatedDetails({...updatedDetails, description: e.target.value})}
                  placeholder={pluginDetails?.description || "Plugin Description"}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plugin-author">Author</Label>
                <Input
                  id="plugin-author"
                  value={updatedDetails.author}
                  onChange={(e) => setUpdatedDetails({...updatedDetails, author: e.target.value})}
                  placeholder={pluginDetails?.author || "Author Name"}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plugin-uri">Plugin URI</Label>
                <Input
                  id="plugin-uri"
                  value={updatedDetails.uri}
                  onChange={(e) => setUpdatedDetails({...updatedDetails, uri: e.target.value})}
                  placeholder={pluginDetails?.uri || "https://example.com/plugin"}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            Update Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 