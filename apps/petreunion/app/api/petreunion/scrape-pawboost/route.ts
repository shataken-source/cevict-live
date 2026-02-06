import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// FULLY DISABLED:
// This endpoint must NEVER insert or generate data until a real,
// verified PawBoost integration exists.

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error:
        'PawBoost scraper is disabled. Fake or simulated data is not allowed in this lost pet finding app. Only real, user-submitted reports are accepted.',
      summary: {
        petsFound: 0,
        petsSaved: 0,
        duplicatesSkipped: 0,
        errors: 0,
      },
    },
    { status: 403 }
  );
}

