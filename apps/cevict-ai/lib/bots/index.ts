/**
 * CEVICT.AI - Autonomous Bot System
 * ==================================
 * Self-healing, self-monitoring, self-deploying AI infrastructure
 */

export { MonitorBot } from './monitor-bot'
export { DiagnosticBot } from './diagnostic-bot'
export { RepairBot } from './repair-bot'
export { DeployBot } from './deploy-bot'
export { OrchestratorBot } from './orchestrator-bot'
export { BotCoordinator } from './coordinator'

export type BotStatus = 'idle' | 'active' | 'error' | 'waiting_approval'
export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface BotConfig {
  id: string
  name: string
  enabled: boolean
  interval: number // ms between runs
  autoApprove: boolean // can act without human approval
  maxRetries: number
}

export interface Issue {
  id: string
  service: string
  severity: Severity
  type: 'error' | 'degraded' | 'timeout' | 'crash' | 'security'
  message: string
  timestamp: string
  stackTrace?: string
  metadata?: Record<string, any>
}

export interface RepairAction {
  id: string
  issueId: string
  type: 'restart' | 'rollback' | 'patch' | 'config_change' | 'scale'
  description: string
  code?: string
  approved: boolean
  appliedAt?: string
  result?: 'success' | 'failure'
}

export interface BotEvent {
  botId: string
  event: string
  timestamp: string
  data: any
}

// Default configurations for all bots
export const DEFAULT_BOT_CONFIGS: Record<string, BotConfig> = {
  monitor: {
    id: 'monitor',
    name: 'Production Monitor',
    enabled: true,
    interval: 30000, // Check every 30 seconds
    autoApprove: true,
    maxRetries: 3
  },
  diagnostic: {
    id: 'diagnostic',
    name: 'Error Diagnostician',
    enabled: true,
    interval: 0, // Triggered by monitor
    autoApprove: true,
    maxRetries: 3
  },
  repair: {
    id: 'repair',
    name: 'Auto Repair',
    enabled: true,
    interval: 0, // Triggered by diagnostic
    autoApprove: false, // Requires approval for production changes
    maxRetries: 2
  },
  deploy: {
    id: 'deploy',
    name: 'Auto Deploy',
    enabled: true,
    interval: 0, // Triggered by repair
    autoApprove: false, // Requires approval
    maxRetries: 1
  },
  orchestrator: {
    id: 'orchestrator',
    name: 'Bot Orchestrator',
    enabled: true,
    interval: 5000, // Coordinate every 5 seconds
    autoApprove: true,
    maxRetries: 5
  }
}

