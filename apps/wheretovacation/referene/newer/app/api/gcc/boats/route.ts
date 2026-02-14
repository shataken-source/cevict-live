import { NextResponse } from 'next/server';

/**
 * Get boats from GCC
 * Enables WTV to display available charters
 */
export async function GET(request: Request) {
  try {
    const gccUrl = process.env.NEXT_PUBLIC_GCC_URL || 'http://localhost:3006';
    const { searchParams } = new URL(request.url);
    const available = searchParams.get('available') === 'true';

    const url = `${gccUrl}/api/boats${available ? '?available=true' : ''}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const boats = await response.json();
      return NextResponse.json(boats);
    }

    // Fallback
    return NextResponse.json([]);
  } catch (error: any) {
    console.error('Error fetching boats from GCC:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boats from GCC', details: error.message },
      { status: 500 }
    );
  }
}

