/**
 * Emergent Pattern Detection (EPD) API Endpoints
 * POST /api/emergent/detect - Detect emergent patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { EmergentPatternDetector } from '../../lib/emergent/pattern-detector';

/**
 * POST /api/emergent/detect
 * Detect emergent patterns in game context
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context, patterns } = body;

    if (!context) {
      return NextResponse.json(
        { success: false, error: 'context required' },
        { status: 400 }
      );
    }

    // Initialize detector
    const detector = new EmergentPatternDetector();

    // Load patterns (from request or use defaults)
    if (patterns && Array.isArray(patterns)) {
      detector.loadPatterns(patterns);
    } else {
      detector.loadPatterns(detector.getDefaultPatterns());
    }

    // Detect patterns
    const result = detector.detect(context);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Emergent API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Detection failed' },
      { status: 500 }
    );
  }
}

