// Gulf Coast Charters Theme Configuration
// Complete design system configuration for the platform

export const gccTheme = {
  // Brand Colors
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    secondary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    ocean: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    sand: {
      50: '#fefce8',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#eab308',
      600: '#ca8a04',
      700: '#a16207',
      800: '#854d0e',
      900: '#713f12',
    },
    coral: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
    },
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },

  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      serif: ['Playfair Display', 'Georgia', 'serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
    },
    fontWeight: {
      thin: '100',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
  },

  // Spacing
  spacing: {
    px: '1px',
    0: '0px',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    11: '2.75rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },

  // Shadows
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },

  // Transitions
  transitionDuration: {
    DEFAULT: '150ms',
    fast: '100ms',
    normal: '250ms',
    slow: '350ms',
  },

  transitionTimingFunction: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Z-Index
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1020,
    banner: 1030,
    overlay: 1040,
    modal: 1050,
    popover: 1060,
    skipLink: 1070,
    toast: 1080,
    tooltip: 1090,
  },

  // Breakpoints
  screens: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Container
  container: {
    center: true,
    padding: {
      DEFAULT: '1rem',
      sm: '2rem',
      lg: '4rem',
      xl: '5rem',
      '2xl': '6rem',
    },
  },

  // Animation
  animation: {
    'fade-in': 'fadeIn 0.6s ease-out',
    'slide-in-left': 'slideInLeft 0.6s ease-out',
    'slide-in-right': 'slideInRight 0.6s ease-out',
    'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    'bounce': 'bounce 1s infinite',
    'spin': 'spin 1s linear infinite',
    'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
  },

  keyframes: {
    fadeIn: {
      '0%': { opacity: '0', transform: 'translateY(10px)' },
      '100%': { opacity: '1', transform: 'translateY(0)' },
    },
    slideInLeft: {
      '0%': { opacity: '0', transform: 'translateX(-20px)' },
      '100%': { opacity: '1', transform: 'translateX(0)' },
    },
    slideInRight: {
      '0%': { opacity: '0', transform: 'translateX(20px)' },
      '100%': { opacity: '1', transform: 'translateX(0)' },
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '.5' },
    },
    bounce: {
      '0%, 100%': { transform: 'translateY(-25%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
      '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
    },
    spin: {
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    },
    ping: {
      '75%, 100%': { transform: 'scale(2)', opacity: '0' },
    },
  },
};

// Ad Configuration
export const adConfig = {
  placements: {
    'top-banner': {
      size: '728x90',
      responsive: {
        mobile: '320x50',
        tablet: '728x90',
        desktop: '728x90',
      },
      refreshInterval: 30000, // 30 seconds
    },
    'header-banner': {
      size: '970x90',
      responsive: {
        mobile: '320x50',
        tablet: '728x90',
        desktop: '970x90',
      },
      refreshInterval: 45000, // 45 seconds
    },
    'sidebar': {
      size: '300x250',
      responsive: {
        mobile: null, // Hidden on mobile
        tablet: '160x600',
        desktop: '300x250',
      },
      refreshInterval: 60000, // 1 minute
    },
    'content': {
      size: '728x90',
      responsive: {
        mobile: '300x250',
        tablet: '468x60',
        desktop: '728x90',
      },
      refreshInterval: 45000, // 45 seconds
    },
    'footer': {
      size: '970x90',
      responsive: {
        mobile: '320x50',
        tablet: '728x90',
        desktop: '970x90',
      },
      refreshInterval: 60000, // 1 minute
    },
    'native': {
      size: '600x300',
      responsive: {
        mobile: '300x250',
        tablet: '468x200',
        desktop: '600x300',
      },
      refreshInterval: 90000, // 1.5 minutes
    },
  },

  targeting: {
    locations: ['gulf-coast', 'alabama', 'florida', 'mississippi', 'louisiana'],
    userTypes: ['guest', 'member', 'captain', 'admin'],
    interests: ['fishing', 'boating', 'weather', 'safety', 'gear', 'community'],
    timeOfDay: ['morning', 'afternoon', 'evening', 'night'],
  },

  categories: {
    'charter-services': {
      priority: 10,
      ctaColor: 'primary',
      bgColor: 'ocean',
    },
    'gear-equipment': {
      priority: 8,
      ctaColor: 'secondary',
      bgColor: 'sand',
    },
    'weather-safety': {
      priority: 9,
      ctaColor: 'coral',
      bgColor: 'gray',
    },
    'community': {
      priority: 7,
      ctaColor: 'primary',
      bgColor: 'secondary',
    },
    'travel-tourism': {
      priority: 6,
      ctaColor: 'ocean',
      bgColor: 'primary',
    },
  },

  analytics: {
    trackImpressions: true,
    trackClicks: true,
    trackViewability: true,
    trackEngagement: true,
    samplingRate: 0.1, // 10% sampling for performance
  },

  performance: {
    lazyLoading: true,
    prebid: true,
    headerBidding: true,
    refreshOnVisibility: true,
    maxRefreshes: 10,
    refreshInterval: 30000,
  },
};

// Component Theme Overrides
export const componentThemes = {
  button: {
    primary: {
      backgroundColor: gccTheme.colors.primary[600],
      color: 'white',
      padding: `${gccTheme.spacing[3]} ${gccTheme.spacing[6]}`,
      borderRadius: gccTheme.borderRadius.lg,
      fontWeight: gccTheme.typography.fontWeight.semibold,
      transition: `all ${gccTheme.transitionDuration.normal} ${gccTheme.transitionTimingFunction.DEFAULT}`,
      '&:hover': {
        backgroundColor: gccTheme.colors.primary[700],
        transform: 'translateY(-1px)',
        boxShadow: gccTheme.boxShadow.md,
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
      },
    },
    secondary: {
      backgroundColor: gccTheme.colors.secondary[600],
      color: 'white',
      padding: `${gccTheme.spacing[3]} ${gccTheme.spacing[6]}`,
      borderRadius: gccTheme.borderRadius.lg,
      fontWeight: gccTheme.typography.fontWeight.semibold,
      transition: `all ${gccTheme.transitionDuration.normal} ${gccTheme.transitionTimingFunction.DEFAULT}`,
      '&:hover': {
        backgroundColor: gccTheme.colors.secondary[700],
        transform: 'translateY(-1px)',
        boxShadow: gccTheme.boxShadow.md,
      },
    },
    outline: {
      backgroundColor: 'transparent',
      color: gccTheme.colors.primary[600],
      borderColor: gccTheme.colors.primary[600],
      borderWidth: '2px',
      borderStyle: 'solid',
      padding: `${gccTheme.spacing[3]} ${gccTheme.spacing[6]}`,
      borderRadius: gccTheme.borderRadius.lg,
      fontWeight: gccTheme.typography.fontWeight.semibold,
      transition: `all ${gccTheme.transitionDuration.normal} ${gccTheme.transitionTimingFunction.DEFAULT}`,
      '&:hover': {
        backgroundColor: gccTheme.colors.primary[600],
        color: 'white',
        boxShadow: gccTheme.boxShadow.sm,
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: gccTheme.colors.gray[700],
      padding: `${gccTheme.spacing[3]} ${gccTheme.spacing[6]}`,
      borderRadius: gccTheme.borderRadius.lg,
      fontWeight: gccTheme.typography.fontWeight.semibold,
      transition: `all ${gccTheme.transitionDuration.fast} ${gccTheme.transitionTimingFunction.DEFAULT}`,
      '&:hover': {
        backgroundColor: gccTheme.colors.gray[100],
        color: gccTheme.colors.gray[900],
      },
    },
  },

  card: {
    backgroundColor: 'white',
    borderRadius: gccTheme.borderRadius.xl,
    boxShadow: gccTheme.boxShadow.base,
    border: `1px solid ${gccTheme.colors.gray[200]}`,
    overflow: 'hidden',
    transition: `all ${gccTheme.transitionDuration.normal} ${gccTheme.transitionTimingFunction.DEFAULT}`,
    '&:hover': {
      boxShadow: gccTheme.boxShadow.lg,
      transform: 'translateY(-2px)',
    },
  },

  input: {
    backgroundColor: 'white',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: gccTheme.colors.gray[300],
    borderRadius: gccTheme.borderRadius.lg,
    padding: `${gccTheme.spacing[3]} ${gccTheme.spacing[4]}`,
    fontSize: gccTheme.typography.fontSize.base[0],
    transition: `all ${gccTheme.transitionDuration.fast} ${gccTheme.transitionTimingFunction.DEFAULT}`,
    '&:focus': {
      borderColor: gccTheme.colors.primary[500],
      boxShadow: `0 0 0 3px ${gccTheme.colors.primary[100]}`,
      outline: 'none',
    },
    '&::placeholder': {
      color: gccTheme.colors.gray[400],
    },
  },

  navigation: {
    header: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderBottom: `1px solid ${gccTheme.colors.gray[200]}`,
      boxShadow: gccTheme.boxShadow.sm,
      position: 'sticky',
      top: 0,
      zIndex: gccTheme.zIndex.sticky,
      backdropFilter: 'blur(8px)',
    },
    link: {
      color: gccTheme.colors.gray[700],
      textDecoration: 'none',
      fontWeight: gccTheme.typography.fontWeight.medium,
      padding: `${gccTheme.spacing[2]} ${gccTheme.spacing[3]}`,
      borderRadius: gccTheme.borderRadius.md,
      transition: `all ${gccTheme.transitionDuration.fast} ${gccTheme.transitionTimingFunction.DEFAULT}`,
      '&:hover': {
        color: gccTheme.colors.primary[600],
        backgroundColor: gccTheme.colors.primary[50],
      },
      '&.active': {
        color: gccTheme.colors.primary[600],
        backgroundColor: gccTheme.colors.primary[100],
      },
    },
  },

  hero: {
    background: `linear-gradient(135deg, ${gccTheme.colors.ocean[600]}, ${gccTheme.colors.primary[700]})`,
    color: 'white',
    padding: `${gccTheme.spacing[20]} 0`,
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Cdefs%3E%3Cpattern id=\'waves\' x=\'0\' y=\'0\' width=\'100\' height=\'100\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M0,50 Q25,30 50,50 T100,50\' stroke=\'rgba(255,255,255,0.1)\' stroke-width=\'2\' fill=\'none\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23waves)\'/%3E%3C/svg%3E")',
      opacity: 0.3,
    },
  },
};

// Dark Mode Theme
export const darkTheme = {
  ...gccTheme,
  colors: {
    ...gccTheme.colors,
    gray: {
      50: '#0f172a',
      100: '#1e293b',
      200: '#334155',
      300: '#475569',
      400: '#64748b',
      500: '#94a3b8',
      600: '#cbd5e1',
      700: '#e2e8f0',
      800: '#f1f5f9',
      900: '#f8fafc',
    },
  },
};

// Export default theme
export default gccTheme;
