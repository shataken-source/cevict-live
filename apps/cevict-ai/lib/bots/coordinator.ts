/**
 * Bot Coordinator - Master Controller
 * ====================================
 * Coordinates all bots into a unified autonomous system
 */

import { MonitorBot } from './monitor-bot'
import { DiagnosticBot } from './diagnostic-bot'
import { RepairBot } from './repair-bot'
import { DeployBot } from './deploy-bot'
import { OrchestratorBot } from './orchestrator-bot'
import { DEFAULT_BOT_CONFIGS, Issue, RepairAction, BotEvent } from './index'

interface CoordinatorState {
  isRunning: boolean
  startedAt?: string
  mode: 'autonomous' | 'supervised' | 'manual'
  activeBots: string[]
  recentEvents: BotEvent[]
  healthCheckInterval?: NodeJS.Timeout
}

interface BotStatus {
  id: string
  name: string
  status: 'active' | 'idle' | 'error'
  lastActivity?: string
}

export class BotCoordinator {
  private state: CoordinatorState
  
  // Bot instances
  public monitor: MonitorBot
  public diagnostic: DiagnosticBot
  public repair: RepairBot
  public deploy: DeployBot
  public orchestrator: OrchestratorBot

  constructor() {
    this.state = {
      isRunning: false,
      mode: 'supervised',
      activeBots: [],
      recentEvents: []
    }

    // Initialize all bots
    this.monitor = new MonitorBot(DEFAULT_BOT_CONFIGS.monitor)
    this.diagnostic = new DiagnosticBot(DEFAULT_BOT_CONFIGS.diagnostic)
    this.repair = new RepairBot(DEFAULT_BOT_CONFIGS.repair)
    this.deploy = new DeployBot(DEFAULT_BOT_CONFIGS.deploy)
    this.orchestrator = new OrchestratorBot(DEFAULT_BOT_CONFIGS.orchestrator)

    // Wire up bot communication
    this.setupBotCommunication()
  }

  // Connect bots so they communicate automatically
  private setupBotCommunication() {
    // Monitor → Diagnostic: When issue detected, start diagnosis
    this.monitor.setIssueHandler(async (issue: Issue) => {
      this.logEvent('COORDINATOR', 'ISSUE_RECEIVED', { issueId: issue.id })
      
      // Get diagnosis
      const diagnosis = await this.diagnostic.analyze(issue)
      
      // Let orchestrator decide what to do
      const decision = this.orchestrator.processIssue(issue)
      
      // If approved, queue repair
      if (decision.approved && diagnosis.suggestedActions.length > 0) {
        const primaryAction = diagnosis.suggestedActions[0]
        await this.repair.queueRepair(primaryAction)
      }
    })

    // Diagnostic → Orchestrator: Pass diagnosis for decision making
    this.diagnostic.setDiagnosisHandler((diagnosis) => {
      this.logEvent('COORDINATOR', 'DIAGNOSIS_RECEIVED', { 
        issueId: diagnosis.issueId,
        rootCause: diagnosis.rootCause 
      })
    })

    // Repair → Deploy: When repair needs deployment
    this.repair.setRepairHandler((record) => {
      this.logEvent('COORDINATOR', 'REPAIR_COMPLETED', { 
        actionId: record.action.id,
        result: record.result 
      })
      
      // Update orchestrator with result
      const decisions = this.orchestrator.getDecisions()
      const relatedDecision = decisions.find(d => 
        d.trigger.includes(record.action.issueId)
      )
      
      if (relatedDecision) {
        this.orchestrator.markExecuted(relatedDecision.id, record.result)
      }
    })

    // Deploy → Monitor: After deployment, monitor for issues
    this.deploy.setDeployHandler((deployment) => {
      this.logEvent('COORDINATOR', 'DEPLOYMENT_COMPLETED', { 
        deploymentId: deployment.id,
        status: deployment.status 
      })
      
      // Deployment complete - monitor will pick up any issues automatically
    })
  }

  // Start all bots
  start(mode: CoordinatorState['mode'] = 'supervised') {
    if (this.state.isRunning) {
      console.log('[Coordinator] Already running')
      return
    }

    this.state.isRunning = true
    this.state.startedAt = new Date().toISOString()
    this.state.mode = mode

    // Set orchestrator mode
    this.orchestrator.setMode(mode)

    // Start monitoring
    this.monitor.start()
    this.state.activeBots.push('monitor', 'diagnostic', 'repair', 'deploy', 'orchestrator')

    this.logEvent('COORDINATOR', 'SYSTEM_STARTED', { mode })
    console.log(`[Coordinator] 🤖 Cevict AI Bot System started in ${mode} mode`)
  }

  // Stop all bots
  stop() {
    this.monitor.stop()
    
    if (this.state.healthCheckInterval) {
      clearInterval(this.state.healthCheckInterval)
    }

    this.state.isRunning = false
    this.state.activeBots = []

    this.logEvent('COORDINATOR', 'SYSTEM_STOPPED', {})
    console.log('[Coordinator] 🛑 Cevict AI Bot System stopped')
  }

  // Change operation mode
  setMode(mode: CoordinatorState['mode']) {
    this.state.mode = mode
    this.orchestrator.setMode(mode)
    
    // Adjust repair bot auto-approve based on mode
    if (mode === 'autonomous') {
      // In autonomous mode, lower severity issues can be auto-approved
      console.log('[Coordinator] Switched to AUTONOMOUS mode - bots can act independently')
    } else if (mode === 'supervised') {
      console.log('[Coordinator] Switched to SUPERVISED mode - critical actions need approval')
    } else {
      console.log('[Coordinator] Switched to MANUAL mode - all actions need approval')
    }

    this.logEvent('COORDINATOR', 'MODE_CHANGED', { mode })
  }

  // Get all pending approvals across all bots
  getAllPendingApprovals(): {
    repairs: RepairAction[]
    decisions: any[]
  } {
    return {
      repairs: this.repair.getPendingApprovals(),
      decisions: this.orchestrator.getPendingApprovals()
    }
  }

  // Approve all pending (batch approval)
  approveAll() {
    const pending = this.getAllPendingApprovals()
    
    pending.repairs.forEach(r => this.repair.approveRepair(r.id))
    pending.decisions.forEach(d => this.orchestrator.approveDecision(d.id))

    this.logEvent('COORDINATOR', 'BATCH_APPROVED', {
      repairs: pending.repairs.length,
      decisions: pending.decisions.length
    })
  }

  // Get status of all bots
  getBotStatuses(): BotStatus[] {
    const monitorState = this.monitor.getState()
    const diagnosticState = this.diagnostic.getState()
    const repairState = this.repair.getState()
    const deployState = this.deploy.getState()
    const orchestratorState = this.orchestrator.getState()

    return [
      {
        id: 'monitor',
        name: 'Production Monitor',
        status: monitorState.isRunning ? 'active' : 'idle',
        lastActivity: monitorState.lastRun || undefined
      },
      {
        id: 'diagnostic',
        name: 'Error Diagnostician',
        status: diagnosticState.isAnalyzing ? 'active' : 'idle',
        lastActivity: diagnosticState.events.slice(-1)[0]?.timestamp
      },
      {
        id: 'repair',
        name: 'Auto Repair',
        status: repairState.isRepairing ? 'active' : 'idle',
        lastActivity: repairState.repairHistory.slice(-1)[0]?.startedAt
      },
      {
        id: 'deploy',
        name: 'Auto Deploy',
        status: deployState.isDeploying ? 'active' : 'idle',
        lastActivity: deployState.deploymentHistory.slice(-1)[0]?.startedAt
      },
      {
        id: 'orchestrator',
        name: 'Bot Orchestrator',
        status: orchestratorState.isRunning ? 'active' : 'idle',
        lastActivity: orchestratorState.stats.lastDecision
      }
    ]
  }

  // Get comprehensive system state
  getSystemState() {
    return {
      coordinator: {
        isRunning: this.state.isRunning,
        startedAt: this.state.startedAt,
        mode: this.state.mode,
        activeBots: this.state.activeBots
      },
      monitor: this.monitor.getState(),
      diagnostic: this.diagnostic.getState(),
      repair: this.repair.getState(),
      deploy: this.deploy.getState(),
      orchestrator: this.orchestrator.getState(),
      pendingApprovals: this.getAllPendingApprovals(),
      recentEvents: this.state.recentEvents.slice(-50)
    }
  }

  // Get dashboard summary
  getDashboard() {
    const stats = this.orchestrator.getStats()
    const monitorState = this.monitor.getState()
    const services = monitorState.services

    return {
      status: this.state.isRunning ? 'operational' : 'stopped',
      mode: this.state.mode,
      uptime: this.state.startedAt 
        ? Date.now() - new Date(this.state.startedAt).getTime()
        : 0,
      services: Object.values(services).map((s: any) => ({
        name: s.service,
        status: s.status,
        latency: s.latency
      })),
      stats: {
        issuesDetected: stats.issuesDetected,
        issuesResolved: stats.issuesResolved,
        autoRepairs: stats.autoRepairs,
        pendingApprovals: this.getAllPendingApprovals().repairs.length + 
                         this.getAllPendingApprovals().decisions.length
      },
      recentIssues: this.monitor.getIssues(5),
      recentDecisions: this.orchestrator.getDecisions(5)
    }
  }

  private logEvent(source: string, event: string, data: any) {
    const fullEvent: BotEvent = {
      botId: source,
      event,
      timestamp: new Date().toISOString(),
      data
    }
    
    this.state.recentEvents.push(fullEvent)
    
    // Keep only last 200 events
    if (this.state.recentEvents.length > 200) {
      this.state.recentEvents = this.state.recentEvents.slice(-200)
    }
  }
}

// Singleton instance for the entire system
let coordinatorInstance: BotCoordinator | null = null

export function getBotCoordinator(): BotCoordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = new BotCoordinator()
  }
  return coordinatorInstance
}

export function resetBotCoordinator(): void {
  if (coordinatorInstance) {
    coordinatorInstance.stop()
    coordinatorInstance = null
  }
}

