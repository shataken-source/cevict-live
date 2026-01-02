/**
 * Cryptocurrency Payment Service
 * Supports Bitcoin (BTC) and Ethereum (ETH) via Coinbase Commerce API
 *
 * Coinbase Commerce is free, supports BTC/ETH, and handles all the complexity
 * of address generation, payment monitoring, and confirmation.
 */

export interface CryptoPaymentRequest {
  amount: number; // USD amount
  currency: 'BTC' | 'ETH';
  description: string;
  metadata?: Record<string, string>;
}

export interface CryptoPaymentResponse {
  id: string;
  code: string;
  hosted_url: string;
  address: string;
  amount: {
    amount: string; // Crypto amount
    currency: string; // BTC or ETH
  };
  pricing: {
    local: {
      amount: string; // USD amount
      currency: string; // USD
    };
  };
  expires_at: string;
  status: 'NEW' | 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'UNRESOLVED' | 'RESOLVED';
}

export interface CryptoPaymentStatus {
  id: string;
  status: string;
  payment: {
    network: string;
    transaction_id: string;
    value: {
      local: {
        amount: string;
        currency: string;
      };
      crypto: {
        amount: string;
        currency: string;
      };
    };
  } | null;
}

export class CryptoPaymentService {
  private static instance: CryptoPaymentService;
  private apiKey: string | null;
  private baseUrl = 'https://api.commerce.coinbase.com';

  constructor() {
    // Coinbase Commerce API key
    this.apiKey = process.env.COINBASE_COMMERCE_API_KEY || null;
  }

  static getInstance(): CryptoPaymentService {
    if (!CryptoPaymentService.instance) {
      CryptoPaymentService.instance = new CryptoPaymentService();
    }
    return CryptoPaymentService.instance;
  }

  private checkApiKey(): string {
    if (!this.apiKey) {
      throw new Error('Coinbase Commerce API key not configured. Set COINBASE_COMMERCE_API_KEY environment variable.');
    }
    return this.apiKey;
  }

  /**
   * Create a crypto payment charge
   * Returns a payment URL and address for the user to send crypto to
   */
  async createCharge(request: CryptoPaymentRequest): Promise<CryptoPaymentResponse> {
    try {
      const apiKey = this.checkApiKey();

      const response = await fetch(`${this.baseUrl}/charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CC-Api-Key': apiKey,
          'X-CC-Version': '2018-03-22',
        },
        body: JSON.stringify({
          name: request.description,
          description: request.description,
          pricing_type: 'fixed_price',
          local_price: {
            amount: request.amount.toFixed(2),
            currency: 'USD',
          },
          metadata: {
            ...request.metadata,
            currency: request.currency,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error?.message || `Coinbase Commerce API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.data.id,
        code: data.data.code,
        hosted_url: data.data.hosted_url,
        address: data.data.addresses[request.currency.toLowerCase()] || '',
        amount: {
          amount: data.data.pricing[request.currency.toLowerCase()].amount,
          currency: request.currency,
        },
        pricing: {
          local: {
            amount: data.data.pricing.local.amount,
            currency: data.data.pricing.local.currency,
          },
        },
        expires_at: data.data.expires_at,
        status: data.data.timeline[data.data.timeline.length - 1].status,
      };
    } catch (error: any) {
      console.error('Error creating crypto payment charge:', error);
      throw new Error(`Failed to create crypto payment: ${error.message}`);
    }
  }

  /**
   * Get payment status
   */
  async getChargeStatus(chargeId: string): Promise<CryptoPaymentStatus> {
    try {
      const apiKey = this.checkApiKey();

      const response = await fetch(`${this.baseUrl}/charges/${chargeId}`, {
        method: 'GET',
        headers: {
          'X-CC-Api-Key': apiKey,
          'X-CC-Version': '2018-03-22',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get charge status: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: data.data.id,
        status: data.data.timeline[data.data.timeline.length - 1].status,
        payment: data.data.payments && data.data.payments.length > 0 ? {
          network: data.data.payments[0].network,
          transaction_id: data.data.payments[0].transaction_id,
          value: {
            local: {
              amount: data.data.payments[0].value.local.amount,
              currency: data.data.payments[0].value.local.currency,
            },
            crypto: {
              amount: data.data.payments[0].value.crypto.amount,
              currency: data.data.payments[0].value.crypto.currency,
            },
          },
        } : null,
      };
    } catch (error: any) {
      console.error('Error getting charge status:', error);
      throw new Error(`Failed to get charge status: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature from Coinbase Commerce
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    sharedSecret: string
  ): boolean {
    // Use Web Crypto API for browser compatibility, or Node.js crypto for server
    if (typeof window === 'undefined') {
      // Server-side: use Node.js crypto
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', sharedSecret);
      const hash = hmac.update(payload).digest('hex');
      return hash === signature;
    } else {
      // Client-side: would need to use Web Crypto API
      // For now, webhook verification should only happen server-side
      throw new Error('Webhook verification must be done server-side');
    }
  }
}

export default CryptoPaymentService;

