import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { getSubscription, getPlanLimit, type Plan } from '@/lib/subscription-store';

// GET - Fetch monitored websites for the current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required', websites: [] }, { status: 401 });
    }

    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from('monitored_websites')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching websites:', error);
      return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 });
    }

    return NextResponse.json({ websites: data || [] });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - Add new website to monitor (enforces plan limit)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json();
    const { name, url, check_interval, enabled } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceClient();
    const sub = await getSubscription(userId);
    const plan = (sub?.plan ?? 'free') as Plan;
    const limit = getPlanLimit(plan);

    const { count, error: countError } = await supabase
      .from('monitored_websites')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId);

    if (countError) {
      console.error('Error counting websites:', countError);
      return NextResponse.json({ error: 'Failed to check limit' }, { status: 500 });
    }
    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        { error: `Plan limit reached (${limit} sites). Upgrade to add more.`, limit, plan },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('monitored_websites')
      .insert({
        owner_id: userId,
        name,
        url,
        check_interval: check_interval || 60,
        enabled: enabled !== undefined ? enabled : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating website:', error);
      return NextResponse.json(
        { error: 'Failed to create website', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ website: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update website (owner only)
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, url, check_interval, enabled } = body;

    if (!id) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (url) {
      try {
        new URL(url);
        updateData.url = url;
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
    }
    if (check_interval !== undefined) updateData.check_interval = check_interval;
    if (enabled !== undefined) updateData.enabled = enabled;

    const { data, error } = await supabase
      .from('monitored_websites')
      .update(updateData)
      .eq('id', id)
      .eq('owner_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating website:', error);
      return NextResponse.json({ error: 'Failed to update website' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ website: data });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove website (owner only)
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from('monitored_websites')
      .delete()
      .eq('id', id)
      .eq('owner_id', userId);

    if (error) {
      console.error('Error deleting website:', error);
      return NextResponse.json({ error: 'Failed to delete website' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

