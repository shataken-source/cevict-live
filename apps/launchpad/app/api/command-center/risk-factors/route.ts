import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface RiskFactors {
  trader: string;
  minConfidence: number;
  minEdge: number;
  maxTradeSize?: number;
  maxBetSize?: number;
  maxPositions?: number;
  rsiExtremeOversold?: number;
  rsiOversold?: number;
  rsiOverbought?: number;
  rsiNeutralMin?: number;
  rsiNeutralMax?: number;
  trendStrengthStrong?: number;
  trendStrengthModerate?: number;
  trendStrengthWeak?: number;
  edgeBlendCalculated?: number;
  edgeBlendAI?: number;
  edgeBoostStrong?: number;
  edgeBoostWeak?: number;
  volumeLow?: number;
  volumeHigh?: number;
  confidenceCap?: number;
  edgeCalibrationHigh?: number;
  edgeCalibrationLow?: number;
}

const DEFAULTS: Record<string, RiskFactors> = {
  'crypto-main': { trader: 'crypto-main', minConfidence: 60, minEdge: 1, maxTradeSize: 10, maxPositions: 5, confidenceCap: 75 },
  'microcap': {
    trader: 'microcap', minConfidence: 65, minEdge: 2, maxTradeSize: 10, maxPositions: 3,
    rsiExtremeOversold: 25, rsiOversold: 30, rsiOverbought: 75, rsiNeutralMin: 50, rsiNeutralMax: 55,
    trendStrengthStrong: 80, trendStrengthModerate: 70, trendStrengthWeak: 30,
    edgeBlendCalculated: 0.4, edgeBlendAI: 0.6, edgeBoostStrong: 4, edgeBoostWeak: 1,
    volumeLow: 10000, volumeHigh: 50000, confidenceCap: 80,
  },
  'kalshi-politics': { trader: 'kalshi-politics', minConfidence: 70, minEdge: 2, maxBetSize: 10, confidenceCap: 75, edgeCalibrationHigh: 10, edgeCalibrationLow: 5 },
  'kalshi-sports': { trader: 'kalshi-sports', minConfidence: 65, minEdge: 1.5, maxBetSize: 15, confidenceCap: 80, edgeCalibrationHigh: 10, edgeCalibrationLow: 5 },
  'kalshi-economics': { trader: 'kalshi-economics', minConfidence: 68, minEdge: 1.5, maxBetSize: 12, confidenceCap: 75, edgeCalibrationHigh: 10, edgeCalibrationLow: 5 },
  'kalshi-weather': { trader: 'kalshi-weather', minConfidence: 70, minEdge: 2, maxBetSize: 10, confidenceCap: 70, edgeCalibrationHigh: 10, edgeCalibrationLow: 5 },
  'kalshi-entertainment': { trader: 'kalshi-entertainment', minConfidence: 65, minEdge: 1.5, maxBetSize: 12, confidenceCap: 85, edgeCalibrationHigh: 10, edgeCalibrationLow: 5 },
};

export async function GET() {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('trader_risk_factors')
      .select('*')
      .order('trader');

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading risk factors:', error);
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ factors: DEFAULTS });
    }

    const factors: Record<string, RiskFactors> = { ...DEFAULTS };
    data.forEach((row: Record<string, unknown>) => {
      const t = row.trader as string;
      factors[t] = {
        trader: t,
        minConfidence: (row.min_confidence as number) ?? DEFAULTS[t]?.minConfidence ?? 65,
        minEdge: (row.min_edge as number) ?? DEFAULTS[t]?.minEdge ?? 2,
        maxTradeSize: (row.max_trade_size as number) ?? DEFAULTS[t]?.maxTradeSize,
        maxBetSize: (row.max_bet_size as number) ?? DEFAULTS[t]?.maxBetSize,
        maxPositions: (row.max_positions as number) ?? DEFAULTS[t]?.maxPositions,
        rsiExtremeOversold: (row.rsi_extreme_oversold as number) ?? DEFAULTS[t]?.rsiExtremeOversold,
        rsiOversold: (row.rsi_oversold as number) ?? DEFAULTS[t]?.rsiOversold,
        rsiOverbought: (row.rsi_overbought as number) ?? DEFAULTS[t]?.rsiOverbought,
        rsiNeutralMin: (row.rsi_neutral_min as number) ?? DEFAULTS[t]?.rsiNeutralMin,
        rsiNeutralMax: (row.rsi_neutral_max as number) ?? DEFAULTS[t]?.rsiNeutralMax,
        trendStrengthStrong: (row.trend_strength_strong as number) ?? DEFAULTS[t]?.trendStrengthStrong,
        trendStrengthModerate: (row.trend_strength_moderate as number) ?? DEFAULTS[t]?.trendStrengthModerate,
        trendStrengthWeak: (row.trend_strength_weak as number) ?? DEFAULTS[t]?.trendStrengthWeak,
        edgeBlendCalculated: (row.edge_blend_calculated as number) ?? DEFAULTS[t]?.edgeBlendCalculated,
        edgeBlendAI: (row.edge_blend_ai as number) ?? DEFAULTS[t]?.edgeBlendAI,
        edgeBoostStrong: (row.edge_boost_strong as number) ?? DEFAULTS[t]?.edgeBoostStrong,
        edgeBoostWeak: (row.edge_boost_weak as number) ?? DEFAULTS[t]?.edgeBoostWeak,
        volumeLow: (row.volume_low as number) ?? DEFAULTS[t]?.volumeLow,
        volumeHigh: (row.volume_high as number) ?? DEFAULTS[t]?.volumeHigh,
        confidenceCap: (row.confidence_cap as number) ?? DEFAULTS[t]?.confidenceCap,
        edgeCalibrationHigh: (row.edge_calibration_high as number) ?? DEFAULTS[t]?.edgeCalibrationHigh,
        edgeCalibrationLow: (row.edge_calibration_low as number) ?? DEFAULTS[t]?.edgeCalibrationLow,
      };
    });

    return NextResponse.json({ factors });
  } catch (error: any) {
    console.error('Error in GET risk factors:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load risk factors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      trader,
      minConfidence,
      minEdge,
      maxTradeSize,
      maxBetSize,
      maxPositions,
      rsiExtremeOversold,
      rsiOversold,
      rsiOverbought,
      rsiNeutralMin,
      rsiNeutralMax,
      trendStrengthStrong,
      trendStrengthModerate,
      trendStrengthWeak,
      edgeBlendCalculated,
      edgeBlendAI,
      edgeBoostStrong,
      edgeBoostWeak,
      volumeLow,
      volumeHigh,
      confidenceCap,
      edgeCalibrationHigh,
      edgeCalibrationLow,
    } = body;

    if (!trader) {
      return NextResponse.json({ error: 'trader is required' }, { status: 400 });
    }

    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from('trader_risk_factors')
      .upsert({
        trader,
        min_confidence: minConfidence,
        min_edge: minEdge,
        max_trade_size: maxTradeSize,
        max_bet_size: maxBetSize,
        max_positions: maxPositions,
        rsi_extreme_oversold: rsiExtremeOversold,
        rsi_oversold: rsiOversold,
        rsi_overbought: rsiOverbought,
        rsi_neutral_min: rsiNeutralMin,
        rsi_neutral_max: rsiNeutralMax,
        trend_strength_strong: trendStrengthStrong,
        trend_strength_moderate: trendStrengthModerate,
        trend_strength_weak: trendStrengthWeak,
        edge_blend_calculated: edgeBlendCalculated,
        edge_blend_ai: edgeBlendAI,
        edge_boost_strong: edgeBoostStrong,
        edge_boost_weak: edgeBoostWeak,
        volume_low: volumeLow,
        volume_high: volumeHigh,
        confidence_cap: confidenceCap,
        edge_calibration_high: edgeCalibrationHigh,
        edge_calibration_low: edgeCalibrationLow,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'trader' });

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          message: 'Risk factors saved (table will be created on next load)',
          warning: 'Table does not exist yet. Run the SQL migration to create it.',
        });
      }
      return NextResponse.json(
        { error: error.message || 'Failed to save risk factors' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Risk factors updated for ${trader}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update risk factors' },
      { status: 500 }
    );
  }
}
