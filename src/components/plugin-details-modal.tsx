'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface PluginDetails {
  name: string
  uri: string
  description: string
  version: string
  author: string
}

interface PluginDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (details: PluginDetails) => void
  initialDescription?: string
}

export function PluginDetailsModal({ isOpen, onClose, onSubmit, initialDescription = '' }: PluginDetailsModalProps) {
  const [details, setDetails] = useState<PluginDetails>({
    name: '',
    uri: '',
    description: initialDescription,
    version: '1.0.0',
    author: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update details.description when initialDescription changes
  useEffect(() => {
    if (initialDescription) {
      setDetails(prev => ({ ...prev, description: initialDescription }));
    }
  }, [initialDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Create a complete details object with proper types
    const completeDetails = {
      ...details,
    }
    
    // Call the onSubmit callback with the details
    onSubmit(completeDetails)
    
    // Close the modal
    onClose()
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose()
        }
      }}
    >
      <DialogContent className="bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plugin Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Plugin Name</Label>
            <Input
              id="name"
              value={details.name}
              onChange={(e) => setDetails(prev => ({ ...prev, name: e.target.value }))}
              placeholder="my-awesome-plugin"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uri">Plugin URI</Label>
            <Input
              id="uri"
              value={details.uri}
              onChange={(e) => setDetails(prev => ({ ...prev, uri: e.target.value }))}
              placeholder="https://example.com/plugins/my-awesome-plugin"
            />
          </div>
          <div className="space-y-2">
            <Label>Author</Label>
            <Input
              id="author"
              value={details.author}
              onChange={(e) => setDetails(prev => ({ ...prev, author: e.target.value }))}
              placeholder="Your Name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Plugin Description</Label>
            <Textarea
              id="description" 
              value={details.description}
              onChange={(e) => setDetails(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what your plugin does"
              className="h-24"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={details.version}
              onChange={(e) => setDetails(prev => ({ ...prev, version: e.target.value }))}
              placeholder="1.0.0"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-black text-white hover:bg-black/90 continue-generate-plugin-button"
            >
              {isSubmitting ? 'Processing...' : 'Continue'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

