import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  try {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    return null;
  }
}

// GET - Get accuracy statistics and win percentages
export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  if (!client) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // Filter by prediction type
    const category = searchParams.get('category'); // Filter by category
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query
    let query = client.from('progno_predictions').select('*');

    if (type) {
      query = query.eq('prediction_type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: predictions, error } = await query;

    if (error) {
      console.error('[PROGNO DB] Stats query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          total: 0,
          completed: 0,
          correct: 0,
          incorrect: 0,
          pending: 0,
          win_percentage: 0,
          average_confidence: 0,
          average_accuracy: 0,
          total_profit: 0,
          roi: 0,
        },
        by_type: {},
        by_category: {},
      });
    }

    // Calculate overall stats
    const total = predictions.length;
    const completed = predictions.filter(p => p.status !== 'pending' && p.status !== 'cancelled').length;
    const correct = predictions.filter(p => p.is_correct === true).length;
    const incorrect = predictions.filter(p => p.is_correct === false).length;
    const pending = predictions.filter(p => p.status === 'pending').length;

    const winPercentage = completed > 0 ? (correct / completed) * 100 : 0;

    const avgConfidence = predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / total;

    const completedWithAccuracy = predictions.filter(p => p.accuracy_score !== null);
    const avgAccuracy = completedWithAccuracy.length > 0
      ? completedWithAccuracy.reduce((sum, p) => sum + (p.accuracy_score || 0), 0) / completedWithAccuracy.length
      : 0;

    const completedWithProfit = predictions.filter(p => p.profit !== null);
    const totalProfit = completedWithProfit.reduce((sum, p) => sum + (p.profit || 0), 0);
    const totalStaked = completedWithProfit.reduce((sum, p) => sum + (p.stake || 0), 0);
    const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

    // Stats by type
    const byType: Record<string, any> = {};
    const types = [...new Set(predictions.map(p => p.prediction_type).filter((t): t is string => t != null))];
    for (const predType of types) {
      const typePreds = predictions.filter(p => p.prediction_type === predType);
      const typeCompleted = typePreds.filter(p => p.status !== 'pending' && p.status !== 'cancelled');
      const typeCorrect = typePreds.filter(p => p.is_correct === true);

      byType[predType as string] = {
        total: typePreds.length,
        completed: typeCompleted.length,
        correct: typeCorrect.length,
        win_percentage: typeCompleted.length > 0 ? (typeCorrect.length / typeCompleted.length) * 100 : 0,
        average_confidence: typePreds.length > 0 ? typePreds.reduce((sum, p) => sum + (p.confidence || 0), 0) / typePreds.length : 0,
      };
    }

    // Stats by category
    const byCategory: Record<string, any> = {};
    const categories = [...new Set(predictions.map(p => p.category).filter((c): c is string => c != null && c !== ''))];
    for (const cat of categories) {
      const catPreds = predictions.filter(p => p.category === cat);
      const catCompleted = catPreds.filter(p => p.status !== 'pending' && p.status !== 'cancelled');
      const catCorrect = catPreds.filter(p => p.is_correct === true);

      byCategory[cat as string] = {
        total: catPreds.length,
        completed: catCompleted.length,
        correct: catCorrect.length,
        win_percentage: catCompleted.length > 0 ? (catCorrect.length / catCompleted.length) * 100 : 0,
        average_confidence: catPreds.length > 0 ? catPreds.reduce((sum, p) => sum + (p.confidence || 0), 0) / catPreds.length : 0,
      };
    }

    return NextResponse.json({
      success: true,
      stats: {
        total,
        completed,
        correct,
        incorrect,
        pending,
        win_percentage: Math.round(winPercentage * 100) / 100,
        average_confidence: Math.round(avgConfidence * 100) / 100,
        average_accuracy: Math.round(avgAccuracy * 100) / 100,
        total_profit: Math.round(totalProfit * 100) / 100,
        roi: Math.round(roi * 100) / 100,
      },
      by_type: byType,
      by_category: byCategory,
    });
  } catch (error: any) {
    console.error('[PROGNO DB] Stats error:', error);
    return NextResponse.json({ error: error.message || 'Failed to calculate stats' }, { status: 500 });
  }
}

