/**
 * ELITE KALSHI SUBMIT PICKS
 * Deep search enabled for low-profile markets
 * Supports MONEYLINE, SPREAD, TOTAL
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KALSHI_BASE =
  process.env.KALSHI_API_URL ||
  "https://api.elections.kalshi.com/trade-api/v2";

const KEY = process.env.KALSHI_API_KEY_ID || "";
const PRIVATE = process.env.KALSHI_PRIVATE_KEY || "";

const STAKE_CENTS = 500;
const MAX_PRICE = 85;
const MIN_PRICE = 5;
const MAX_CONTRACTS = 100;
const MAX_PAGES = 50;

// ─────────────────────────────────────
// AUTH
// ─────────────────────────────────────
function auth(method: string, path: string) {
  const ts = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  const msg = ts + KEY + method.toUpperCase() + path;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(msg);

  const sig = signer.sign(
    {
      key: PRIVATE,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32,
    },
    "base64"
  );

  return {
    "Content-Type": "application/json",
    "KALSHI-ACCESS-KEY": KEY,
    "KALSHI-ACCESS-TIMESTAMP": ts,
    "KALSHI-ACCESS-NONCE": nonce,
    "KALSHI-ACCESS-SIGNATURE": sig,
  };
}

// ─────────────────────────────────────
// NORMALIZE
// ─────────────────────────────────────
function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[.,'()-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────
// DEEP MARKET FETCH
// ─────────────────────────────────────
async function fetchAllMarkets() {
  let all: any[] = [];
  let cursor: string | undefined;

  console.log(`[KALSHI] Starting deep market fetch (MAX_PAGES=${MAX_PAGES})`);

  for (let i = 0; i < MAX_PAGES; i++) {
    let path = `/markets?status=open&limit=1000`;
    if (cursor) path += `&cursor=${cursor}`;

    const res = await fetch(`${KALSHI_BASE}${path}`, {
      headers: auth("GET", path),
    });

    if (!res.ok) {
      console.log(`[KALSHI] Page ${i} fetch failed: ${res.status}`);
      break;
    }

    const data = await res.json();
    const markets = data.markets || [];

    all.push(...markets);
    console.log(`[KALSHI] Page ${i}: fetched ${markets.length} markets, total=${all.length}, cursor=${data.cursor ? 'present' : 'null'}`);

    cursor = data.cursor;

    if (!cursor || markets.length === 0) {
      console.log(`[KALSHI] Stopping: cursor=${cursor}, markets.length=${markets.length}`);
      break;
    }
  }

  console.log(`[KALSHI] Final: ${all.length} total markets fetched`);
  return all;
}

// ─────────────────────────────────────
// MARKET MATCHER
// ─────────────────────────────────────
function matchMarket(pick: any, market: any) {
  const title = normalize(market.title || "");

  const home = normalize(pick.home_team || "");
  const away = normalize(pick.away_team || "");
  const pickTeam = normalize(pick.pick || "");

  const type = (pick.pick_type || "MONEYLINE").toUpperCase();

  if (!title.includes(home.split(" ")[0]) &&
    !title.includes(away.split(" ")[0])) {
    return false;
  }

  if (type === "MONEYLINE") {
    return !title.includes("over") &&
      !title.includes("under") &&
      !title.includes("spread");
  }

  if (type === "SPREAD") {
    return title.includes("wins by") ||
      title.includes("spread");
  }

  if (type === "TOTAL") {
    return title.includes("over") ||
      title.includes("under");
  }

  return false;
}

// ─────────────────────────────────────
// SIDE DETECTION
// ─────────────────────────────────────
function determineSide(pick: any, market: any): "yes" | "no" {
  const title = normalize(market.title);
  const pickTeam = normalize(pick.pick || "");
  const type = (pick.pick_type || "MONEYLINE").toUpperCase();

  if (type === "TOTAL") {
    if (pick.pick.toLowerCase().includes("over")) {
      return title.includes("over") ? "yes" : "no";
    }
    if (pick.pick.toLowerCase().includes("under")) {
      return title.includes("under") ? "yes" : "no";
    }
  }

  if (type === "SPREAD") {
    return title.includes(pickTeam) ? "yes" : "no";
  }

  return title.includes(pickTeam) ? "yes" : "no";
}

// ─────────────────────────────────────
// ORDER
// ─────────────────────────────────────
async function placeOrder(ticker: string, side: "yes" | "no", count: number) {
  const path = `/portfolio/orders`;

  const body = {
    ticker,
    action: "buy",
    side,
    type: "market",
    count,
    client_order_id: crypto.randomUUID(),
  };

  const res = await fetch(`${KALSHI_BASE}${path}`, {
    method: "POST",
    headers: auth("POST", path),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return await res.json();
}

// ─────────────────────────────────────
// LOAD PICKS
// ─────────────────────────────────────
function loadPredictions(date: string, early: boolean) {
  const file = early
    ? `predictions-early-${date}.json`
    : `predictions-${date}.json`;

  const path = join(process.cwd(), file);

  if (!existsSync(path)) return [];

  return JSON.parse(readFileSync(path, "utf8")).picks || [];
}

// ─────────────────────────────────────
// HANDLER
// ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const today = new Date().toISOString().split("T")[0];
  const date = body.date || today;
  const dryRun = body.dryRun ?? true;
  const earlyLines = body.earlyLines ?? false;

  const picks = loadPredictions(date, earlyLines);
  if (!picks.length) {
    return NextResponse.json(
      { success: false, error: "No picks found" },
      { status: 404 }
    );
  }

  const markets = await fetchAllMarkets();
  const results: any[] = [];

  for (const pick of picks) {
    const result: any = {
      game: `${pick.away_team} @ ${pick.home_team}`,
      pick: pick.pick,
    };

    try {
      const market = markets.find(m => matchMarket(pick, m));

      if (!market) {
        result.status = "no_market";
        results.push(result);
        continue;
      }

      const side = determineSide(pick, market);

      const price =
        side === "yes"
          ? market.yes_ask
          : market.no_ask;

      if (!price ||
        price < MIN_PRICE ||
        price > MAX_PRICE) {
        result.status = "price_filtered";
        results.push(result);
        continue;
      }

      const count = Math.min(
        MAX_CONTRACTS,
        Math.floor(STAKE_CENTS / price)
      );

      result.ticker = market.ticker;
      result.side = side;
      result.price = price;
      result.contracts = count;

      if (!dryRun) {
        const order = await placeOrder(
          market.ticker,
          side,
          count
        );
        result.order = order;
      } else {
        result.status = "dry_run";
      }
    } catch (err: any) {
      result.status = "error";
      result.error = err.message;
    }

    results.push(result);
  }

  return NextResponse.json({
    success: true,
    deepSearchPages: MAX_PAGES,
    totalMarketsScanned: markets.length,
    results,
  });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "POST /api/kalshi/submit-picks",
  });
}
