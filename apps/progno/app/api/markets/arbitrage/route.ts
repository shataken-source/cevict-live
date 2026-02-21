/**
 * Cross-Platform Arbitrage API
 * Finds arbitrage opportunities between Kalshi and Polymarket
 */

import { NextRequest, NextResponse } from 'next/server';
import { ArbitrageDetector } from '@/lib/markets/arbitrage-detector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const minProfit = parseFloat(searchParams.get('minProfit') || '0.01'); // 1% minimum
    const maxRisk = searchParams.get('maxRisk') as 'low' | 'medium' | 'high' | null;

    const detector = new ArbitrageDetector();

    // Find arbitrage opportunities
    const opportunities = await detector.findArbitrageOpportunities(limit * 2);

    // Filter by criteria
    let filtered = opportunities.filter(opp => opp.profit >= minProfit);
    
    if (maxRisk) {
      const riskLevels = { low: 0, medium: 1, high: 2 };
      const maxRiskLevel = riskLevels[maxRisk];
      filtered = filtered.filter(opp => riskLevels[opp.risk] <= maxRiskLevel);
    }

    // Sort by profit (highest first)
    filtered.sort((a, b) => b.profit - a.profit);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      count: filtered.length,
      opportunities: filtered.slice(0, limit),
      filters: {
        minProfit,
        maxRisk: maxRisk || 'any',
      },
      summary: {
        totalOpportunities: opportunities.length,
        avgProfit: opportunities.length > 0
          ? opportunities.reduce((sum, opp) => sum + opp.profit, 0) / opportunities.length
          : 0,
        lowRiskCount: filtered.filter(opp => opp.risk === 'low').length,
        mediumRiskCount: filtered.filter(opp => opp.risk === 'medium').length,
        highRiskCount: filtered.filter(opp => opp.risk === 'high').length,
      },
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      warning: 'Arbitrage execution requires access to both platforms. Polymarket access may be limited for U.S. users.',
    });
  } catch (error: any) {
    console.error('Error finding arbitrage opportunities:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
