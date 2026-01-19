/**
 * Webhook Manager
 * Manages webhook subscriptions and delivery
 */

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  failureCount: number;
}

export interface WebhookEvent {
  type: string;
  data: any;
  timestamp: Date;
  requestId: string;
}

class WebhookManager {
  private subscriptions = new Map<string, WebhookSubscription>();

  /**
   * Register a webhook subscription
   */
  subscribe(subscription: Omit<WebhookSubscription, 'id' | 'createdAt' | 'failureCount'>): string {
    const id = `webhook_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.subscriptions.set(id, {
      ...subscription,
      id,
      createdAt: new Date(),
      failureCount: 0,
    });
    return id;
  }

  /**
   * Unsubscribe a webhook
   */
  unsubscribe(id: string): boolean {
    return this.subscriptions.delete(id);
  }

  /**
   * Trigger webhooks for an event
   */
  async trigger(event: WebhookEvent): Promise<void> {
    const matchingSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.active && sub.events.includes(event.type));

    // Fire webhooks in parallel (don't await)
    for (const subscription of matchingSubscriptions) {
      this.deliverWebhook(subscription, event).catch(error => {
        console.error(`[Webhook] Failed to deliver to ${subscription.url}:`, error);
        subscription.failureCount++;
        if (subscription.failureCount >= 5) {
          subscription.active = false;
          console.warn(`[Webhook] Deactivated ${subscription.id} after 5 failures`);
        }
      });
    }
  }

  /**
   * Deliver webhook to a single subscription
   */
  private async deliverWebhook(subscription: WebhookSubscription, event: WebhookEvent): Promise<void> {
    const payload = {
      event: event.type,
      data: event.data,
      timestamp: event.timestamp.toISOString(),
      requestId: event.requestId,
    };

    // Generate signature if secret is provided
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Progno-Webhook/1.0',
    };

    if (subscription.secret) {
      // TODO: Generate HMAC signature
      // const signature = generateHMAC(JSON.stringify(payload), subscription.secret);
      // headers['X-Progno-Signature'] = signature;
    }

    const response = await fetch(subscription.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
    }

    subscription.lastTriggered = new Date();
    subscription.failureCount = 0;
  }

  /**
   * Get all subscriptions
   */
  getSubscriptions(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }
}

export const webhookManager = new WebhookManager();

