'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export interface PluginDetails {
  name: string
  uri: string
  description: string
  version: string
  author: string
  structure: "simplified" | "traditional"
}

interface PluginDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (details: PluginDetails) => void
}

export function PluginDetailsModal({ isOpen, onClose, onSubmit }: PluginDetailsModalProps) {
  const [details, setDetails] = useState<PluginDetails>({
    name: '',
    uri: '',
    description: '',
    version: '1.0.0',
    author: '',
    structure: 'simplified'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    
    setIsSubmitting(true)
    onSubmit(details)
    onClose()
    setIsSubmitting(false)
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
      <DialogContent className="bg-white">
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={details.description}
              onChange={(e) => setDetails(prev => ({ ...prev, description: e.target.value }))}
              placeholder="A brief description of what your plugin does"
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
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={details.author}
              onChange={(e) => setDetails(prev => ({ ...prev, author: e.target.value }))}
              placeholder="Your Name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Code Structure</Label>
            <RadioGroup
              value={details.structure}
              onValueChange={(value) => setDetails({ ...details, structure: value as "simplified" | "traditional" })}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="simplified" id="simplified" />
                <Label htmlFor="simplified" className="font-normal">
                  Simplified (Single File)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="traditional" id="traditional" />
                <Label htmlFor="traditional" className="font-normal">
                  Traditional (Multiple Files)
                </Label>
              </div>
            </RadioGroup>
            <p className="text-sm text-gray-500 mt-1">
              Traditional structure is recommended for complex plugins with multiple features.
            </p>
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

