import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

// GET - Fetch all monitored websites
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('monitored_websites')
      .select('*')
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

// POST - Add new website to monitor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, check_interval, enabled } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('monitored_websites')
      .insert({
        name,
        url,
        check_interval: check_interval || 60,
        enabled: enabled !== undefined ? enabled : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating website:', error);
      return NextResponse.json({ error: 'Failed to create website' }, { status: 500 });
    }

    return NextResponse.json({ website: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update website
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, url, check_interval, enabled } = body;

    if (!id) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    const supabase = createSupabaseClient();
    const updateData: any = {};
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
      .select()
      .single();

    if (error) {
      console.error('Error updating website:', error);
      return NextResponse.json({ error: 'Failed to update website' }, { status: 500 });
    }

    return NextResponse.json({ website: data });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove website
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from('monitored_websites')
      .delete()
      .eq('id', id);

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

