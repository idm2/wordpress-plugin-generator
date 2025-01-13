'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AdminDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  details: {
    url: string
    username: string
    password: string
  } | null
}

export function AdminDetailsModal({ isOpen, onClose, details }: AdminDetailsModalProps) {
  if (!details) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>WordPress Admin Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL:</Label>
            <Input
              id="url"
              value={details.url}
              readOnly
              onClick={(e) => e.currentTarget.select()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username:</Label>
            <Input
              id="username"
              value={details.username}
              readOnly
              onClick={(e) => e.currentTarget.select()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password:</Label>
            <Input
              id="password"
              value={details.password}
              readOnly
              onClick={(e) => e.currentTarget.select()}
            />
          </div>
          <p className="text-sm text-gray-600">
            Click on each field to select and copy. The site will be automatically deleted when you close the preview window.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

