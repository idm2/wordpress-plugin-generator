"use client"

import { useTheme } from './ThemeProvider'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-gray hover:bg-gray-2 dark:bg-boxdark-2 dark:hover:bg-boxdark"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5 text-body dark:text-bodydark" />
      ) : (
        <Sun className="h-5 w-5 text-body dark:text-bodydark" />
      )}
    </button>
  )
} 