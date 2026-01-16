import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

type ScrapeRequest = {
  postalCode?: string;
  state?: string;
  maxPets?: number;
  radiusMiles?: number;
  mode?: "live" | "simulate" | "rendered";
  saveToDatabase?: boolean;
  debug?: boolean;
};

type PawBoostListing = {
  source_post_id: string;
  source_url: string;
  pet_name: string;
  status: "lost" | "found";
  pet_type: string;
  location_city: string | null;
  location_state: string | null;
  photo_url: string | null;
  description: string | null;
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36";

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");
  return createClient(url, key);
}

function toTitle(text: string) {
  return text
    .split(/[-_]/)
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ""))
    .filter(Boolean)
    .join(" ");
}

function simulate(maxPets: number, state?: string): PawBoostListing[] {
  const pets: PawBoostListing[] = [];
  for (let i = 0; i < maxPets; i++) {
    pets.push({
      source_post_id: `sim_pawboost_${i}`,
      source_url: "https://www.pawboost.com",
      pet_name: i % 2 === 0 ? "Buddy" : "Luna",
      status: i % 3 === 0 ? "found" : "lost",
      pet_type: i % 2 === 0 ? "dog" : "cat",
      location_city: "Sample City",
      location_state: state || "AL",
      photo_url: null,
      description: "Simulated PawBoost listing for demonstration.",
    });
  }
  return pets;
}

function buildBrowseUrl(status: "lost" | "found", page: number, species?: "Dog" | "Cat") {
  // Discovered via homepage navigation:
  // https://www.pawboost.com/lost-found-pets?status=100 (lost)
  // https://www.pawboost.com/lost-found-pets?status=101 (found)
  const statusCode = status === "lost" ? 100 : 101;
  const base = `https://www.pawboost.com/lost-found-pets?status=${statusCode}`;
  const withSpecies = species ? `${base}&species=${species}` : base;
  return `${withSpecies}&page=${page}`;
}

async function fetchListingsRendered(url: string, status: "lost" | "found", timeoutMs: number) {
  // NOTE: This requires Playwright installed and a Chromium binary available.
  // Vercel serverless environments often do not support launching Chromium.
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 720 },
      locale: "en-US",
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    // Give client-side rendering a moment if needed
    await page.waitForTimeout(1500);

    // Extract rendered HTML
    const html = await page.content();
    const listings = parseListings(html, status);
    await context.close();
    return { listings, html, statusCode: 200 };
  } finally {
    await browser.close();
  }
}

async function discoverPawboostLinks(timeoutMs: number) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 720 },
      locale: "en-US",
    });
    const page = await context.newPage();
    await page.goto("https://www.pawboost.com/", { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.waitForTimeout(1200);

    const links = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll("a[href]").forEach((a) => {
        const href = (a as HTMLAnchorElement).href || "";
        if (href) out.push(href);
      });
      return out;
    });

    await context.close();
    const uniq = Array.from(new Set(links));
    const interesting = uniq
      .filter((h) => h.includes("pawboost.com"))
      .filter((h) => /(lost|found|search|pet|report|alert|missing)/i.test(h))
      .slice(0, 80);

    return { total: uniq.length, interesting };
  } finally {
    await browser.close();
  }
}

function parseListings(html: string, status: "lost" | "found"): PawBoostListing[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const listings: PawBoostListing[] = [];

  function parseLandingUrl(href: string) {
    const abs = href.startsWith("http") ? href : `https://www.pawboost.com${href}`;
    try {
      const u = new URL(abs);
      const parts = u.pathname.split("/").filter(Boolean);
      // /landing/pet/{postId}/{slug}
      const petIdx = parts.indexOf("pet");
      const postId = petIdx >= 0 && parts[petIdx + 1] ? parts[petIdx + 1] : "unknown";
      const slug = parts[parts.length - 1] || "";
      const slugParts = slug.split("-").filter(Boolean);
      const inferredStatus = slugParts[0] === "lost" ? "lost" : slugParts[0] === "found" ? "found" : undefined;
      const petName = slugParts.length > 1 ? toTitle(slugParts[1]) : undefined;
      const zip = slugParts.length >= 2 && /^\d{5}$/.test(slugParts[slugParts.length - 1]) ? slugParts[slugParts.length - 1] : undefined;
      const st = slugParts.length >= 3 && /^[A-Za-z]{2}$/.test(slugParts[slugParts.length - 2]) ? slugParts[slugParts.length - 2].toUpperCase() : undefined;
      const city =
        slugParts.length >= 4 && st
          ? toTitle(slugParts.slice(2, slugParts.length - (zip ? 2 : 1)).join("-"))
          : undefined;
      return { abs, postId, inferredStatus, petName, city, state: st };
    } catch {
      return { abs, postId: "unknown" as const };
    }
  }

  const linkCandidates = $('a[href^="/landing/pet/"], a[href*="/landing/pet/"]');
  linkCandidates.each((_, el) => {
    const href = $(el).attr("href") || "";
    if (!href.includes("/landing/pet/")) return;
    const parsed: any = parseLandingUrl(href);
    const postId: string = parsed.postId;
    if (!postId || postId === "unknown") return;
    if (seen.has(postId)) return;
    seen.add(postId);

    const source_url = parsed.abs;
    const source_post_id = `pawboost_${postId}`;

    // Extract card text + image from the closest container
    const $card = $(el).closest("article, li, div");
    const cardText = $card.text().replace(/\s+/g, " ").trim();

    // Try pet name from title-like text; fallback to slug inference
    let pet_name = parsed.petName || "Pet";
    const headerText = $card.find("h1,h2,h3,h4,strong").first().text().trim();
    if (headerText && headerText.length <= 40) pet_name = headerText;

    // Type from text
    const lower = cardText.toLowerCase();
    const pet_type = lower.includes("cat") || lower.includes("kitten") ? "cat" : "dog";

    // Location: prefer slug inference; fallback to "City, ST"
    let location_city: string | null = parsed.city || null;
    let location_state: string | null = parsed.state || null;
    const locMatch = cardText.match(/([A-Za-z][A-Za-z.\s]+),\s*([A-Z]{2})\b/);
    if (!location_state && locMatch) {
      location_city = locMatch[1].trim();
      location_state = locMatch[2].trim();
    }

    // Image: prefer within card/link
    let photo_url: string | null = null;
    const img = $(el).find("img").attr("src") || $card.find("img").first().attr("src") || "";
    if (img) photo_url = img.startsWith("//") ? `https:${img}` : img;

    listings.push({
      source_post_id,
      source_url,
      pet_name,
      status: parsed.inferredStatus || status,
      pet_type,
      location_city,
      location_state,
      photo_url,
      description: cardText ? cardText.slice(0, 500) : null,
    });
  });

  // Deduplicate again and return
  return listings;
}

async function fetchListings(url: string, status: "lost" | "found") {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`PawBoost fetch failed (${res.status})`);
  const html = await res.text();
  return { listings: parseListings(html, status), html, statusCode: res.status };
}

async function saveListings(pets: PawBoostListing[]) {
  if (!pets.length) return { inserted: 0, skipped: 0 };
  const supabase = getSupabase();
  const ids = pets.map((p) => p.source_post_id);
  const { data: existing } = await supabase.from("lost_pets").select("source_post_id").in("source_post_id", ids);
  const existingIds = new Set((existing || []).map((r: any) => r.source_post_id));
  const newPets = pets.filter((p) => !existingIds.has(p.source_post_id));
  if (newPets.length > 0) {
    const inferBreed = (desc: string | null) => {
      const d = (desc || "").toLowerCase();
      const m = d.match(
        /\b(yorkie|yorkshire terrier|labrador|lab|golden retriever|german shepherd|husky|beagle|boxer|poodle|pit bull|pitbull|terrier|dachshund|chihuahua|bulldog|corgi|rottweiler|doberman|mastiff|great dane)\b/i
      );
      if (!m) return null;
      const raw = m[1].toLowerCase();
      if (raw === "lab") return "Labrador";
      if (raw === "pitbull") return "Pit Bull";
      if (raw === "yorkie") return "Yorkshire Terrier";
      return raw
        .split(" ")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
    };
    const inferColor = (desc: string | null) => {
      const d = (desc || "").toLowerCase();
      const m = d.match(/\b(black|white|brown|tan|gray|grey|brindle|orange|golden|cream)\b/i);
      if (!m) return null;
      const raw = m[1].toLowerCase();
      const normalized = raw === "grey" ? "Gray" : raw[0].toUpperCase() + raw.slice(1);
      return normalized;
    };
    const inferSize = (desc: string | null) => {
      const d = (desc || "").toLowerCase();
      if (/\b(tiny|teacup)\b/.test(d)) return "small";
      const m = d.match(/\b(small|medium|large|giant)\b/i);
      return m ? m[1].toLowerCase() : null;
    };

    const payload = newPets.map((p) => ({
      pet_name: p.pet_name,
      pet_type: p.pet_type,
      // Some deployments have NOT NULL constraints on these fields.
      // Use best-effort extraction; fall back to safe defaults.
      breed: inferBreed(p.description) || "Mixed",
      color: inferColor(p.description) || "Unknown",
      size: inferSize(p.description) || "medium",
      age: null,
      gender: "unknown",
      status: p.status,
      location_city: p.location_city,
      location_state: p.location_state,
      description: p.description,
      photo_url: p.photo_url,
      source_platform: "pawboost",
      source_url: p.source_url,
      source_post_id: p.source_post_id,
      shelter_name: null,
    }));
    const { error } = await supabase.from("lost_pets").insert(payload);
    if (error) throw new Error(error.message);
  }
  return { inserted: newPets.length, skipped: pets.length - newPets.length };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as ScrapeRequest;
    const postalCode = body.postalCode;
    const state = body.state;
    const maxPets = Math.max(1, Math.min(body.maxPets || 30, 200));
    const radiusMiles = Math.max(5, Math.min(body.radiusMiles || 50, 200));
    const mode: "live" | "simulate" | "rendered" =
      body.mode === "simulate" ? "simulate" : body.mode === "rendered" ? "rendered" : "live";
    const saveToDatabase = body.saveToDatabase !== false; // default true
    const debug = body.debug === true;

    let listings: PawBoostListing[] = [];
    const debugInfo: any = debug ? { requests: [] as any[] } : null;

    if (mode === "simulate") {
      listings = simulate(maxPets, state);
    } else {
      if (!postalCode && !state) {
        return NextResponse.json(
          { success: false, error: "Provide postalCode or state for PawBoost search" },
          { status: 400 }
        );
      }
      const timeoutMs = 45_000;
      const useRendered = mode === "rendered";
      if (useRendered && process.env.VERCEL) {
        return NextResponse.json(
          { success: false, error: "Rendered PawBoost scraping is not supported on Vercel serverless. Run locally." },
          { status: 501 }
        );
      }

      const pagesToTry = 4;
      const results: Array<{ label: string; url: string; statusCode: number; error?: string; html: string; listings: PawBoostListing[] }> = [];

      for (const st of ["lost", "found"] as const) {
        for (const species of ["Dog", "Cat"] as const) {
          for (let page = 1; page <= pagesToTry; page++) {
            const url = buildBrowseUrl(st, page, species);
            const r = useRendered
              ? await fetchListingsRendered(url, st, timeoutMs).catch((e) => ({ listings: [], html: "", statusCode: 0, error: (e as any)?.message }))
              : await fetchListings(url, st).catch((e) => ({ listings: [], html: "", statusCode: 0, error: (e as any)?.message }));
            results.push({ label: `${st}:${species}:p${page}`, url, statusCode: r.statusCode || 0, error: (r as any).error, html: r.html || "", listings: (r.listings || []) as PawBoostListing[] });
          }
        }
      }

      const combined = results.flatMap((r) => r.listings);
      const stateFilter = state ? state.toUpperCase() : null;
      const filtered = stateFilter ? combined.filter((p) => (p.location_state || "").toUpperCase() === stateFilter) : combined;

      if (debug && debugInfo) {
        const summarize = (u: string, r: any, label: string) => {
          const html: string = r?.html || "";
          const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim();
          const hasPetLinks = /\/landing\/pet\//.test(html);
          const blocked =
            /enable javascript/i.test(html) ||
            /cloudflare/i.test(html) ||
            /cf-(challenge|turnstile|error)/i.test(html) ||
            /access denied/i.test(html);
          const sampleHrefs = Array.from(html.matchAll(/href="([^"]+)"/g))
            .slice(0, 25)
            .map((m) => m[1])
            .filter((h) => h.includes("/landing/pet/"))
            .slice(0, 10);

          return {
            label,
            url: u,
            statusCode: r?.statusCode,
            error: r?.error,
            htmlLength: html.length,
            title,
            notFoundLikely: /not found/i.test(title),
            hasPetLinks,
            blockedLikely: blocked,
            samplePetHrefs: sampleHrefs,
            htmlHead: html.slice(0, 400),
          };
        };
        debugInfo.requests.push(...results.slice(0, 8).map((r) => summarize(r.url, r, r.label)));
        debugInfo.discovered = { totalListings: combined.length, afterStateFilter: filtered.length };
      }

      listings = filtered.slice(0, maxPets);
    }

    let inserted = 0;
    let skipped = 0;
    if (saveToDatabase && listings.length) {
      const res = await saveListings(listings);
      inserted = res.inserted;
      skipped = res.skipped;
    }

    return NextResponse.json({
      success: true,
      summary: {
        petsFound: listings.length,
        petsSaved: inserted,
        duplicatesSkipped: skipped,
      },
      sample: listings.slice(0, 5),
      ...(debug ? { debug: debugInfo } : {}),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "PawBoost scrape failed" }, { status: 500 });
  }
}
