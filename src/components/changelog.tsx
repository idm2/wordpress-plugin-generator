'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface ChangelogEntry {
  id: string
  date: string
  description: string
  files?: string[]
  aiResponse?: string
  codeChanges?: string
}

interface ChangelogProps {
  entries: ChangelogEntry[]
}

export function Changelog({ entries }: ChangelogProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  const toggleEntry = (id: string) => {
    const newExpanded = new Set(expandedEntries)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedEntries(newExpanded)
  }

  if (entries.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        No revisions yet. Generate a plugin to get started.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div key={entry.id} className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm">Update - {entry.date}</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleEntry(entry.id)}
              className="h-6 px-2"
            >
              {expandedEntries.has(entry.id) ? 'Show Less' : 'Show More'}
            </Button>
          </div>
          <div className="space-y-3">
            <div>
              <div className="font-medium text-sm text-gray-600">Revision Request:</div>
              <div className="mt-1 text-sm">{entry.description}</div>
              {entry.files && entry.files.length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  Attached files: {entry.files.join(', ')}
                </div>
              )}
            </div>
            {entry.aiResponse && (
              <div className="border-t pt-3">
                <div className="font-medium text-sm text-gray-600">AI Response:</div>
                <div className="mt-1 text-sm">{entry.aiResponse}</div>
              </div>
            )}
            {entry.codeChanges && expandedEntries.has(entry.id) && (
              <div className="border-t pt-3">
                <div className="font-medium text-sm text-gray-600">Updated Code:</div>
                <pre className="mt-1 p-3 bg-white rounded-md overflow-x-auto text-xs">
                  <code>{entry.codeChanges}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

