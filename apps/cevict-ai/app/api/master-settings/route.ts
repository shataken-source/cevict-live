import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Connection to your Test/Dev Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('master_config')
      .select('*')
      .order('project_id', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Master Settings GET Error:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { project_id, feature_key, is_enabled } = await req.json();
    
    const { data, error } = await supabase
      .from('master_config')
      .upsert({ 
        project_id, 
        feature_key, 
        is_enabled, 
        updated_at: new Date().toISOString() 
      }, { 
        onConflict: 'project_id,feature_key' 
      })
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Master Settings POST Error:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}