// Find the Fresno State / Pepperdine game event on Kalshi
const crypto = require('crypto');

const KALSHI_BASE = 'https://api.elections.kalshi.com';
const API_KEY = process.env.KALSHI_API_KEY_ID || '';
const RAW_KEY = process.env.KALSHI_PRIVATE_KEY || '';

function normalizePem(raw) {
  const normalized = raw.replace(/\\n/g, '\n').replace(/"/g, '').trim();
  const beginMatch = normalized.match(/-----BEGIN ([^-]+)-----/);
  const endMatch = normalized.match(/-----END ([^-]+)-----/);
  if (!beginMatch || !endMatch) return normalized;
  const type = beginMatch[1];
  const b64 = normalized.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '');
  const wrapped = (b64.match(/.{1,64}/g) ?? []).join('\n');
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----`;
}

const PRIVATE_KEY = RAW_KEY ? normalizePem(RAW_KEY) : '';

function sign(method, urlPath) {
  const ts = Date.now().toString();
  const msg = ts + method.toUpperCase() + urlPath.split('?')[0];
  const s = crypto.createSign('RSA-SHA256');
  s.update(msg); s.end();
  const sig = s.sign({ key: PRIVATE_KEY, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST }).toString('base64');
  return { 'Content-Type': 'application/json', 'KALSHI-ACCESS-KEY': API_KEY, 'KALSHI-ACCESS-SIGNATURE': sig, 'KALSHI-ACCESS-TIMESTAMP': ts };
}

async function main() {
  const eventsPath = '/trade-api/v2/events';
  let cursor;
  let found = [];

  for (let pg = 0; pg < 25; pg++) {
    const params = new URLSearchParams({ status: 'open', limit: '200', with_nested_markets: 'true' });
    if (cursor) params.set('cursor', cursor);
    const p = `${eventsPath}?${params}`;
    const res = await fetch(`${KALSHI_BASE}${p}`, { headers: sign('GET', eventsPath) });
    if (!res.ok) { console.log(`Page ${pg} failed: ${res.status}`); break; }
    const d = await res.json();
    const events = d.events || [];

    for (const ev of events) {
      const et = (ev.event_ticker || '').toUpperCase();
      const title = (ev.title || '').toLowerCase();
      const cat = (ev.category || '').toUpperCase();
      // Search for fresno, pepperdine, or college baseball game events
      if (title.includes('fresno') || title.includes('pepperdine') || title.includes('cal poly')) {
        found.push({ event_ticker: ev.event_ticker, title: ev.title, category: ev.category, markets: (ev.markets || []).map(m => ({ ticker: m.ticker, title: m.title })) });
      }
      // Also log any CB/baseball game-level events (not futures)
      if (cat === 'SPORTS' && (et.includes('CBGAME') || et.includes('BASEBALL')) && (ev.markets || []).length <= 4) {
        const titles = (ev.markets || []).map(m => m.title).join(' | ');
        if (titles.toLowerCase().includes('fresno') || titles.toLowerCase().includes('pepperdine') || titles.toLowerCase().includes('cal poly')) {
          found.push({ event_ticker: ev.event_ticker, title: ev.title, category: ev.category, markets: (ev.markets || []).map(m => ({ ticker: m.ticker, title: m.title })) });
        }
      }
    }

    cursor = d.cursor;
    if (events.length < 200 || !cursor) break;
    await new Promise(r => setTimeout(r, 150));
    process.stdout.write(`Page ${pg}: ${events.length} events\r`);
  }

  console.log(`\n\nFound ${found.length} matching events:\n`);
  for (const f of found) {
    console.log(`EVENT: ${f.event_ticker} | "${f.title}" | category=${f.category}`);
    for (const m of f.markets) {
      console.log(`  MARKET: ${m.ticker} | "${m.title}"`);
    }
    console.log('');
  }
}

main().catch(console.error);
