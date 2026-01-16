import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const petId = body.petId;
    const sendNotifications = body.sendNotifications === true;
    const maxResults = Math.max(1, Math.min(body.maxResults || 10, 50));
    const minScore = Math.max(0, Math.min(body.minScore ?? 0.3, 1));

    if (!petId) {
      return NextResponse.json({ success: false, error: "Missing petId" }, { status: 400 });
    }

    // Ensure pet exists
    const supabase = getSupabase();
    const { data: pet, error } = await supabase
      .from("lost_pets")
      .select("id,pet_name,status,photo_url")
      .eq("id", petId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pet) return NextResponse.json({ success: false, error: "Pet not found" }, { status: 404 });

    // Run matcher and persist matches
    const origin = req.nextUrl.origin;
    const result = await postJson(`${origin}/api/petreunion/match-pets`, {
      petId,
      maxResults,
      minScore,
      saveMatches: true,
    });

    // Notifications are stubbed (table exists; real email/SMS later)
    if (sendNotifications && Array.isArray(result?.matches) && result.matches.length) {
      const { data: rows } = await supabase
        .from("lost_pet_matches")
        .select("id")
        .eq("source_pet_id", String(petId))
        .order("match_score", { ascending: false })
        .limit(Math.min(5, result.matches.length));

      const notifs = (rows || []).map((r: any) => ({
        match_id: r.id,
        channel: "email",
        status: "queued",
        payload: { note: "Notification stub - wire email/SMS provider later" },
      }));
      if (notifs.length) {
        await supabase.from("match_notifications").insert(notifs);
      }
    }

    return NextResponse.json({
      success: true,
      petId,
      matchCount: result?.matchCount || 0,
      matches: result?.matches || [],
      notificationsQueued: sendNotifications ? true : false,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Auto-match failed" }, { status: 500 });
  }
}

