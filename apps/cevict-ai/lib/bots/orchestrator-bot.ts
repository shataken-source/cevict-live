import { createClient } from '@supabase/supabase-js';

let prodSupabase: any;
let testSupabase: any;

function getProdSupabase() {
  if (!prodSupabase) {
    prodSupabase = createClient(process.env.PROD_SUPABASE_URL!, process.env.PROD_SUPABASE_SERVICE_ROLE_KEY!);
  }
  return prodSupabase;
}

function getTestSupabase() {
  if (!testSupabase) {
    testSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return testSupabase;
}

export class OrchestratorBot {
  private isRunning = false;
  private config: any;
  private mode: 'autonomous' | 'supervised' | 'manual' = 'supervised';
  private decisions: any[] = [];
  private stats = { issuesDetected: 0, issuesResolved: 0, autoRepairs: 0, lastDecision: '' };

  constructor(config?: any) {
    this.config = config || {};
  }

  processIssue(issue: any) {
    this.stats.issuesDetected++;
    const approved = issue.severity === 'high' || issue.severity === 'critical';
    const decision = {
      id: `dec_${Date.now()}`,
      issueId: issue.id,
      approved,
      trigger: issue.id,
      executed: false,
      timestamp: new Date().toISOString()
    };
    this.decisions.push(decision);
    this.stats.lastDecision = decision.timestamp;
    return { approved, reason: approved ? 'Auto-approved' : 'Manual review', issueId: issue.id };
  }

  getDecisions(limit?: number) {
    return limit ? this.decisions.slice(-limit) : this.decisions;
  }

  getPendingApprovals() {
    return this.decisions.filter(d => !d.executed && !d.approved);
  }

  markExecuted(decisionId: string, result: string) {
    const d = this.decisions.find(d => d.id === decisionId);
    if (d) {
      d.executed = true;
      d.result = result;
      if (result === 'success') this.stats.issuesResolved++;
    }
  }

  approveDecision(decisionId: string) {
    const d = this.decisions.find(d => d.id === decisionId);
    if (d) {
      d.approved = true;
      this.stats.autoRepairs++;
    }
  }

  setMode(mode: 'autonomous' | 'supervised' | 'manual') {
    this.mode = mode;
  }

  getStats() {
    return this.stats;
  }

  getState() {
    return { isRunning: this.isRunning, mode: this.mode, stats: this.stats };
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('🤖 Orchestrator Bot: ONLINE (Monitoring Production)');
    this.loop();
  }
  private async loop() {
    while (this.isRunning) {
      const { data: config } = await getProdSupabase().from('system_config').select('value').eq('config_key', 'anai_active').single();
      if (config?.value === 'true') {
        console.log('👁️ Monitoring Production Bottlenecks...');
        // Logic for repairs goes here
      }
      await new Promise(r => setTimeout(r, 60000));
    }
  }
}
export const orchestrator = new OrchestratorBot();
