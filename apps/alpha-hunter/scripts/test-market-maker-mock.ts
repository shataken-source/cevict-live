/**
 * Test market-maker client with mock data. Expected outputs are known; we assert they match.
 * Run: npx tsx scripts/test-market-maker-mock.ts
 */

// Mock fetch before importing the client
const mockResponses: Record<string, { status: number; body: any }> = {
  'https://progno.test/api/markets/market-makers?platform=kalshi&marketId=AVOIDME': {
    status: 200,
    body: {
      success: true,
      analysis: {
        tradingRecommendation: { action: 'avoid', reason: 'Low liquidity or wide spread - poor execution conditions' },
        liquidity: { level: 'low' },
      },
    },
  },
  'https://progno.test/api/markets/market-makers?platform=kalshi&marketId=TRADEME': {
    status: 200,
    body: {
      success: true,
      analysis: {
        tradingRecommendation: {
          action: 'trade',
          reason: 'High liquidity and tight spread - good execution conditions',
          suggestedLimitPrice: 58,
        },
        liquidity: { level: 'high' },
      },
    },
  },
  'https://progno.test/api/markets/market-makers?platform=kalshi&marketId=WAITME': {
    status: 200,
    body: {
      success: true,
      analysis: {
        tradingRecommendation: { action: 'wait', reason: 'Moderate conditions - wait for better entry' },
        liquidity: { level: 'medium' },
      },
    },
  },
};

const originalFetch = globalThis.fetch;
(globalThis as any).fetch = (url: string) => {
  const key = url.replace(/^https?:\/\/[^/]+/, 'https://progno.test');
  const mock = mockResponses[key];
  if (mock) {
    return Promise.resolve({
      ok: mock.status >= 200 && mock.status < 300,
      status: mock.status,
      json: () => Promise.resolve(mock.body),
    } as Response);
  }
  if (url.includes('marketId=NETWORKERROR')) {
    return Promise.reject(new Error('Network error'));
  }
  if (url.includes('marketId=500')) {
    return Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'INTERNAL_ERROR' }),
    } as Response);
  }
  return originalFetch(url);
};

// Force client to use our base so our mock keys match
process.env.PROGNO_BASE_URL = 'https://progno.test';
process.env.DISABLE_MARKET_MAKER = '';

async function main() {
  const { getMarketMakerAdvice } = await import('../src/intelligence/market-maker-client');

  const out: string[] = [];
  let failed = 0;

  // 1) AVOID → expect { action: 'avoid', reason: '...' }
  const avoid = await getMarketMakerAdvice('AVOIDME');
  const expectAvoid = {
    action: 'avoid' as const,
    reason: 'Low liquidity or wide spread - poor execution conditions',
    liquidity: 'low' as const,
  };
  const avoidOk =
    avoid?.action === expectAvoid.action &&
    avoid?.reason === expectAvoid.reason &&
    avoid?.liquidity === expectAvoid.liquidity;
  if (!avoidOk) {
    failed++;
    out.push(`FAIL AVOID: expected ${JSON.stringify(expectAvoid)}, got ${JSON.stringify(avoid)}`);
  } else {
    out.push(`OK   AVOID: ${JSON.stringify(avoid)}`);
  }

  // 2) TRADE → expect { action: 'trade', suggestedLimitPrice: 58, ... }
  const trade = await getMarketMakerAdvice('TRADEME');
  const expectTrade = {
    action: 'trade' as const,
    reason: 'High liquidity and tight spread - good execution conditions',
    suggestedLimitPrice: 58,
    liquidity: 'high' as const,
  };
  const tradeOk =
    trade?.action === expectTrade.action &&
    trade?.reason === expectTrade.reason &&
    trade?.suggestedLimitPrice === expectTrade.suggestedLimitPrice &&
    trade?.liquidity === expectTrade.liquidity;
  if (!tradeOk) {
    failed++;
    out.push(`FAIL TRADE: expected ${JSON.stringify(expectTrade)}, got ${JSON.stringify(trade)}`);
  } else {
    out.push(`OK   TRADE: ${JSON.stringify(trade)}`);
  }

  // 3) WAIT → expect { action: 'wait' }
  const wait = await getMarketMakerAdvice('WAITME');
  const waitOk = wait?.action === 'wait' && wait?.liquidity === 'medium';
  if (!waitOk) {
    failed++;
    out.push(`FAIL WAIT: expected action=wait, liquidity=medium, got ${JSON.stringify(wait)}`);
  } else {
    out.push(`OK   WAIT: ${JSON.stringify(wait)}`);
  }

  // 4) Network error → expect null (fallback)
  const err = await getMarketMakerAdvice('NETWORKERROR');
  const errOk = err === null;
  if (!errOk) {
    failed++;
    out.push(`FAIL ERROR: expected null, got ${JSON.stringify(err)}`);
  } else {
    out.push(`OK   ERROR (null): fallback as expected`);
  }

  // 5) 500 response → expect null
  const five = await getMarketMakerAdvice('500');
  const fiveOk = five === null;
  if (!fiveOk) {
    failed++;
    out.push(`FAIL 500: expected null, got ${JSON.stringify(five)}`);
  } else {
    out.push(`OK   500 (null): fallback as expected`);
  }

  // 6) Simulate skip logic: given avoid → placement returns skipped
  const adviceAvoid = await getMarketMakerAdvice('AVOIDME');
  const wouldSkip = adviceAvoid?.action === 'avoid';
  if (!wouldSkip) {
    failed++;
    out.push(`FAIL SKIP LOGIC: avoid advice should lead to skip`);
  } else {
    out.push(`OK   SKIP LOGIC: avoid → would return { status: 'skipped' }`);
  }

  // 7) Simulate price hint: trade + suggestedLimitPrice 58, our price 56 → within 5¢ → use 58
  const adviceTrade = await getMarketMakerAdvice('TRADEME');
  const ourPrice = 56;
  const suggested = adviceTrade?.suggestedLimitPrice;
  const within5 = suggested != null && Math.abs(suggested - ourPrice) <= 5;
  const useSuggested = within5 && adviceTrade?.action === 'trade';
  if (!useSuggested || suggested !== 58) {
    failed++;
    out.push(`FAIL PRICE HINT: expected to use suggested 58 when our price 56, within5=${within5}, suggested=${suggested}`);
  } else {
    out.push(`OK   PRICE HINT: trade + suggestedLimitPrice 58, our 56 → would use 58`);
  }

  console.log('\n--- Market-maker mock test ---\n');
  out.forEach((line) => console.log(line));
  console.log('\n--- Summary ---');
  if (failed > 0) {
    console.log(`FAILED: ${failed}`);
    process.exit(1);
  }
  console.log('All expected outputs matched.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
