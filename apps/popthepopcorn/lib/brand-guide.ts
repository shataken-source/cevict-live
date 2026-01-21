/**
 * PopThePopcorn Brand Style Guide
 * "Cinematic Chaos" - News as Entertainment, Spectator Era
 * 
 * Philosophy: Gen Z views news through "Post-Sincerity" lens
 * - Detached amusement, watching "the simulation glitch"
 * - 6-8 second attention window
 * - Embrace "Popcorn Brain" (jumping from item to item)
 * - News as performance, not just information
 */

export const brandColors = {
  // Primary: Popcorn Yellow (vibrant, high-energy)
  popcorn: '#FFD700', // Gold/Yellow
  popcornDark: '#FFC700',
  popcornLight: '#FFE44D',
  
  // Secondary: Cinematic accents
  drama: '#FF4444', // Red for high drama
  breaking: '#FF6B35', // Orange for breaking news
  verified: '#00D9A5', // Green for verified
  chaos: '#9B59B6', // Purple for chaos/satire
  
  // Dark Mode (default - feels like cinema)
  dark: {
    background: '#0A0A0A', // Almost black
    surface: '#1A1A1A', // Dark gray
    surfaceHover: '#252525',
    text: '#FFFFFF',
    textMuted: '#B0B0B0',
    border: '#333333',
  },
  
  // Light Mode (optional)
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceHover: '#EEEEEE',
    text: '#000000',
    textMuted: '#666666',
    border: '#E0E0E0',
  },
}

export const brandTypography = {
  // High-energy, cinematic fonts
  heading: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: '900', // Extra bold for impact
    letterSpacing: '-0.02em', // Tighter for modern feel
  },
  body: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: '400',
    lineHeight: '1.6',
  },
  accent: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
}

export const brandAnimations = {
  // "Popping" animations for breaking news
  pop: {
    keyframes: `
      @keyframes pop {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
    `,
    duration: '0.3s',
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // Popcorn overflow animation
  popcornOverflow: {
    keyframes: `
      @keyframes popcornOverflow {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(-20px) rotate(360deg); opacity: 0; }
      }
    `,
    duration: '2s',
    easing: 'ease-out',
  },
  
  // Drama pulse
  dramaPulse: {
    keyframes: `
      @keyframes dramaPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); }
        50% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); }
      }
    `,
    duration: '2s',
    easing: 'ease-in-out',
  },
  
  // Slide in from side (TikTok-style)
  slideIn: {
    keyframes: `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `,
    duration: '0.4s',
    easing: 'ease-out',
  },
}

export const brandUI = {
  // Button styles
  button: {
    primary: {
      background: brandColors.popcorn,
      color: '#000000',
      fontWeight: '700',
      padding: '12px 24px',
      borderRadius: '8px',
      transition: 'all 0.2s',
      '&:hover': {
        background: brandColors.popcornDark,
        transform: 'scale(1.05)',
      },
    },
    drama: {
      background: brandColors.drama,
      color: '#FFFFFF',
      fontWeight: '700',
      padding: '12px 24px',
      borderRadius: '8px',
      animation: 'dramaPulse 2s infinite',
    },
  },
  
  // Card styles (theater/stadium feel)
  card: {
    background: brandColors.dark.surface,
    border: `1px solid ${brandColors.dark.border}`,
    borderRadius: '12px',
    padding: '20px',
    transition: 'all 0.3s',
    '&:hover': {
      background: brandColors.dark.surfaceHover,
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 24px rgba(255, 215, 0, 0.2)`,
    },
  },
  
  // Breaking news badge
  breaking: {
    background: brandColors.breaking,
    color: '#FFFFFF',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    animation: 'pop 0.3s ease-out',
  },
}

/**
 * Get drama visual based on score (0-10)
 * Returns popcorn overflow effect for high drama
 */
export function getDramaVisual(score: number): {
  color: string
  animation: string
  emoji: string
  intensity: 'low' | 'medium' | 'high' | 'extreme'
} {
  if (score >= 9) {
    return {
      color: brandColors.drama,
      animation: 'popcornOverflow',
      emoji: '🍿🍿🍿',
      intensity: 'extreme',
    }
  } else if (score >= 7) {
    return {
      color: brandColors.breaking,
      animation: 'dramaPulse',
      emoji: '🍿🍿',
      intensity: 'high',
    }
  } else if (score >= 5) {
    return {
      color: brandColors.popcorn,
      animation: '',
      emoji: '🍿',
      intensity: 'medium',
    }
  } else {
    return {
      color: brandColors.dark.textMuted,
      animation: '',
      emoji: '',
      intensity: 'low',
    }
  }
}

/**
 * Generate "Versus" framing for stories
 * Mainstream Media vs. The Leaks, etc.
 */
export function generateVersusFrame(headline: {
  title: string
  source: string
  category: string
}): string {
  const mainstreamSources = ['cnn', 'bbc', 'reuters', 'ap', 'npr']
  const isMainstream = mainstreamSources.some(s => headline.source.toLowerCase().includes(s))
  
  if (isMainstream) {
    return `Mainstream Media vs. The Story`
  } else if (headline.source.toLowerCase().includes('reddit') || headline.source.toLowerCase().includes('twitter')) {
    return `The Leaks vs. Mainstream`
  } else if (headline.category === 'politics') {
    return `The Government vs. The People`
  } else if (headline.category === 'tech') {
    return `The Tech Giant vs. The Users`
  }
  
  return `The Story vs. The Truth`
}
