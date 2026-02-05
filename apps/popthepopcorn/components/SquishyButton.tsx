'use client'

import { useState } from 'react'

interface SquishyButtonProps {
  children: React.ReactNode
  onClick: () => void
  score?: number // 1-10 for drama score
  className?: string
  disabled?: boolean
}

/**
 * Squishy Button - Tactile Maximalism
 * Deforms like jelly/clay when pressed (fidget toy satisfaction)
 * Heavier "squish" for higher drama scores
 */
export default function SquishyButton({
  children,
  onClick,
  score,
  className = '',
  disabled = false,
}: SquishyButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  // Higher score = more squish (more deformation)
  const squishIntensity = score ? Math.min(1, score / 10) : 0.5
  const scaleX = isPressed ? 1 - (squishIntensity * 0.15) : 1
  const scaleY = isPressed ? 1 - (squishIntensity * 0.25) : 1

  const handleMouseDown = () => {
    if (disabled) return
    setIsPressed(true)
    
    // Haptic feedback (if available)
    if (navigator.vibrate && score) {
      // Higher drama = stronger vibration
      const vibrationDuration = score * 10 // 10ms per point
      navigator.vibrate(vibrationDuration)
    }
  }

  const handleMouseUp = () => {
    setIsPressed(false)
  }

  const handleClick = () => {
    if (disabled) return
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      disabled={disabled}
      className={`
        relative transition-all duration-150 ease-out
        active:transition-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{
        transform: `scale(${scaleX}, ${scaleY})`,
        transformOrigin: 'center',
      }}
    >
      {children}
    </button>
  )
}
