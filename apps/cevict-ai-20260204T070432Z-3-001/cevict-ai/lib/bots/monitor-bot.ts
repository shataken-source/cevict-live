/**
 * Monitor Bot - Autonomous Production Watcher
 * ============================================
 * Continuously monitors all production services for issues
 */

import { BotConfig, Issue, Severity, BotEvent } from './index'

interface ServiceHealth {
  service: string
  url: string
  status: 'healthy' | 'degraded' | 'down'
  latency: number
  lastCheck: string
  errorCount: number
  consecutiveFailures: number
}

interface MonitorState {
  isRunning: boolean
  lastRun: string | null
  services: Map<string, ServiceHealth>
  issues: Issue[]
  events: BotEvent[]
}

export class MonitorBot {
  private config: BotConfig
  private state: MonitorState
  private intervalId: NodeJS.Timeout | null = null
  private onIssueDetected: ((issue: Issue) => void) | null = null

  // Production endpoints to monitor
  private readonly SERVICES = [
    { id: 'gateway', name: 'Gateway', url: 'https://cevict.ai/api/health' },
    { id: 'progno', name: 'PROGNO', url: 'https://progno.cevict.ai/api/health' },
    { id: 'prognostication', name: 'Prognostication', url: 'https://prognostication.com/api/health' },
    { id: 'orchestrator', name: 'Orchestrator', url: 'https://orchestrator.cevict.ai/api/health' },
    { id: 'massager', name: 'Massager', url: 'https://massager.cevict.ai/api/health' },
    { id: 'supabase', name: 'Database', url: 'https://nqkbqtiramecvmmpaxzk.supabase.co/rest/v1/' }
  ]

  constructor(config: BotConfig) {
    this.config = config
    this.state = {
      isRunning: false,
      lastRun: null,
      services: new Map(),
      issues: [],
      events: []
    }

    // Initialize service states
    this.SERVICES.forEach(s => {
      this.state.services.set(s.id, {
        service: s.name,
        url: s.url,
        status: 'healthy',
        latency: 0,
        lastCheck: new Date().toISOString(),
        errorCount: 0,
        consecutiveFailures: 0
      })
    })
  }

  // Set callback for when issues are detected
  setIssueHandler(handler: (issue: Issue) => void) {
    this.onIssueDetected = handler
  }

  // Start autonomous monitoring
  start() {
    if (this.state.isRunning) return

    this.state.isRunning = true
    this.logEvent('MONITOR_STARTED', { services: this.SERVICES.length })

    // Run immediately, then on interval
    this.runHealthChecks()
    this.intervalId = setInterval(() => this.runHealthChecks(), this.config.interval)
  }

  // Stop monitoring
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.state.isRunning = false
    this.logEvent('MONITOR_STOPPED', {})
  }

  // Main health check loop
  private async runHealthChecks() {
    this.state.lastRun = new Date().toISOString()

    for (const service of this.SERVICES) {
      await this.checkService(service)
    }

    // Check for patterns that indicate systemic issues
    this.analyzePatterns()
  }

  // Check individual service health
  private async checkService(service: { id: string; name: string; url: string }) {
    const startTime = Date.now()
    const health = this.state.services.get(service.id)!

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch(service.url, {
        signal: controller.signal,
        headers: {
          'X-Monitor-Bot': 'cevict-ai',
          'X-Request-Id': crypto.randomUUID()
        }
      })

      clearTimeout(timeout)
      const latency = Date.now() - startTime

      if (response.ok) {
        // Service is healthy
        health.status = latency > 2000 ? 'degraded' : 'healthy'
        health.latency = latency
        health.consecutiveFailures = 0

        if (latency > 2000) {
          this.createIssue(service.id, 'degraded', 'medium', 
            `${service.name} responding slowly (${latency}ms)`)
        }
      } else {
        // Service returned error
        health.status = 'degraded'
        health.errorCount++
        health.consecutiveFailures++

        this.createIssue(service.id, 'error', 'high',
          `${service.name} returned ${response.status}: ${response.statusText}`)
      }
    } catch (error: any) {
      // Service unreachable
      health.status = 'down'
      health.errorCount++
      health.consecutiveFailures++
      health.latency = Date.now() - startTime

      const severity: Severity = health.consecutiveFailures >= 3 ? 'critical' : 'high'
      
      this.createIssue(service.id, 'crash', severity,
        `${service.name} unreachable: ${error.message}`,
        error.stack)
    }

    health.lastCheck = new Date().toISOString()
  }

  // Create and emit an issue
  private createIssue(
    serviceId: string, 
    type: Issue['type'], 
    severity: Severity, 
    message: string,
    stackTrace?: string
  ) {
    const issue: Issue = {
      id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      service: serviceId,
      severity,
      type,
      message,
      timestamp: new Date().toISOString(),
      stackTrace,
      metadata: {
        health: this.state.services.get(serviceId)
      }
    }

    this.state.issues.push(issue)
    this.logEvent('ISSUE_DETECTED', issue)

    // Trigger issue handler
    if (this.onIssueDetected) {
      this.onIssueDetected(issue)
    }
  }

  // Analyze patterns across services
  private analyzePatterns() {
    const recentIssues = this.state.issues.filter(
      i => Date.now() - new Date(i.timestamp).getTime() < 300000 // Last 5 min
    )

    // Check for cascade failure
    const affectedServices = new Set(recentIssues.map(i => i.service))
    if (affectedServices.size >= 3) {
      this.createIssue('system', 'crash', 'critical',
        `Cascade failure detected: ${affectedServices.size} services affected`)
    }

    // Check for repeated issues
    const issuesByService = new Map<string, number>()
    recentIssues.forEach(i => {
      issuesByService.set(i.service, (issuesByService.get(i.service) || 0) + 1)
    })

    issuesByService.forEach((count, service) => {
      if (count >= 5) {
        this.createIssue(service, 'error', 'critical',
          `Repeated failures on ${service}: ${count} issues in 5 minutes`)
      }
    })
  }

  // Get current state
  getState() {
    return {
      ...this.state,
      services: Object.fromEntries(this.state.services),
      config: this.config
    }
  }

  // Get recent issues
  getIssues(limit: number = 50) {
    return this.state.issues.slice(-limit)
  }

  // Clear resolved issues
  clearIssue(issueId: string) {
    this.state.issues = this.state.issues.filter(i => i.id !== issueId)
  }

  private logEvent(event: string, data: any) {
    this.state.events.push({
      botId: 'monitor',
      event,
      timestamp: new Date().toISOString(),
      data
    })

    // Keep only last 100 events
    if (this.state.events.length > 100) {
      this.state.events = this.state.events.slice(-100)
    }
  }
}

