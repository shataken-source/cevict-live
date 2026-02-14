/**
 * Alert System Service
 * Sends alerts for line movement, arbitrage, injuries, and other opportunities
 */

export interface Alert {
  id: string;
  type: 'line_movement' | 'arbitrage' | 'injury' | 'steam_move' | 'value_pick' | 'system';
  severity: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  data: any;
  createdAt: string;
  acknowledged: boolean;
  channels: string[]; // email, sms, push, webhook
}

export interface AlertConfig {
  lineMovementThreshold: number; // points
  arbitrageMinProfit: number; // percent
  injuryConfidenceImpact: number; // percent drop
  webhookUrl?: string;
  emailRecipients?: string[];
  smsNumbers?: string[];
}

export class AlertSystem {
  private alerts: Map<string, Alert> = new Map();
  private config: AlertConfig;
  private sentAlerts: Set<string> = new Set(); // Prevent duplicates

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = {
      lineMovementThreshold: 2,
      arbitrageMinProfit: 1,
      injuryConfidenceImpact: 10,
      ...config,
    };
  }

  /**
   * Create line movement alert
   */
  lineMovement(
    gameId: string,
    sport: string,
    team: string,
    market: string,
    oldLine: number,
    newLine: number,
    movement: number
  ): Alert | null {
    if (Math.abs(movement) < this.config.lineMovementThreshold) return null;

    const id = `line-${gameId}-${Date.now()}`;
    if (this.sentAlerts.has(id)) return null;

    const alert: Alert = {
      id,
      type: 'line_movement',
      severity: Math.abs(movement) > 5 ? 'high' : 'medium',
      title: `${sport}: ${team} Line Movement`,
      message: `${market} moved from ${oldLine} to ${newLine} (${movement > 0 ? '+' : ''}${movement})`,
      data: { gameId, sport, team, market, oldLine, newLine, movement },
      createdAt: new Date().toISOString(),
      acknowledged: false,
      channels: ['webhook'],
    };

    this.alerts.set(id, alert);
    this.sentAlerts.add(id);
    this.send(alert);
    return alert;
  }

  /**
   * Create arbitrage alert
   */
  arbitrage(
    gameId: string,
    sport: string,
    profitPercent: number,
    books: string[]
  ): Alert | null {
    if (profitPercent < this.config.arbitrageMinProfit) return null;

    const id = `arb-${gameId}-${Date.now()}`;
    if (this.sentAlerts.has(id)) return null;

    const alert: Alert = {
      id,
      type: 'arbitrage',
      severity: 'urgent',
      title: `ARBITRAGE: ${sport} ${profitPercent.toFixed(2)}% Profit`,
      message: `Guaranteed profit opportunity across ${books.join(' & ')}`,
      data: { gameId, sport, profitPercent, books },
      createdAt: new Date().toISOString(),
      acknowledged: false,
      channels: ['webhook', 'sms'],
    };

    this.alerts.set(id, alert);
    this.sentAlerts.add(id);
    this.send(alert);
    return alert;
  }

  /**
   * Create injury alert
   */
  injury(
    gameId: string,
    sport: string,
    team: string,
    player: string,
    status: 'out' | 'questionable' | 'doubtful',
    confidenceImpact: number
  ): Alert | null {
    if (confidenceImpact < this.config.injuryConfidenceImpact) return null;

    const id = `inj-${gameId}-${player}-${Date.now()}`;
    if (this.sentAlerts.has(id)) return null;

    const alert: Alert = {
      id,
      type: 'injury',
      severity: status === 'out' ? 'high' : 'medium',
      title: `INJURY: ${player} (${team})`,
      message: `${player} is ${status}. Confidence impact: -${confidenceImpact}%`,
      data: { gameId, sport, team, player, status, confidenceImpact },
      createdAt: new Date().toISOString(),
      acknowledged: false,
      channels: ['webhook'],
    };

    this.alerts.set(id, alert);
    this.sentAlerts.add(id);
    this.send(alert);
    return alert;
  }

  /**
   * Create steam move alert
   */
  steamMove(
    gameId: string,
    sport: string,
    market: string,
    pointsMoved: number,
    timeWindow: number
  ): Alert | null {
    const id = `steam-${gameId}-${Date.now()}`;
    if (this.sentAlerts.has(id)) return null;

    const alert: Alert = {
      id,
      type: 'steam_move',
      severity: pointsMoved > 5 ? 'high' : 'medium',
      title: `STEAM MOVE: ${sport}`,
      message: `${market} moved ${pointsMoved} points in ${timeWindow} minutes`,
      data: { gameId, sport, market, pointsMoved, timeWindow },
      createdAt: new Date().toISOString(),
      acknowledged: false,
      channels: ['webhook'],
    };

    this.alerts.set(id, alert);
    this.sentAlerts.add(id);
    this.send(alert);
    return alert;
  }

  /**
   * Send alert through configured channels
   */
  private async send(alert: Alert): Promise<void> {
    for (const channel of alert.channels) {
      try {
        switch (channel) {
          case 'webhook':
            if (this.config.webhookUrl) {
              await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alert),
              });
            }
            break;
          case 'email':
            // Email implementation would go here
            console.log(`[Alert Email] ${alert.title}`);
            break;
          case 'sms':
            // SMS implementation would go here
            console.log(`[Alert SMS] ${alert.title}`);
            break;
        }
      } catch (e) {
        console.error(`[Alert] Failed to send via ${channel}:`, e);
      }
    }
  }

  /**
   * Get all unacknowledged alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(a => !a.acknowledged)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Acknowledge alert
   */
  acknowledge(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }
}

export default AlertSystem;
