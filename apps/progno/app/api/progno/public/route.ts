/**
 * Progno Public API
 * External API for selling prediction data and analysis to other services
 */

import { NextRequest, NextResponse } from 'next/server';

// TODO: Public API is not yet implemented. API key management needs a database backend.
// This endpoint currently returns 501 for all requests.

/**
 * GET /api/progno/public
 * Stub — returns 501 until API key management is implemented via database.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Public API not yet implemented. Contact admin for access.' },
    { status: 501 }
  );
}

// NOTE: Stub functions (getPredictionById, getHistorical, registerWebhook, registerApiKey,
// revokeApiKey) removed — they all depended on an in-memory API_KEYS map that was never
// populated. Re-implement with database-backed API keys when the public API is needed.
