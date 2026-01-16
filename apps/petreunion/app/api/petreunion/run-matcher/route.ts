import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Pet = {
  id: any;
  pet_name: string | null;
  pet_type: string | null;
  status: string | null;
  location_city: string | null;
  location_state: string | null;
  description: string | null;
  photo_url: string | null;
};

type PreRegisteredPet = {
  id: any;
  pet_name: string | null;
  pet_type: string | null;
  location_city: string | null;
  location_state: string | null;
  description: string | null;
  photo_url: string | null;
  breed: string | null;
  color: string | null;
};

type MatchCandidate = {
  lostId: any;
  foundId: any;
  score: number;
  reasons: string[];
};

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

function tokenize(text: string | null) {
  if (!text) return new Set<string>();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function similarityScore(a: Pet, b: Pet): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (a.location_state && b.location_state && a.location_state === b.location_state) {
    score += 25;
    reasons.push("State match");
  }
  if (a.location_city && b.location_city && a.location_city.toLowerCase() === b.location_city.toLowerCase()) {
    score += 20;
    reasons.push("City match");
  }
  if (a.pet_type && b.pet_type && a.pet_type.toLowerCase() === b.pet_type.toLowerCase()) {
    score += 20;
    reasons.push("Type match");
  }

  const nameA = (a.pet_name || "").toLowerCase();
  const nameB = (b.pet_name || "").toLowerCase();
  if (nameA && nameB && (nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA))) {
    score += 20;
    reasons.push("Name similar");
  }

  const tokensA = tokenize(a.description);
  const tokensB = tokenize(b.description);
  let overlap = 0;
  tokensA.forEach((t) => {
    if (tokensB.has(t)) overlap += 1;
  });
  if (overlap > 0) {
    score += Math.min(15, overlap * 3);
    reasons.push("Description overlap");
  }

  return { score: Math.min(100, score), reasons };
}

async function fetchPets(status: "lost" | "found", supabase: any, limit = 200) {
  const { data, error } = await supabase
    .from("lost_pets")
    .select("id, pet_name, pet_type, status, location_city, location_state, description, photo_url")
    .eq("status", status)
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []) as Pet[];
}

async function logRun(
  supabase: any,
  summary: { candidates: number; topMatches: number },
  errors: string[]
) {
  try {
    // NOTE: `scraper_runs` may not exist in the generated Supabase types (or schema cache),
    // which can cause TS to infer `never` here during Next.js build. This is best-effort logging
    // only, so we intentionally bypass typings.
    await (supabase as any).from("scraper_runs").insert({
      platform: "matcher",
      state: null,
      mode: "daily",
      pets_found: summary.candidates,
      pets_saved: summary.topMatches,
      errors,
    });
  } catch (err) {
    console.warn("[matcher] logRun skipped:", (err as any)?.message || err);
  }
}

async function persistTopMatches(supabase: any, matches: MatchCandidate[]) {
  try {
    if (!matches.length) return;
    const rows = matches.map((m) => ({
      source_pet_id: String(m.lostId),
      matched_pet_id: String(m.foundId),
      match_score: Math.max(0, Math.min(1, m.score / 100)),
      score_breakdown: { attributes: Math.max(0, Math.min(1, m.score / 100)) },
      match_reasons: m.reasons,
      status: "pending",
    }));
    // `lost_pet_matches` may not exist in generated Supabase types; persist best-effort.
    await (supabase as any).from("lost_pet_matches").upsert(rows, { onConflict: "source_pet_id,matched_pet_id" });
  } catch (err: any) {
    console.warn("[matcher] persistTopMatches skipped:", err?.message || err);
  }
}

async function persistTopPreRegisteredMatches(
  supabase: any,
  matches: { preId: any; foundId: any; score: number; reasons: string[] }[]
) {
  try {
    if (!matches.length) return;
    const rows = matches.map((m) => ({
      pre_registered_pet_id: String(m.preId),
      found_pet_id: String(m.foundId),
      match_score: Math.max(0, Math.min(1, m.score / 100)),
      score_breakdown: { heuristic: Math.max(0, Math.min(1, m.score / 100)) },
      match_reasons: m.reasons,
      status: "pending",
    }));
    // `pre_registered_pet_matches` may not exist in generated Supabase types; persist best-effort.
    await (supabase as any)
      .from("pre_registered_pet_matches")
      .upsert(rows, { onConflict: "pre_registered_pet_id,found_pet_id" });
  } catch (err: any) {
    console.warn("[matcher] persistTopPreRegisteredMatches skipped:", err?.message || err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const lost = await fetchPets("lost", supabase, 200);
    const found = await fetchPets("found", supabase, 200);

    const candidates: MatchCandidate[] = [];
    for (const f of found) {
      for (const l of lost) {
        const { score, reasons } = similarityScore(l, f);
        if (score >= 40) {
          candidates.push({ lostId: l.id, foundId: f.id, score, reasons });
        }
      }
    }

    const top = candidates.sort((a, b) => b.score - a.score).slice(0, 50);
    await persistTopMatches(supabase, top);

    // Pre-registered (proactive) matching: pre_registered_pets ↔ found
    let preRegSummary: any = null;
    try {
      const { data: pre, error: pErr } = await supabase
        .from("pre_registered_pets")
        .select("id,pet_name,pet_type,breed,color,location_city,location_state,description,photo_url")
        .order("created_at", { ascending: false })
        .limit(200);
      if (pErr) throw new Error(pErr.message);

      const prCandidates: { preId: any; foundId: any; score: number; reasons: string[] }[] = [];
      for (const f of found) {
        for (const p of (pre || []) as PreRegisteredPet[]) {
          // Use same similarity scoring, treating pre-registered as "lost-like"
          const { score, reasons } = similarityScore(p as any, f as any);
          if (score >= 40) {
            prCandidates.push({ preId: p.id, foundId: f.id, score, reasons });
          }
        }
      }
      const prTop = prCandidates.sort((a, b) => b.score - a.score).slice(0, 50);
      await persistTopPreRegisteredMatches(supabase, prTop);
      preRegSummary = { preRegisteredConsidered: (pre || []).length, candidates: prCandidates.length, topReturned: prTop.length };
    } catch (err: any) {
      preRegSummary = { error: err?.message || "pre-registered matcher failed" };
    }

    await logRun(supabase, { candidates: candidates.length, topMatches: top.length }, []);

    return NextResponse.json({
      success: true,
      summary: {
        lostConsidered: lost.length,
        foundConsidered: found.length,
        candidates: candidates.length,
        topReturned: top.length,
      },
      preRegistered: preRegSummary,
      matches: top,
    });
  } catch (error: any) {
    console.error("[matcher] failed:", error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || "Matcher failed" }, { status: 500 });
  }
}
