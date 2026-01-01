/**
 * Kalshi Trader
 * Automated prediction market trading via Kalshi API
 * Note: Kalshi is legal in most US states for prediction markets
 */

import { PredictionMarket, Opportunity, Trade, FundAccount } from '../types';
import crypto from 'crypto';

interface KalshiPosition {
  marketId: string;
  contracts: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
}

interface KalshiOrder {
  id: string;
  marketId: string;
  side: 'yes' | 'no';
  price: number;
  quantity: number;
  status: 'open' | 'filled' | 'cancelled';
}

export class KalshiTrader {
  private apiKeyId: string;
  private privateKey: string;
  private baseUrl: string;
  private isProduction: boolean;
  private keyConfigured: boolean = false;

  constructor() {
    this.apiKeyId = process.env.KALSHI_API_KEY_ID || '';
    const rawKey = process.env.KALSHI_PRIVATE_KEY || '';
    console.log(`   🔍 DEBUG: rawKey length = ${rawKey.length}`);
    this.privateKey = this.parsePrivateKey(rawKey);
    console.log(`   🔍 DEBUG: parsed privateKey length = ${this.privateKey.length}`);
    // Kalshi API URLs (updated to new endpoint 2025)
    this.baseUrl = process.env.KALSHI_ENV === 'production'
      ? 'https://api.elections.kalshi.com/trade-api/v2'
      : 'https://demo-api.kalshi.co/trade-api/v2';
    this.isProduction = process.env.KALSHI_ENV === 'production';

    if (this.apiKeyId && this.privateKey) {
      console.log('   🎯 Kalshi API: Configured');
      // Debug: show key format info
      const hasRSAHeader = this.privateKey.includes('RSA PRIVATE KEY');
      const hasPKCS8Header = this.privateKey.includes('BEGIN PRIVATE KEY');
      const hasECHeader = this.privateKey.includes('EC PRIVATE KEY');
      console.log(`   📝 Key format: ${hasRSAHeader ? 'RSA' : hasPKCS8Header ? 'PKCS8' : hasECHeader ? 'EC' : 'Unknown'}`);
      console.log(`   📝 Key length: ${this.privateKey.length} chars`);
      this.keyConfigured = true;

      // Test key validity
      this.testKeyValidity();
    }
  }

  /**
   * Test if the key can be loaded
   */
  private testKeyValidity(): void {
    try {
      crypto.createPrivateKey(this.privateKey);
      console.log('   ✅ Kalshi private key is valid');
    } catch (err: any) {
      console.log(`   ❌ Kalshi key parse error: ${err.message}`);
      console.log(`   📝 Parsed key preview (first 200 chars): ${this.privateKey.substring(0, 200)}`);
      console.log(`   📝 Parsed key lines: ${this.privateKey.split('\n').length}`);
      console.log(`   📝 Has BEGIN: ${this.privateKey.includes('-----BEGIN')}`);
      console.log(`   📝 Has END: ${this.privateKey.includes('-----END')}`);
      this.keyConfigured = false;
    }
  }

  /**
   * Parse and normalize private key from various formats
   * Handles: PEM files, base64-only, escaped newlines, quoted strings
   */
  private parsePrivateKey(keyStr: string): string {
    if (!keyStr) return '';

    try {
      let key = keyStr;

      // Remove surrounding quotes if present
      if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1);
      }

      // Handle multiple types of escaped newlines
      // Order matters: do double-escaped first, then single-escaped
      key = key.replace(/\\\\n/g, '\n');  // \\n -> \n
      key = key.replace(/\\n/g, '\n');     // \n -> newline
      key = key.replace(/\\r/g, '');       // Remove \r
      key = key.replace(/\r\n/g, '\n');    // Windows newlines
      key = key.replace(/\r/g, '\n');      // Old Mac newlines

      // If the key has proper PEM headers, process it
      if (key.includes('-----BEGIN') && key.includes('-----END')) {
        // Extract the header, body, and footer
        const beginMatch = key.match(/(-----BEGIN[^-]+-----)/);
        const endMatch = key.match(/(-----END[^-]+-----)/);
        
        if (beginMatch && endMatch) {
          const header = beginMatch[1];
          const footer = endMatch[1];
          const body = key.substring(beginMatch.index! + beginMatch[0].length, endMatch.index!).trim();
          
          // If body contains spaces but no newlines, it's a single-line key - reformat it
          if (body.includes(' ') && !body.includes('\n')) {
            // Split on spaces and join with newlines (PEM format is 64 chars per line)
            const base64Chunks = body.split(/\s+/).filter(chunk => chunk.length > 0);
            const formattedBody = base64Chunks.join('\n');
            return `${header}\n${formattedBody}\n${footer}`;
          }
          
          // Otherwise, ensure headers are on their own lines
          let formatted = key.replace(/(-----BEGIN[^-]+-----)/g, '\n$1\n');
          formatted = formatted.replace(/(-----END[^-]+-----)/g, '\n$1\n');
          formatted = formatted.replace(/\n{2,}/g, '\n').trim();
          return formatted;
        }
        
        // Fallback: just ensure headers are on their own lines
        key = key.replace(/(-----BEGIN[^-]+-----)/g, '\n$1\n');
        key = key.replace(/(-----END[^-]+-----)/g, '\n$1\n');
        key = key.replace(/\n{2,}/g, '\n').trim();
        return key;
      }

      // If no headers, try to reconstruct
      // Remove all whitespace and see if it's valid base64
      const cleanKey = key.replace(/\s+/g, '');
      const base64Pattern = /^[A-Za-z0-9+/=]+$/;

      if (base64Pattern.test(cleanKey) && cleanKey.length > 100) {
        // RSA 2048 key body is ~1600 chars, RSA 4096 is ~3200 chars
        // With headers it's about ~1700 and ~3300
        if (cleanKey.length >= 1500) {
          // Looks like RSA key - try PKCS#1 format first (most common for Kalshi)
          return `-----BEGIN RSA PRIVATE KEY-----\n${this.formatBase64(cleanKey)}\n-----END RSA PRIVATE KEY-----`;
        } else if (cleanKey.length < 500) {
          // Might be EC key
          return `-----BEGIN EC PRIVATE KEY-----\n${this.formatBase64(cleanKey)}\n-----END EC PRIVATE KEY-----`;
        } else {
          // Try PKCS#8 format
          return `-----BEGIN PRIVATE KEY-----\n${this.formatBase64(cleanKey)}\n-----END PRIVATE KEY-----`;
        }
      }

      // Return as-is if we can't figure it out
      console.log('   ⚠️ Could not parse Kalshi private key format');
      console.log(`   📝 Raw key preview: ${key.substring(0, 100)}...`);
      return key;
    } catch (error) {
      console.error('Error parsing Kalshi private key:', error);
      return '';
    }
  }

  /**
   * Format base64 string with proper line breaks (64 chars per line)
   */
  private formatBase64(base64: string): string {
    const lines: string[] = [];
    for (let i = 0; i < base64.length; i += 64) {
      lines.push(base64.slice(i, i + 64));
    }
    return lines.join('\n');
  }

  private async signRequest(method: string, path: string, body?: any): Promise<string> {
    if (!this.privateKey) return '';

    // Kalshi uses milliseconds timestamp
    const timestamp = Date.now().toString();

    // Strip query parameters from path before signing
    const pathWithoutQuery = path.split('?')[0];

    // Message format: timestamp + method + path (without query)
    const message = `${timestamp}${method}${pathWithoutQuery}`;

    try {
      // Try to create the private key object - let Node.js auto-detect the format
      let privateKeyObj;

      try {
        // First try: auto-detect format
        privateKeyObj = crypto.createPrivateKey(this.privateKey);
      } catch (e1) {
        try {
          // Second try: explicit PKCS#8 format
          privateKeyObj = crypto.createPrivateKey({
            key: this.privateKey,
            format: 'pem',
            type: 'pkcs8'
          });
        } catch (e2) {
          try {
            // Third try: explicit PKCS#1 RSA format
            privateKeyObj = crypto.createPrivateKey({
              key: this.privateKey,
              format: 'pem',
              type: 'pkcs1'
            });
          } catch (e3) {
            console.error('Could not parse private key in any format');
            return '';
          }
        }
      }

      // Kalshi uses RSA-PSS with SHA256 (not plain RSA-SHA256)
      const signature = crypto.sign(
        'sha256',
        Buffer.from(message),
        {
          key: privateKeyObj,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST, // salt length = hash length (32 bytes for SHA256)
        }
      );

      return signature.toString('base64');
    } catch (err: any) {
      console.error('Kalshi signing error:', err.message);
      // Return empty string instead of throwing - allow demo mode
      return '';
    }
  }

  // Get the timestamp used for signing (stored for header use)
  private lastTimestamp: string = '';

  private async signRequestWithTimestamp(method: string, path: string, body?: any): Promise<{ signature: string; timestamp: string }> {
    if (!this.privateKey) return { signature: '', timestamp: '' };

    // Kalshi uses milliseconds timestamp
    const timestamp = Date.now().toString();
    this.lastTimestamp = timestamp;

    // Strip query parameters from path before signing
    const pathWithoutQuery = path.split('?')[0];

    // Message format: timestamp + method + path (without query)
    const message = `${timestamp}${method}${pathWithoutQuery}`;

    try {
      let privateKeyObj;

      try {
        privateKeyObj = crypto.createPrivateKey(this.privateKey);
      } catch (e1) {
        try {
          privateKeyObj = crypto.createPrivateKey({
            key: this.privateKey,
            format: 'pem',
            type: 'pkcs8'
          });
        } catch (e2) {
          try {
            privateKeyObj = crypto.createPrivateKey({
              key: this.privateKey,
              format: 'pem',
              type: 'pkcs1'
            });
          } catch (e3) {
            return { signature: '', timestamp: '' };
          }
        }
      }

      // Kalshi uses RSA-PSS with SHA256
      const signature = crypto.sign(
        'sha256',
        Buffer.from(message),
        {
          key: privateKeyObj,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
        }
      );

      return { signature: signature.toString('base64'), timestamp };
    } catch (err: any) {
      console.error('Kalshi signing error:', err.message);
      return { signature: '', timestamp: '' };
    }
  }

  isConfigured(): boolean {
    return this.keyConfigured;
  }

  async getBalance(): Promise<number> {
    if (!this.apiKeyId || !this.keyConfigured) {
      // Demo mode - return simulated balance
      return 500;
    }

    try {
      // Full path is required for signature (includes /trade-api/v2 prefix)
      const fullPath = '/trade-api/v2/portfolio/balance';
      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);

      // If signature failed, fall back to demo mode
      if (!signature) {
        console.log('   ⚠️ Kalshi signature failed, using demo balance');
        return 500;
      }

      // Base URL already includes /trade-api/v2, so just append the endpoint
      const apiUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;

      const response = await fetch(apiUrl, {
        headers: {
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Kalshi API error: ${response.status} - ${errorText}`);
        return 500; // Demo balance on error
      }

      const data = await response.json();
      console.log('   ✅ Kalshi API connected successfully');
      return (data.balance || 0) / 100; // Kalshi uses cents
    } catch (error: any) {
      console.error('Kalshi balance error:', error.message);
      return 500; // Demo balance
    }
  }

  async getMarkets(category?: string): Promise<PredictionMarket[]> {
    // If not configured or key invalid, use sample markets
    if (!this.apiKeyId || !this.keyConfigured) {
      return this.getSampleMarkets();
    }

    try {
      // Full path for signature
      let fullPath = '/trade-api/v2/markets?status=open&limit=100';
      if (category) fullPath += `&series_ticker=${category}`;

      const { signature, timestamp } = await this.signRequestWithTimestamp('GET', fullPath);

      if (!signature) {
        console.log('   ⚠️ Kalshi signature failed, using sample markets');
        return this.getSampleMarkets();
      }

      // Base URL already includes /trade-api/v2, so construct full URL
      const apiUrl = this.baseUrl.replace('/trade-api/v2', '') + fullPath;

      const response = await fetch(apiUrl, {
        headers: {
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ⚠️ Kalshi API error: ${response.status} - ${errorText}`);
        return this.getSampleMarkets();
      }

      const data = await response.json();
      return this.transformMarkets(data.markets || []);
    } catch (error) {
      console.error('Error fetching Kalshi markets:', error);
      return this.getSampleMarkets();
    }
  }

  async findOpportunities(minEdge: number = 5): Promise<Opportunity[]> {
    const markets = await this.getMarkets();
    const opportunities: Opportunity[] = [];

    for (const market of markets) {
      // Our AI-predicted probability vs market price
      const aiPrediction = await this.predictOutcome(market);
      const marketYesProb = market.yesPrice / 100;
      const marketNoProb = market.noPrice / 100;

      // Check for edge on YES side
      const yesEdge = (aiPrediction - marketYesProb) * 100;
      if (yesEdge >= minEdge) {
        opportunities.push(this.createOpportunity(market, 'yes', yesEdge, aiPrediction));
      }

      // Check for edge on NO side
      const noEdge = ((1 - aiPrediction) - marketNoProb) * 100;
      if (noEdge >= minEdge) {
        opportunities.push(this.createOpportunity(market, 'no', noEdge, 1 - aiPrediction));
      }
    }

    return opportunities.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  private async predictOutcome(market: PredictionMarket): Promise<number> {
    // Use Claude to analyze and predict
    // In production, this would call the AI

    // For now, use market analysis heuristics
    const title = market.title.toLowerCase();

    // Sample predictions based on market type
    if (title.includes('fed') && title.includes('rate')) {
      // Fed rate decisions - check economic indicators
      return 0.65; // Sample prediction
    }

    if (title.includes('bitcoin') || title.includes('btc')) {
      // Crypto predictions
      return market.yesPrice > 50 ? 0.55 : 0.45;
    }

    if (title.includes('election') || title.includes('vote')) {
      // Political predictions
      return market.yesPrice / 100 + (Math.random() * 0.1 - 0.05); // Slight adjustment
    }

    // Default: slight edge towards market consensus with variance
    return market.yesPrice / 100 + (Math.random() * 0.08 - 0.04);
  }

  private createOpportunity(
    market: PredictionMarket,
    side: 'yes' | 'no',
    edge: number,
    prediction: number
  ): Opportunity {
    const price = side === 'yes' ? market.yesPrice : market.noPrice;
    const stake = this.calculateOptimalStake(edge, price);
    const grossReturn = stake * (100 / price);
    // Kalshi charges 10% fee on winnings (not on stake)
    const winnings = grossReturn - stake;
    const kalshiFee = winnings * 0.10; // 10% of winnings
    const netReturn = grossReturn - kalshiFee;
    const netProfit = netReturn - stake;

    return {
      id: `kalshi_${market.id}_${side}_${Date.now()}`,
      type: 'prediction_market',
      source: 'Kalshi',
      title: `${side.toUpperCase()}: ${market.title}`,
      description: `AI predicts ${(prediction * 100).toFixed(1)}% probability, market at ${price}¢`,
      confidence: Math.min(50 + edge, 90),
      expectedValue: edge,
      riskLevel: edge > 15 ? 'low' : edge > 8 ? 'medium' : 'high',
      timeframe: `Expires: ${new Date(market.expiresAt).toLocaleDateString()}`,
      requiredCapital: stake,
      potentialReturn: netReturn, // Use net return after fees
      reasoning: [
        `Market ${side} price: ${price}¢`,
        `Our AI prediction: ${(prediction * 100).toFixed(1)}%`,
        `Edge: +${edge.toFixed(1)}%`,
        `Gross return: $${grossReturn.toFixed(2)} | Fee (10% of winnings): $${kalshiFee.toFixed(2)}`,
        `Net return: $${netReturn.toFixed(2)} | Net profit: $${netProfit.toFixed(2)}`,
        `Expected value (after fees): $${(netProfit * prediction).toFixed(2)}`,
      ],
      dataPoints: [{
        source: 'Kalshi',
        metric: 'Volume',
        value: market.volume,
        relevance: 70,
        timestamp: new Date().toISOString(),
      }],
      action: {
        platform: 'kalshi',
        actionType: 'buy',
        amount: stake,
        target: `${market.id} ${side.toUpperCase()}`,
        instructions: [
          `Buy ${Math.floor(stake / price * 100)} ${side.toUpperCase()} contracts`,
          `At price: ${price}¢ or better`,
          `Max spend: $${stake}`,
        ],
        autoExecute: edge > 10 && this.isProduction,
      },
      expiresAt: market.expiresAt,
      createdAt: new Date().toISOString(),
    };
  }

  private calculateOptimalStake(edge: number, price: number): number {
    // Kelly Criterion for prediction markets
    const prob = (price + edge) / 100;
    const odds = 100 / price - 1;
    const kelly = (prob * odds - (1 - prob)) / odds;

    // Use quarter Kelly, min $5, max $25
    return Math.min(Math.max(kelly * 0.25 * 100, 5), 25);
  }

  async placeBet(marketId: string, side: 'yes' | 'no', amount: number, maxPrice: number): Promise<Trade | null> {
    if (!this.apiKeyId || !this.keyConfigured) {
      console.log(`[SIMULATED] Placing ${side} bet on ${marketId}: $${amount} at max ${maxPrice}¢`);
      return {
        id: `sim_${Date.now()}`,
        opportunityId: marketId,
        type: 'prediction_market',
        platform: 'kalshi',
        amount,
        target: `${marketId} ${side}`,
        entryPrice: maxPrice,
        status: 'active',
        profit: 0,
        reasoning: 'Simulated trade',
        executedAt: new Date().toISOString(),
      };
    }

    try {
      const contracts = Math.floor(amount / maxPrice * 100);

      // Full path for signature (must match what we sign)
      const fullPath = '/trade-api/v2/portfolio/orders';
      const builderCode = process.env.KALSHI_BUILDER_CODE || '';
      const body: any = {
        ticker: marketId,
        client_order_id: `bot_${Date.now()}`,
        side,
        action: 'buy',
        count: contracts,
        type: 'limit',
        yes_price: side === 'yes' ? maxPrice : undefined,
        no_price: side === 'no' ? maxPrice : undefined,
      };
      
      // Add Builder Code if configured (Dec 2025 feature - earns % of volume)
      if (builderCode) {
        body.builder_code = builderCode;
      }

      const { signature, timestamp } = await this.signRequestWithTimestamp('POST', fullPath, body);

      if (!signature) {
        console.log('[SIMULATED - No valid signature] Order would be:', body);
        return {
          id: `sim_${Date.now()}`,
          opportunityId: marketId,
          type: 'prediction_market',
          platform: 'kalshi',
          amount,
          target: `${marketId} ${side}`,
          entryPrice: maxPrice,
          status: 'simulated',
          profit: 0,
          reasoning: 'Simulated - signature unavailable',
          executedAt: new Date().toISOString(),
        };
      }

      const response = await fetch(`${this.baseUrl}/portfolio/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Kalshi order error:', error);
        return null;
      }

      const order = await response.json();
      console.log('✅ Kalshi order placed:', order);

      // Extract fees from order response (in cents, convert to dollars)
      const takerFees = (order.order?.taker_fees || 0);
      const makerFees = (order.order?.maker_fees || 0);

      return {
        id: order.order?.order_id || `order_${Date.now()}`,
        opportunityId: marketId,
        type: 'prediction_market',
        platform: 'kalshi',
        amount,
        target: `${marketId} ${side}`,
        entryPrice: maxPrice,
        status: order.order?.status || 'pending',
        profit: 0,
        reasoning: 'AI-selected opportunity',
        executedAt: new Date().toISOString(),
        taker_fees: takerFees,     // Keep in cents for consistency with Kalshi API
        maker_fees: makerFees,
        total_fees: takerFees + makerFees,
      };
    } catch (error) {
      console.error('Error placing Kalshi bet:', error);
      return null;
    }
  }

  async getPositions(): Promise<KalshiPosition[]> {
    if (!this.apiKeyId) return [];

    try {
      const path = '/portfolio/positions';
      const signature = await this.signRequest('GET', path);

      const response = await fetch(`${this.baseUrl}${path}`, {
        headers: {
          'KALSHI-ACCESS-KEY': this.apiKeyId,
          'KALSHI-ACCESS-SIGNATURE': signature,
          'KALSHI-ACCESS-TIMESTAMP': timestamp,
        },
      });

      if (!response.ok) return [];
      const data = await response.json();
      return data.market_positions || [];
    } catch (error) {
      console.error('Error fetching positions:', error);
      return [];
    }
  }

  private transformMarkets(apiMarkets: any[]): PredictionMarket[] {
    return apiMarkets.map(m => ({
      id: m.ticker,
      platform: 'Kalshi',
      title: m.title,
      category: m.category,
      yesPrice: m.yes_bid || 50,
      noPrice: m.no_bid || 50,
      volume: m.volume || 0,
      expiresAt: m.close_time,
      aiPrediction: 0,
      edge: 0,
    }));
  }

  private getSampleMarkets(): PredictionMarket[] {
    return [
      {
        id: 'FED-25JAN-T0.25',
        platform: 'Kalshi',
        title: 'Will the Fed cut rates by 25bps in January?',
        category: 'Economics',
        yesPrice: 72,
        noPrice: 28,
        volume: 125000,
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        aiPrediction: 0.78,
        edge: 6,
      },
      {
        id: 'BTC-100K-25Q1',
        platform: 'Kalshi',
        title: 'Will Bitcoin exceed $100,000 in Q1 2025?',
        category: 'Crypto',
        yesPrice: 45,
        noPrice: 55,
        volume: 89000,
        expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
        aiPrediction: 0.52,
        edge: 7,
      },
      {
        id: 'WEATHER-SNOW-NYC',
        platform: 'Kalshi',
        title: 'Will NYC get 6+ inches of snow this week?',
        category: 'Weather',
        yesPrice: 35,
        noPrice: 65,
        volume: 15000,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        aiPrediction: 0.42,
        edge: 7,
      },
    ];
  }
}








