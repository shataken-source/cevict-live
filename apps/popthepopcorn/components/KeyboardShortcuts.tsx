'use client'

import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  onBingeMode: () => void
  onRefresh: () => void
  onToggleDarkMode: () => void
}

/**
 * Keyboard Shortcuts for Power Users
 * Gen Z loves efficiency
 */
export default function KeyboardShortcuts({
  onBingeMode,
  onRefresh,
  onToggleDarkMode,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Binge Mode: 'B' key
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        onBingeMode()
      }

      // Refresh: 'R' key
      if (e.key === 'r' || e.key === 'R') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          onRefresh()
        }
      }

      // Toggle Dark Mode: 'D' key
      if (e.key === 'd' || e.key === 'D') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          onToggleDarkMode()
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [onBingeMode, onRefresh, onToggleDarkMode])

  return null // This component doesn't render anything
}
