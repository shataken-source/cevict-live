import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Pet ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Fetch pet by ID
    const { data: pet, error } = await supabase
      .from('lost_pets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Pet not found' },
        { status: 404 }
      );
    }

    if (!pet) {
      return NextResponse.json(
        { success: false, error: 'Pet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      pet,
    });
  } catch (error: any) {
    console.error('Error fetching pet:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
