import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Quote = {
  symbol: string;
  price: number;
  change_pct: number;
};

async function fetchYahooQuotes(): Promise<Quote[]> {
  const url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=MO,PM,MSOS';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Quote fetch failed: ${res.status}`);
  const json = await res.json();
  const quotes = json?.quoteResponse?.result || [];
  return quotes.map((q: any) => ({
    symbol: q.symbol,
    price: Number(q.regularMarketPrice) || 0,
    change_pct: Number(q.regularMarketChangePercent) || 0,
  }));
}

export async function GET() {
  try {
    const quotes = await fetchYahooQuotes();
    return NextResponse.json({ quotes }, { status: 200 });
  } catch (err: any) {
    // Fallback to static if the upstream fails
    const fallback: Quote[] = [
      { symbol: 'MO', price: 44.12, change_pct: -0.3 },
      { symbol: 'PM', price: 94.88, change_pct: 0.6 },
      { symbol: 'MSOS', price: 10.42, change_pct: 1.8 },
    ];
    return NextResponse.json(
      { quotes: fallback, warning: err?.message || 'fallback' },
      { status: 200 }
    );
  }
}

