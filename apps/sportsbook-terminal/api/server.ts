/**
 * Express API Server - Prognostication Capital
 * Production-grade backend for institutional probability trading
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Import internal modules
import {
  allocateCapital,
  createPortfolio,
  updatePortfolioBankroll,
  type SignalInput,
  type PortfolioState
} from '../src/capital-allocator/capitalAllocator';

import {
  runMonteCarlo,
  type SimulationConfig,
  type SimulatedTrade
} from '../src/risk-engine/monteCarlo';

import {
  generateParlays,
  analyzeTeasers,
  type ParlayCombination
} from '../src/strategy-engine/parlayOptimizer';

import {
  runAlternativeStrategies,
  type AlternativeMarket,
  type ArbitrageOpportunity
} from '../src/strategy-engine/alternativeMarkets';

// Environment configuration
const PORT = process.env.PORT || 3433;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Supabase client (for auth and real-time)
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
});
app.use('/api/', limiter);

// Stricter rate limit for allocation endpoint
const allocationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
});

app.use(express.json({ limit: '10mb' }));

// Authentication middleware
async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Authentication failed' });
  }
}

// ==================== API ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Capital Allocation Endpoint
app.post('/api/allocate', allocationLimiter, authenticateToken, async (req, res) => {
  try {
    const { signals, bankroll, currentDrawdown = 0 } = req.body;

    if (!Array.isArray(signals) || !bankroll) {
      return res.status(400).json({
        error: 'Invalid request: signals array and bankroll required'
      });
    }

    // Create portfolio state
    const portfolio = createPortfolio(bankroll);
    portfolio.currentDrawdown = currentDrawdown;

    // Run allocation
    const result = allocateCapital(signals, portfolio);

    // Log allocation to database (async, don't wait)
    const userId = (req as any).user.id;
    logAllocation(userId, result).catch(console.error);

    res.json(result);
  } catch (error) {
    console.error('Allocation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Monte Carlo Simulation Endpoint
app.post('/api/simulate', authenticateToken, async (req, res) => {
  try {
    const { trades, config } = req.body;

    if (!Array.isArray(trades)) {
      return res.status(400).json({ error: 'Trades array required' });
    }

    const simulationConfig: SimulationConfig = {
      runs: config?.runs || 10000,
      startingBankroll: config?.startingBankroll || 100000,
      kellyFraction: config?.kellyFraction || 0.33,
      targetReturn: config?.targetReturn,
      maxDrawdownTolerance: config?.maxDrawdownTolerance,
    };

    const results = runMonteCarlo(trades, simulationConfig);

    res.json(results);
  } catch (error) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Parlay Optimizer Endpoint
app.post('/api/parlays', authenticateToken, async (req, res) => {
  try {
    const { picks, bankroll, options = {} } = req.body;

    if (!Array.isArray(picks) || !bankroll) {
      return res.status(400).json({
        error: 'Picks array and bankroll required'
      });
    }

    const parlays = generateParlays(picks, bankroll, options);

    res.json({
      count: parlays.length,
      parlays,
      totalExpectedValue: parlays.reduce((sum, p) => sum + p.expectedValue, 0),
    });
  } catch (error) {
    console.error('Parlay error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Teaser Optimizer Endpoint
app.post('/api/teasers', authenticateToken, async (req, res) => {
  try {
    const { picks, bankroll, options = {} } = req.body;

    if (!Array.isArray(picks)) {
      return res.status(400).json({ error: 'Picks array required' });
    }

    const teasers = analyzeTeasers(picks, bankroll, options);

    res.json({
      count: teasers.length,
      teasers: teasers.filter(t => t.recommendation === 'play'),
      opportunities: teasers,
    });
  } catch (error) {
    console.error('Teaser error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Alternative Markets Strategies Endpoint
app.post('/api/alternative-strategies', authenticateToken, async (req, res) => {
  try {
    const {
      kalshiMarkets,
      polymarketMarkets,
      modelProbabilities,
      priceHistory
    } = req.body;

    const opportunities = runAlternativeStrategies(
      kalshiMarkets || [],
      polymarketMarkets || [],
      modelProbabilities || {},
      priceHistory || {}
    );

    res.json({
      count: opportunities.length,
      opportunities,
      byType: groupByType(opportunities),
    });
  } catch (error) {
    console.error('Alternative strategies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Portfolio Summary Endpoint
app.get('/api/portfolio', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const result = await pool.query(`
      SELECT
        SUM(exposure_amount) as total_exposure,
        MAX(CASE WHEN venue = 'sportsbook' THEN exposure_amount ELSE 0 END) as sportsbook_exposure,
        MAX(CASE WHEN venue = 'kalshi' THEN exposure_amount ELSE 0 END) as kalshi_exposure,
        MAX(CASE WHEN venue = 'polymarket' THEN exposure_amount ELSE 0 END) as polymarket_exposure,
        COUNT(DISTINCT event_id) as num_events,
        COUNT(DISTINCT league) as num_leagues
      FROM portfolio_exposure
      WHERE user_id = $1
    `, [userId]);

    const trades = await pool.query(`
      SELECT
        venue,
        COUNT(*) as total,
        SUM(CASE WHEN outcome = true THEN 1 ELSE 0 END) as wins,
        SUM(pnl) as total_pnl
      FROM trades
      WHERE user_id = $1 AND status IN ('won', 'lost')
      GROUP BY venue
    `, [userId]);

    res.json({
      exposure: result.rows[0],
      performance: trades.rows,
    });
  } catch (error) {
    console.error('Portfolio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stripe Checkout Endpoint
app.post('/api/create-checkout', authenticateToken, async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;
    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;

    // Get or create Stripe customer
    let customerId: string;

    const userResult = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0]?.stripe_customer_id) {
      customerId = userResult.rows[0].stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;

      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, userId]
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl || `${process.env.FRONTEND_URL}/?success=true`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/?canceled=true`,
      metadata: { userId },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Checkout creation failed' });
  }
});

// Stripe Webhook
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret!);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;

      if (userId) {
        await pool.query(
          `UPDATE users
           SET subscription_status = 'active',
               subscription_tier = 'pro',
               stripe_subscription_id = $1
           WHERE id = $2`,
          [session.subscription, userId]
        );
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      await pool.query(
        `UPDATE users
         SET subscription_status = 'past_due'
         WHERE stripe_customer_id = $1`,
        [customerId]
      );
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;

      await pool.query(
        `UPDATE users
         SET subscription_status = 'canceled',
             subscription_tier = 'free'
         WHERE stripe_subscription_id = $1`,
        [subscription.id]
      );
      break;
    }
  }

  res.json({ received: true });
});

// ==================== HELPER FUNCTIONS ====================

async function logAllocation(userId: string, result: any) {
  try {
    for (const alloc of result.allocations) {
      await pool.query(`
        INSERT INTO allocations (
          user_id, signal_id, stake, bankroll_at_time,
          kelly_fraction, adjusted_kelly, edge, expected_value,
          was_capped, cap_reason, risk_percent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        userId,
        alloc.signalId,
        alloc.stake,
        result.remainingBankroll + result.totalAllocated,
        alloc.kellyFraction,
        alloc.adjustedKelly,
        alloc.edge,
        alloc.ev,
        alloc.capped,
        alloc.capReason,
        alloc.riskPercent,
      ]);
    }
  } catch (error) {
    console.error('Failed to log allocation:', error);
  }
}

function groupByType(opportunities: ArbitrageOpportunity[]) {
  return opportunities.reduce((acc, opp) => {
    acc[opp.type] = (acc[opp.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Prognostication Capital API running on port ${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
});

export default app;
