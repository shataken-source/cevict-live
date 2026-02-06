/**
 * Subscription Monitor
 * Tracks API tokens, credits, and subscription usage
 * Alerts when running low on critical services
 */

interface ServiceStatus {
  name: string;
  type: 'api' | 'subscription' | 'credits';
  status: 'ok' | 'warning' | 'critical' | 'unknown';
  usage?: number;
  limit?: number;
  remaining?: number;
  percentUsed?: number;
  renewsAt?: string;
  lastChecked: string;
  details?: string;
}

interface MonitoringConfig {
  warningThreshold: number; // Percentage
  criticalThreshold: number;
  checkIntervalMs: number;
}

export class SubscriptionMonitor {
  private config: MonitoringConfig;
  private lastStatus: Map<string, ServiceStatus> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      warningThreshold: 30, // Warn at 30% remaining
      criticalThreshold: 10, // Critical at 10% remaining
      checkIntervalMs: 3600000, // Check every hour
    };
  }

  async checkAll(): Promise<ServiceStatus[]> {
    console.log('\n🔍 Checking all subscriptions and API tokens...\n');

    const checks = await Promise.allSettled([
      this.checkAnthropic(),
      this.checkOpenAI(),
      this.checkSupabase(),
      this.checkVercel(),
      this.checkOddsAPI(),
      this.checkAPISports(),
      this.checkSinch(),
      this.checkStripe(),
      this.checkCoinGecko(),
    ]);

    const statuses: ServiceStatus[] = checks
      .filter((r): r is PromiseFulfilledResult<ServiceStatus> => r.status === 'fulfilled')
      .map(r => r.value);

    // Update cache
    statuses.forEach(s => this.lastStatus.set(s.name, s));

    // Log summary
    this.logSummary(statuses);

    return statuses;
  }

  /**
   * Anthropic (Claude) API Credits
   */
  async checkAnthropic(): Promise<ServiceStatus> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const status: ServiceStatus = {
      name: 'Anthropic (Claude)',
      type: 'credits',
      status: 'unknown',
      lastChecked: new Date().toISOString(),
    };

    if (!apiKey) {
      status.status = 'critical';
      status.details = 'API key not configured';
      return status;
    }

    try {
      // Anthropic doesn't have a usage endpoint yet, so we check if the key works
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });

      if (response.ok) {
        status.status = 'ok';
        status.details = 'API key valid and working';
        // Note: Check your Anthropic console for actual usage
        status.remaining = undefined; // Would need console API
      } else if (response.status === 429) {
        status.status = 'warning';
        status.details = 'Rate limited - may be running low';
      } else if (response.status === 401) {
        status.status = 'critical';
        status.details = 'Invalid API key';
      } else {
        const error = await response.text();
        status.details = `Error: ${error.slice(0, 100)}`;
      }
    } catch (error: any) {
      status.details = `Check failed: ${error.message}`;
    }

    return status;
  }

  /**
   * OpenAI API Credits
   */
  async checkOpenAI(): Promise<ServiceStatus> {
    const apiKey = process.env.OPENAI_API_KEY;
    const status: ServiceStatus = {
      name: 'OpenAI (GPT)',
      type: 'credits',
      status: 'unknown',
      lastChecked: new Date().toISOString(),
    };

    if (!apiKey) {
      status.status = 'ok';
      status.details = 'Not configured (optional)';
      return status;
    }

    try {
      // Check billing/usage
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });

      if (response.ok) {
        status.status = 'ok';
        status.details = 'API key valid';
      } else if (response.status === 429) {
        status.status = 'warning';
        status.details = 'Rate limited or quota exceeded';
      } else if (response.status === 401) {
        status.status = 'critical';
        status.details = 'Invalid API key';
      }
    } catch (error: any) {
      status.details = `Check failed: ${error.message}`;
    }

    return status;
  }

  /**
   * Supabase Usage
   */
  async checkSupabase(): Promise<ServiceStatus> {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    
    const status: ServiceStatus = {
      name: 'Supabase',
      type: 'subscription',
      status: 'unknown',
      lastChecked: new Date().toISOString(),
    };

    if (!url || !key) {
      status.status = 'critical';
      status.details = 'Not configured';
      return status;
    }

    try {
      // Test database connection
      const response = await fetch(`${url}/rest/v1/`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      });

      if (response.ok) {
        status.status = 'ok';
        status.details = 'Database connected';
        
        // Free tier limits (as of 2024):
        // - 500MB database
        // - 1GB file storage  
        // - 2GB bandwidth
        // Check Supabase dashboard for actual usage
        status.details += ' | Check dashboard for usage';
      } else {
        status.status = 'warning';
        status.details = 'Connection issues';
      }
    } catch (error: any) {
      status.status = 'critical';
      status.details = `Connection failed: ${error.message}`;
    }

    return status;
  }

  /**
   * Vercel Usage
   */
  async checkVercel(): Promise<ServiceStatus> {
    const token = process.env.VERCEL_TOKEN;
    
    const status: ServiceStatus = {
      name: 'Vercel',
      type: 'subscription',
      status: 'unknown',
      lastChecked: new Date().toISOString(),
    };

    if (!token) {
      status.status = 'ok';
      status.details = 'Using default deployment (no token)';
      return status;
    }

    try {
      // Get team/user usage
      const response = await fetch('https://api.vercel.com/v2/user', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        status.status = 'ok';
        status.details = `Account: ${data.user?.username || 'Connected'}`;

        // Check for usage limits
        const usageResponse = await fetch('https://api.vercel.com/v1/integrations/usage', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (usageResponse.ok) {
          const usage = await usageResponse.json();
          // Parse usage data if available
          if (usage.bandwidth) {
            const pct = (usage.bandwidth.used / usage.bandwidth.limit) * 100;
            status.percentUsed = pct;
            if (pct > 90) status.status = 'critical';
            else if (pct > 70) status.status = 'warning';
          }
        }
      } else {
        status.status = 'warning';
        status.details = 'Could not verify account';
      }
    } catch (error: any) {
      status.details = `Check failed: ${error.message}`;
    }

    return status;
  }

  /**
   * The Odds API
   */
  async checkOddsAPI(): Promise<ServiceStatus> {
    const apiKey = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY;
    
    const status: ServiceStatus = {
      name: 'The Odds API',
      type: 'api',
      status: 'unknown',
      lastChecked: new Date().toISOString(),
    };

    if (!apiKey) {
      status.status = 'critical';
      status.details = 'Not configured - sports betting disabled';
      return status;
    }

    try {
      // Check remaining requests
      const response = await fetch(
        `https://api.the-odds-api.com/v4/sports?apiKey=${apiKey}`
      );

      if (response.ok) {
        // The Odds API returns remaining requests in headers
        const remaining = response.headers.get('x-requests-remaining');
        const used = response.headers.get('x-requests-used');
        
        if (remaining) {
          status.remaining = parseInt(remaining);
          status.usage = used ? parseInt(used) : undefined;
          status.limit = status.remaining + (status.usage || 0);
          status.percentUsed = status.limit > 0 
            ? ((status.usage || 0) / status.limit) * 100 
            : 0;

          if (status.remaining < 100) {
            status.status = 'critical';
            status.details = `Only ${remaining} requests left!`;
          } else if (status.remaining < 500) {
            status.status = 'warning';
            status.details = `${remaining} requests remaining`;
          } else {
            status.status = 'ok';
            status.details = `${remaining} requests remaining`;
          }
        } else {
          status.status = 'ok';
          status.details = 'API working';
        }
      } else if (response.status === 401) {
        status.status = 'critical';
        status.details = 'Invalid API key';
      } else if (response.status === 429) {
        status.status = 'critical';
        status.details = 'Rate limit exceeded - quota depleted';
      }
    } catch (error: any) {
      status.details = `Check failed: ${error.message}`;
    }

    return status;
  }

  /**
   * API-Sports (NFL, NBA, etc.)
   */
  async checkAPISports(): Promise<ServiceStatus> {
    const apiKey = process.env.API_SPORTS_KEY;
    
    const status: ServiceStatus = {
      name: 'API-Sports',
      type: 'api',
      status: 'unknown',
      lastChecked: new Date().toISOString(),
    };

    if (!apiKey) {
      status.status = 'ok';
      status.details = 'Not configured (optional)';
      return status;
    }

    try {
      // Check account status
      const response = await fetch('https://v1.american-football.api-sports.io/status', {
        headers: { 'x-apisports-key': apiKey },
      });

      if (response.ok) {
        const data = await response.json();
        const account = data.response?.account;
        const subscription = data.response?.subscription;
        const requests = data.response?.requests;

        if (requests) {
          status.usage = requests.current;
          status.limit = requests.limit_day;
          status.remaining = (status.limit || 0) - (status.usage || 0);
          status.percentUsed = status.limit ? ((status.usage || 0) / status.limit) * 100 : 0;

          if (status.remaining < 10) {
            status.status = 'critical';
            status.details = `Only ${status.remaining} requests left today`;
          } else if (status.remaining < 50) {
            status.status = 'warning';
            status.details = `${status.remaining}/${status.limit} requests remaining`;
          } else {
            status.status = 'ok';
            status.details = `${status.remaining}/${status.limit} requests remaining`;
          }
        }

        if (subscription?.end) {
          status.renewsAt = subscription.end;
          const daysLeft = Math.ceil(
            (new Date(subscription.end).getTime() - Date.now()) / 86400000
          );
          if (daysLeft < 3) {
            status.status = 'critical';
            status.details += ` | Expires in ${daysLeft} days!`;
          } else if (daysLeft < 7) {
            status.status = 'warning';
            status.details += ` | Expires in ${daysLeft} days`;
          }
        }
      } else {
        status.status = 'warning';
        status.details = 'Could not check status';
      }
    } catch (error: any) {
      status.details = `Check failed: ${error.message}`;
    }

    return status;
  }

  /**
   * Sinch SMS
   */
  async checkSinch(): Promise<ServiceStatus> {
    const keyId = process.env.SINCH_KEY_ID;
    const keySecret = process.env.SINCH_KEY_SECRET;
    const projectId = process.env.SINCH_PROJECT_ID;
    
    const status: ServiceStatus = {
      name: 'Sinch SMS',
      type: 'credits',
      status: 'unknown',
      lastChecked: new Date().toISOString(),
    };

    if (!keyId || !keySecret || !projectId) {
      status.status = 'warning';
      status.details = 'Not configured - SMS alerts disabled';
      return status;
    }

    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      
      // Check account balance (if available)
      const response = await fetch(
        `https://sms.api.sinch.com/xms/v1/${projectId}/batches?page_size=1`,
        {
          headers: { 'Authorization': `Basic ${auth}` },
        }
      );

      if (response.ok) {
        status.status = 'ok';
        status.details = 'SMS service connected';
        // Note: Check Sinch dashboard for credit balance
      } else if (response.status === 401) {
        status.status = 'critical';
        status.details = 'Invalid credentials';
      } else {
        status.status = 'warning';
        status.details = 'Could not verify service';
      }
    } catch (error: any) {
      status.details = `Check failed: ${error.message}`;
    }

    return status;
  }

  /**
   * Stripe
   */
  async checkStripe(): Promise<ServiceStatus> {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    
    const status: ServiceStatus = {
      name: 'Stripe',
      type: 'subscription',
      status: 'unknown',
      lastChecked: new Date().toISOString(),
    };

    if (!secretKey) {
      status.status = 'warning';
      status.details = 'Not configured - payments disabled';
      return status;
    }

    try {
      const response = await fetch('https://api.stripe.com/v1/balance', {
        headers: { 'Authorization': `Bearer ${secretKey}` },
      });

      if (response.ok) {
        const data = await response.json();
        const available = data.available?.[0];
        
        status.status = 'ok';
        if (available) {
          const balance = (available.amount / 100).toFixed(2);
          status.details = `Balance: $${balance} ${available.currency.toUpperCase()}`;
        } else {
          status.details = 'Connected';
        }
      } else if (response.status === 401) {
        status.status = 'critical';
        status.details = 'Invalid API key';
      }
    } catch (error: any) {
      status.details = `Check failed: ${error.message}`;
    }

    return status;
  }

  /**
   * CoinGecko API
   */
  async checkCoinGecko(): Promise<ServiceStatus> {
    const apiKey = process.env.COINGECKO_API_KEY;
    
    const status: ServiceStatus = {
      name: 'CoinGecko',
      type: 'api',
      status: 'unknown',
      lastChecked: new Date().toISOString(),
    };

    try {
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['x-cg-demo-api-key'] = apiKey;
      }

      const response = await fetch('https://api.coingecko.com/api/v3/ping', { headers });

      if (response.ok) {
        status.status = 'ok';
        status.details = apiKey ? 'Pro API connected' : 'Free tier (limited)';
        
        // Check rate limit headers
        const remaining = response.headers.get('x-ratelimit-remaining');
        if (remaining) {
          status.remaining = parseInt(remaining);
          if (status.remaining < 10) {
            status.status = 'warning';
            status.details += ` | ${remaining} calls left`;
          }
        }
      } else if (response.status === 429) {
        status.status = 'critical';
        status.details = 'Rate limit exceeded';
      }
    } catch (error: any) {
      status.details = `Check failed: ${error.message}`;
    }

    return status;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Initial check
    this.checkAll();

    // Schedule regular checks
    this.checkInterval = setInterval(() => {
      this.checkAll();
    }, this.config.checkIntervalMs);

    console.log(`📊 Subscription monitoring started (every ${this.config.checkIntervalMs / 60000} minutes)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Get cached status
   */
  getStatus(serviceName?: string): ServiceStatus | ServiceStatus[] | undefined {
    if (serviceName) {
      return this.lastStatus.get(serviceName);
    }
    return Array.from(this.lastStatus.values());
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts(): ServiceStatus[] {
    return Array.from(this.lastStatus.values())
      .filter(s => s.status === 'critical');
  }

  /**
   * Get warnings
   */
  getWarnings(): ServiceStatus[] {
    return Array.from(this.lastStatus.values())
      .filter(s => s.status === 'warning');
  }

  /**
   * Log summary
   */
  private logSummary(statuses: ServiceStatus[]): void {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║           📊 SUBSCRIPTION & TOKEN STATUS              ║');
    console.log('╠═══════════════════════════════════════════════════════╣');

    for (const s of statuses) {
      const icon = s.status === 'ok' ? '✅' : s.status === 'warning' ? '⚠️' : s.status === 'critical' ? '🔴' : '❓';
      const name = s.name.padEnd(20);
      const detail = (s.details || '').slice(0, 30).padEnd(30);
      console.log(`║ ${icon} ${name} ${detail}║`);
    }

    console.log('╚═══════════════════════════════════════════════════════╝\n');

    // Alert on critical issues
    const critical = statuses.filter(s => s.status === 'critical');
    if (critical.length > 0) {
      console.log('🚨 CRITICAL ALERTS:');
      critical.forEach(s => console.log(`   🔴 ${s.name}: ${s.details}`));
      console.log('');
    }

    const warnings = statuses.filter(s => s.status === 'warning');
    if (warnings.length > 0) {
      console.log('⚠️ WARNINGS:');
      warnings.forEach(s => console.log(`   ⚠️ ${s.name}: ${s.details}`));
      console.log('');
    }
  }

  /**
   * Generate SMS alert for critical issues
   */
  generateAlertMessage(): string | null {
    const critical = this.getCriticalAlerts();
    const warnings = this.getWarnings();

    if (critical.length === 0 && warnings.length === 0) {
      return null;
    }

    let message = '🚨 SUBSCRIPTION ALERT\n\n';

    if (critical.length > 0) {
      message += 'CRITICAL:\n';
      critical.forEach(s => {
        message += `🔴 ${s.name}: ${s.details}\n`;
      });
      message += '\n';
    }

    if (warnings.length > 0) {
      message += 'WARNINGS:\n';
      warnings.forEach(s => {
        message += `⚠️ ${s.name}: ${s.details}\n`;
      });
    }

    return message;
  }

  /**
   * Get status as JSON for API
   */
  toJSON(): object {
    const statuses = Array.from(this.lastStatus.values());
    return {
      healthy: statuses.every(s => s.status !== 'critical'),
      critical: statuses.filter(s => s.status === 'critical').length,
      warnings: statuses.filter(s => s.status === 'warning').length,
      services: statuses,
      lastChecked: new Date().toISOString(),
    };
  }
}

