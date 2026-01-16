import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { comparePetImages } from "@/lib/ai-matcher";

type PetRow = {
  id: any;
  pet_name: string | null;
  pet_type: string | null;
  breed: string | null;
  color: string | null;
  size: string | null;
  age: string | null;
  gender: string | null;
  status: string | null;
  location_city: string | null;
  location_state: string | null;
  description: string | null;
  photo_url: string | null;
  source_platform?: string | null;
  source_url?: string | null;
  source_post_id?: string | null;
  shelter_name?: string | null;
};

type PreRegisteredRow = {
  id: any;
  pet_name: string | null;
  pet_type: string | null;
  breed: string | null;
  color: string | null;
  size: string | null;
  age: string | null;
  gender: string | null;
  description: string | null;
  photo_url: string | null;
  location_city: string | null;
  location_state: string | null;
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
};

type MatchRequest = {
  petId?: string | number;
  petData?: Partial<PetRow>;
  photoUrl?: string;
  maxResults?: number;
  minScore?: number;
  saveMatches?: boolean;
};

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

function norm(s: string | null | undefined) {
  return (s || "").toLowerCase().trim();
}

function tokenSet(text: string | null) {
  return new Set(
    norm(text)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function attributeScore(a: Partial<PetRow>, b: Partial<PetRow>) {
  // returns 0..1
  const reasons: string[] = [];
  let score = 0;
  let denom = 0;

  const typeA = norm(a.pet_type);
  const typeB = norm(b.pet_type);
  if (typeA && typeB) {
    denom += 0.3;
    if (typeA === typeB) {
      score += 0.3;
      reasons.push(`Same type: ${typeA}`);
    } else {
      reasons.push("Different type");
      return { score: 0, reasons }; // type mismatch -> hard fail
    }
  }

  denom += 0.25;
  const breedA = norm(a.breed);
  const breedB = norm(b.breed);
  if (breedA && breedB && (breedA === breedB || breedA.includes(breedB) || breedB.includes(breedA))) {
    score += 0.25;
    reasons.push("Breed match");
  }

  denom += 0.2;
  const colorA = norm(a.color);
  const colorB = norm(b.color);
  if (colorA && colorB && (colorA === colorB || colorA.includes(colorB) || colorB.includes(colorA))) {
    score += 0.2;
    reasons.push("Color match");
  }

  denom += 0.1;
  const sizeA = norm(a.size);
  const sizeB = norm(b.size);
  if (sizeA && sizeB && sizeA === sizeB) {
    score += 0.1;
    reasons.push("Size match");
  }

  denom += 0.1;
  const genderA = norm(a.gender);
  const genderB = norm(b.gender);
  if (genderA && genderB && genderA === genderB) {
    score += 0.1;
    reasons.push("Gender match");
  }

  denom += 0.05;
  const stA = norm(a.location_state);
  const stB = norm(b.location_state);
  const cityA = norm(a.location_city);
  const cityB = norm(b.location_city);
  if (stA && stB && stA === stB) score += 0.03;
  if (cityA && cityB && cityA === cityB) score += 0.02;
  if ((stA && stB && stA === stB) || (cityA && cityB && cityA === cityB)) reasons.push("Location overlap");

  return { score: denom > 0 ? Math.max(0, Math.min(1, score / denom)) : 0, reasons };
}

function textScore(a: Partial<PetRow>, b: Partial<PetRow>) {
  const A = tokenSet(a.description || "");
  const B = tokenSet(b.description || "");
  if (!A.size || !B.size) return { score: 0, reasons: [] as string[] };
  let overlap = 0;
  A.forEach((t) => {
    if (B.has(t)) overlap += 1;
  });
  const jaccard = overlap / (A.size + B.size - overlap);
  return { score: Math.max(0, Math.min(1, jaccard)), reasons: overlap ? ["Description similarity"] : [] };
}

async function imageScore(aUrl: string | null, bUrl: string | null) {
  if (!aUrl || !bUrl) return { score: 0, reasoning: "Missing images" };
  const res = await comparePetImages(aUrl, bUrl);
  return { score: Math.max(0, Math.min(1, (res.confidence || 0) / 100)), reasoning: res.reasoning || "" };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as MatchRequest;
    const maxResults = Math.max(1, Math.min(body.maxResults || 10, 50));
    const minScore = Math.max(0, Math.min(body.minScore ?? 0.3, 1));
    const saveMatches = body.saveMatches === true;

    const supabase = getSupabase();

    let sourcePet: Partial<PetRow> | null = null;
    if (body.petId !== undefined && body.petId !== null) {
      const { data, error } = await supabase
        .from("lost_pets")
        .select("id,pet_name,pet_type,breed,color,size,age,gender,status,location_city,location_state,description,photo_url")
        .eq("id", body.petId as any)
        .maybeSingle();
      if (error) throw new Error(error.message);
      sourcePet = (data as any) || null;
    } else if (body.petData) {
      sourcePet = body.petData;
    }
    if (!sourcePet) {
      return NextResponse.json({ success: false, error: "Provide petId or petData" }, { status: 400 });
    }

    const sourceStatus = norm(sourcePet.status) || "lost";
    const targetStatus = sourceStatus === "lost" ? "found" : "lost";
    const type = norm(sourcePet.pet_type);
    const state = norm(sourcePet.location_state);

    // Pull candidate pool (cap for cost)
    let query = supabase
      .from("lost_pets")
      .select("id,pet_name,pet_type,breed,color,size,age,gender,status,location_city,location_state,description,photo_url,source_platform,source_url,source_post_id,shelter_name")
      .eq("status", targetStatus)
      .limit(250);
    if (type) query = query.eq("pet_type", type);
    if (state) query = query.eq("location_state", state.toUpperCase());

    const { data: candidates, error: cErr } = await query;
    if (cErr) throw new Error(cErr.message);

    const srcPhoto = body.photoUrl || (sourcePet.photo_url as string | null) || null;

    const matches: any[] = [];
    for (const cand of (candidates || []) as PetRow[]) {
      const attr = attributeScore(sourcePet, cand);
      if (attr.score === 0) continue;
      const text = textScore(sourcePet, cand);
      const img = await imageScore(srcPhoto, cand.photo_url || null);

      // Weighting with renormalization if image missing
      const wAttr = 0.4;
      const wText = 0.25;
      const wImg = srcPhoto && cand.photo_url ? 0.35 : 0;
      const wSum = wAttr + wText + wImg;
      const score = wSum > 0 ? (attr.score * wAttr + text.score * wText + img.score * wImg) / wSum : 0;
      if (score < minScore) continue;

      const reasons = [...attr.reasons, ...text.reasons];
      if (wImg > 0) reasons.push(`Image similarity: ${(img.score * 100).toFixed(0)}%`);

      matches.push({
        id: cand.id,
        pet_name: cand.pet_name,
        pet_type: cand.pet_type,
        breed: cand.breed,
        color: cand.color,
        size: cand.size,
        status: cand.status,
        location_city: cand.location_city,
        location_state: cand.location_state,
        photo_url: cand.photo_url,
        source_platform: cand.source_platform,
        source_url: cand.source_url,
        source_post_id: cand.source_post_id,
        shelter_name: cand.shelter_name,
        score,
        scoreBreakdown: { attributes: attr.score, text: text.score, image: img.score },
        reasons,
      });
    }

    // If the source is FOUND, also match against pre-registered pets (best-effort; table may not exist yet)
    if (sourceStatus === "found") {
      try {
        let preQuery = supabase
          .from("pre_registered_pets")
          .select("id,pet_name,pet_type,breed,color,size,age,gender,description,photo_url,location_city,location_state,subscription_status,subscription_expires_at")
          .limit(200);
        if (type) preQuery = preQuery.eq("pet_type", type);
        if (state) preQuery = preQuery.eq("location_state", state.toUpperCase());

        const { data: preCandidates, error: pErr } = await preQuery;
        if (pErr) throw new Error(pErr.message);

        for (const cand of (preCandidates || []) as PreRegisteredRow[]) {
          const attr = attributeScore(sourcePet, cand as any);
          if (attr.score === 0) continue;
          const text = textScore(sourcePet, cand as any);
          const img = await imageScore(srcPhoto, cand.photo_url || null);

          const wAttr = 0.45;
          const wText = 0.25;
          const wImg = srcPhoto && cand.photo_url ? 0.3 : 0;
          const wSum = wAttr + wText + wImg;
          const score = wSum > 0 ? (attr.score * wAttr + text.score * wText + img.score * wImg) / wSum : 0;
          if (score < minScore) continue;

          const reasons = [...attr.reasons, ...text.reasons];
          if (wImg > 0) reasons.push(`Image similarity: ${(img.score * 100).toFixed(0)}%`);

          matches.push({
            kind: "pre_registered",
            id: cand.id,
            pet_name: cand.pet_name,
            pet_type: cand.pet_type,
            breed: cand.breed,
            color: cand.color,
            size: cand.size,
            status: "pre_registered",
            location_city: cand.location_city,
            location_state: cand.location_state,
            photo_url: cand.photo_url,
            subscription_status: cand.subscription_status,
            subscription_expires_at: cand.subscription_expires_at,
            score,
            scoreBreakdown: { attributes: attr.score, text: text.score, image: img.score },
            reasons,
          });
        }
      } catch {
        // ignore (migration not applied yet)
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const top = matches.slice(0, maxResults);

    if (saveMatches && top.length && sourcePet.id !== undefined && sourcePet.id !== null) {
      const lostFound = top.filter((m) => m.kind !== "pre_registered");
      const preReg = top.filter((m) => m.kind === "pre_registered");

      if (lostFound.length) {
        const rows = lostFound.map((m) => ({
          source_pet_id: String(sourcePet!.id),
          matched_pet_id: String(m.id),
          match_score: m.score,
          score_breakdown: m.scoreBreakdown,
          match_reasons: m.reasons,
          status: "pending",
        }));
        await supabase.from("lost_pet_matches").upsert(rows, { onConflict: "source_pet_id,matched_pet_id" });
      }

      // When source is FOUND, pre-registered matches are: pre_registered_pet_id ↔ found_pet_id
      if (sourceStatus === "found" && preReg.length) {
        try {
          const rows = preReg.map((m) => ({
            pre_registered_pet_id: String(m.id),
            found_pet_id: String(sourcePet!.id),
            match_score: m.score,
            score_breakdown: m.scoreBreakdown,
            match_reasons: m.reasons,
            status: "pending",
          }));
          await supabase.from("pre_registered_pet_matches").upsert(rows, { onConflict: "pre_registered_pet_id,found_pet_id" });
        } catch {
          // ignore (table may not exist)
        }
      }
    }

    return NextResponse.json({
      success: true,
      matchCount: top.length,
      matches: top,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Match failed" }, { status: 500 });
  }
}

