import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface SavedPlugin {
  id: string
  name: string
  code: string
  description: string
  date: string
}

interface SavedPluginsModalProps {
  isOpen: boolean
  onClose: () => void
  onLoad: (plugin: SavedPlugin) => void
}

export function SavedPluginsModal({ isOpen, onClose, onLoad }: SavedPluginsModalProps) {
  const [savedPlugins, setSavedPlugins] = useState<SavedPlugin[]>([])

  useEffect(() => {
    const plugins = JSON.parse(localStorage.getItem("savedPlugins") || "[]")
    setSavedPlugins(plugins)
  }, [isOpen])

  const handleLoad = (plugin: SavedPlugin) => {
    onLoad(plugin)
    onClose()
  }

  const handleDelete = (id: string) => {
    const updatedPlugins = savedPlugins.filter((plugin) => plugin.id !== id)
    localStorage.setItem("savedPlugins", JSON.stringify(updatedPlugins))
    setSavedPlugins(updatedPlugins)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>Saved Plugins</DialogTitle>
          <DialogDescription>Select a plugin to load or delete</DialogDescription>
        </DialogHeader>
        <div className="h-[300px] w-full rounded-md border p-4 overflow-auto">
          {savedPlugins.length === 0 ? (
            <p className="text-center text-gray-500">No saved plugins</p>
          ) : (
            savedPlugins.map((plugin) => (
              <div key={plugin.id} className="flex items-center justify-between py-2">
                <div>
                  <h3 className="font-medium">{plugin.name}</h3>
                  <p className="text-sm text-gray-500">{new Date(plugin.date).toLocaleString()}</p>
                </div>
                <div>
                  <Button variant="outline" size="sm" onClick={() => handleLoad(plugin)} className="mr-2">
                    Load
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(plugin.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

