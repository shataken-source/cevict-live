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
  /** Path for health checks (default /api/health). Omit or set to empty to skip monitoring. */
  healthPath?: string
  /** Subscription configuration for paid tiers */
  subscription?: {
    tiers: SubscriptionTier[]
  }
}

export interface SubscriptionTier {
  id: string
  name: string
  price: number
  period: string
  type: 'subscription' | 'onetime'
  features: string[]
  maxDevices: number
  deviceLimit: number
  transferAllowed?: boolean
  providerCodeRequired?: boolean
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
  },
  // --- cevict.ai webapps (configure testUrl/prodUrl when deployed) ---
  {
    id: 'forge',
    name: 'Forge',
    description: 'Auspicio/Forge – prediction & analysis',
    testUrl: 'http://localhost:3009',
    prodUrl: 'https://forge.cevict.ai',
    apiEndpoint: '/api/forge',
    status: 'beta',
    features: ['Predictions', 'Analysis', 'Auspicio']
  },
  {
    id: 'monitor',
    name: 'Monitor',
    description: 'System monitoring & dashboards',
    testUrl: 'http://localhost:3010',
    prodUrl: 'https://monitor.cevict.ai',
    apiEndpoint: '/api/monitor',
    status: 'beta',
    features: ['Dashboards', 'Health', 'Alerts'],
    healthPath: '/api/health'
  },
  {
    id: 'praxis',
    name: 'Praxis',
    description: 'Trading analytics & arbitrage – Free / Pro / Enterprise',
    testUrl: 'http://localhost:3002',
    prodUrl: 'https://praxis.cevict.ai',
    apiEndpoint: '/api/praxis',
    status: 'beta',
    features: ['Tiers', 'Stripe', 'Kalshi', 'Polymarket', 'AI Insights'],
    healthPath: '/api/health'
  },
  {
    id: 'command-center',
    name: 'Command Center',
    description: 'Empire C2 / command center (hosted in Launchpad)',
    testUrl: 'http://localhost:3001',
    prodUrl: 'https://launchpad.cevict.ai',
    apiEndpoint: '/api/command-center',
    status: 'beta',
    features: ['C2', 'Commands', 'Empire']
  },
  {
    id: 'moltbook-viewer',
    name: 'Moltbook Viewer',
    description: 'Moltbook feed & agent viewer',
    testUrl: 'http://localhost:3014',
    prodUrl: 'https://moltbook.cevict.ai',
    apiEndpoint: '/api/moltbook',
    status: 'beta',
    features: ['Feed', 'Agent TODOs', 'Brief']
  },
  {
    id: 'iptvviewer',
    name: 'IPTV Viewer',
    description: 'Stream live TV, IPTV, with EPG, recording & more',
    testUrl: 'http://localhost:3008',
    prodUrl: 'https://iptv.cevict.ai',
    apiEndpoint: '/api/iptv',
    status: 'beta',
    features: ['Live TV', 'EPG', 'Recording', 'Chromecast', 'PiP'],
    subscription: {
      tiers: [
        {
          id: 'free',
          name: 'Free Trial',
          price: 0,
          period: '1 month',
          type: 'subscription',
          features: ['Basic EPG', '3 Channels', 'Standard Quality'],
          maxDevices: 1,
          deviceLimit: 1
        },
        {
          id: 'lifetime',
          name: 'Lifetime License',
          price: 79.99,
          period: 'forever',
          type: 'onetime',
          features: ['All Channels', 'Cloud Recording (10hrs)', '4K', 'No Ads', 'Multi-Device (5)', 'Priority Support', 'Forever Updates'],
          maxDevices: 5,
          deviceLimit: 5,
          transferAllowed: true
        },
        {
          id: 'premium',
          name: 'Premium Monthly',
          price: 14.99,
          period: 'month',
          type: 'subscription',
          features: ['All Channels', 'Cloud Recording', '4K', 'No Ads', 'Multi-Device'],
          maxDevices: 3,
          deviceLimit: 3
        },
        {
          id: 'provider',
          name: 'Provider Partner',
          price: 7.99,
          period: 'month',
          type: 'subscription',
          features: ['All Channels', 'Basic Recording', 'HD', 'Provider Support'],
          maxDevices: 1,
          deviceLimit: 1,
          providerCodeRequired: true
        }
      ]
    }
  },
  {
    id: 'accusolar',
    name: 'AccuSolar',
    description: 'Professional solar & battery monitoring with AI insights',
    testUrl: 'http://localhost:3122',
    prodUrl: 'https://accusolar.cevict.ai',
    apiEndpoint: '/api/telemetry',
    status: 'beta',
    features: ['Solar Monitoring', 'Battery Management', 'AI Insights', 'Weather Data', '8-Device Support'],
    healthPath: '/api/health',
    subscription: {
      tiers: [
        {
          id: 'basic',
          name: 'Basic',
          price: 9.99,
          period: 'month',
          type: 'subscription',
          features: [
            '1 Battery/Device',
            'Basic Telemetry (SoC, Voltage, Current)',
            '24h Data History',
            'Email Alerts',
            'Standard Support'
          ],
          maxDevices: 1,
          deviceLimit: 1
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 29.99,
          period: 'month',
          type: 'subscription',
          features: [
            'Up to 8 Batteries/Devices',
            'Full Telemetry (All metrics)',
            '90-Day Data History',
            'AI Insights & Predictions',
            'Weather Integration',
            'String Balance Analysis',
            'Priority Email Support',
            'Mobile App Access'
          ],
          maxDevices: 8,
          deviceLimit: 8
        },
        {
          id: 'pro-yearly',
          name: 'Pro Yearly',
          price: 249.99,
          period: 'year',
          type: 'subscription',
          features: [
            'Up to 8 Batteries/Devices',
            'Full Telemetry (All metrics)',
            '90-Day Data History',
            'AI Insights & Predictions',
            'Weather Integration',
            'String Balance Analysis',
            'Priority Email Support',
            'Mobile App Access',
            'Save 30% vs Monthly'
          ],
          maxDevices: 8,
          deviceLimit: 8
        },
        {
          id: 'lifetime',
          name: 'Lifetime License',
          price: 499.99,
          period: 'forever',
          type: 'onetime',
          features: [
            'Unlimited Batteries/Devices',
            'Full Telemetry Forever',
            'Lifetime Data History',
            'AI Insights & Predictions',
            'Weather Integration',
            'String Balance Analysis',
            'VIP Priority Support',
            'Mobile App Access',
            'Early Access to New Features',
            'Transferable License'
          ],
          maxDevices: 999,
          deviceLimit: 999,
          transferAllowed: true
        }
      ]
    }
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

/** Services the monitor bot should health-check. Bots run in test and monitor production. */
export function getMonitoredServices(): { id: string; name: string; url: string }[] {
  const gateway = { id: 'gateway', name: 'Gateway', url: 'https://cevict.ai/api/health' }
  const fromProjects = AI_PROJECTS
    .filter(p => p.healthPath !== '' && p.status !== 'offline')
    .map(p => ({
      id: p.id,
      name: p.name,
      url: `${p.prodUrl}${p.healthPath ?? '/api/health'}`
    }))
  return [gateway, ...fromProjects]
}

