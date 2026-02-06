/**
 * Cevict AI - Environment Configuration
 * ======================================
 * Centralized configuration for test and production environments
 */

export type Environment = 'test' | 'production' | 'development'

export interface AIProject {
  id: string
  name: string
  description: string
  testUrl: string
  prodUrl: string
  apiEndpoint: string
  status: 'live' | 'beta' | 'maintenance' | 'offline'
  features: string[]
}

export interface EnvironmentConfig {
  env: Environment
  domain: string
  apiUrl: string
  supabase: {
    url: string
    anonKey: string
  }
  features: {
    progno: boolean
    orchestrator: boolean
    massager: boolean
    claudeEffect: boolean
    debugMode: boolean
  }
  security: {
    rateLimitRequests: number
    rateLimitWindowMs: number
    corsOrigins: string[]
    cspEnabled: boolean
  }
  monitoring: {
    logLevel: 'debug' | 'info' | 'warn' | 'error'
    sentryDsn?: string
    analyticsId?: string
  }
}

// Get current environment
export function getEnvironment(): Environment {
  const env = process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || 'development'
  if (env === 'test' || env === 'staging') return 'test'
  if (env === 'production') return 'production'
  return 'development'
}

// Environment-specific configurations
const configs: Record<Environment, EnvironmentConfig> = {
  development: {
    env: 'development',
    domain: 'localhost:3000',
    apiUrl: 'http://localhost:3000/api',
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    },
    features: {
      progno: true,
      orchestrator: true,
      massager: true,
      claudeEffect: true,
      debugMode: true
    },
    security: {
      rateLimitRequests: 1000,
      rateLimitWindowMs: 60000,
      corsOrigins: ['*'],
      cspEnabled: false
    },
    monitoring: {
      logLevel: 'debug'
    }
  },
  
  test: {
    env: 'test',
    domain: 'test.cevict.ai',
    apiUrl: 'https://api.test.cevict.ai',
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    },
    features: {
      progno: true,
      orchestrator: true,
      massager: true,
      claudeEffect: true,
      debugMode: true
    },
    security: {
      rateLimitRequests: 500,
      rateLimitWindowMs: 60000,
      corsOrigins: ['https://test.cevict.ai', 'https://*.test.cevict.ai'],
      cspEnabled: false
    },
    monitoring: {
      logLevel: 'debug'
    }
  },
  
  production: {
    env: 'production',
    domain: 'cevict.ai',
    apiUrl: 'https://api.cevict.ai',
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    },
    features: {
      progno: true,
      orchestrator: true,
      massager: true,
      claudeEffect: true,
      debugMode: false
    },
    security: {
      rateLimitRequests: 100,
      rateLimitWindowMs: 60000,
      corsOrigins: ['https://cevict.ai', 'https://*.cevict.ai'],
      cspEnabled: true
    },
    monitoring: {
      logLevel: 'info',
      sentryDsn: process.env.SENTRY_DSN,
      analyticsId: process.env.ANALYTICS_ID
    }
  }
}

// Get configuration for current environment
export function getConfig(): EnvironmentConfig {
  return configs[getEnvironment()]
}

// AI Projects Registry
export const AI_PROJECTS: AIProject[] = [
  {
    id: 'progno',
    name: 'PROGNO',
    description: 'AI-powered sports predictions with Claude Effect',
    testUrl: 'https://progno.test.cevict.ai',
    prodUrl: 'https://progno.cevict.ai',
    apiEndpoint: '/api/progno',
    status: 'live',
    features: ['Sports Analysis', 'Win Probability', 'Betting Insights', 'Claude Effect']
  },
  {
    id: 'prognostication',
    name: 'Prognostication',
    description: 'Public prediction platform with tiered access',
    testUrl: 'https://prognostication.test.cevict.ai',
    prodUrl: 'https://prognostication.com',
    apiEndpoint: '/api/prognostication',
    status: 'live',
    features: ['Free Picks', 'Pro Analysis', 'Elite Insights', 'SMS Alerts']
  },
  {
    id: 'orchestrator',
    name: 'AI Orchestrator',
    description: 'Multi-agent coordination system',
    testUrl: 'https://orchestrator.test.cevict.ai',
    prodUrl: 'https://orchestrator.cevict.ai',
    apiEndpoint: '/api/orchestrator',
    status: 'live',
    features: ['Multi-Agent', 'Task Planning', 'Real-time Dashboard', 'Agent Memory']
  },
  {
    id: 'massager',
    name: 'Data Massager',
    description: 'Enterprise data processing & arbitrage detection',
    testUrl: 'https://massager.test.cevict.ai',
    prodUrl: 'https://massager.cevict.ai',
    apiEndpoint: '/api/massager',
    status: 'live',
    features: ['11 Commands', 'Arb Finder', 'Hedge Calc', 'Supervisor Agent']
  },
  {
    id: 'claude-effect',
    name: 'Claude Effect',
    description: 'Autonomous self-learning prediction bot',
    testUrl: 'https://claude.test.cevict.ai',
    prodUrl: 'https://claude.cevict.ai',
    apiEndpoint: '/api/claude-effect',
    status: 'beta',
    features: ['Self-Learning', 'Bot Academy', 'Kaggle Training', 'Read-Only Viewing']
  }
]

// Get project URL based on environment
export function getProjectUrl(projectId: string): string {
  const project = AI_PROJECTS.find(p => p.id === projectId)
  if (!project) return '/'
  
  return getEnvironment() === 'production' ? project.prodUrl : project.testUrl
}

// Check if feature is enabled
export function isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
  return getConfig().features[feature]
}

