/**
 * Temporary sample trades for homepage/screenshot demos.
 * Use "Load screenshot demo" in Dashboard to inject; use "Clear" when done.
 */
import type { Trade } from '@/types';

function d(dayOffset: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export const SAMPLE_TRADES: Trade[] = [
  // Kalshi – last 2 months, mix of wins/losses
  { id: 'demo-k-1', platform: 'kalshi', ticker: 'KXBTC-25JAN', market_title: 'Will Bitcoin close above $100k on Jan 25?', direction: 'YES', entry_price: 0.62, exit_price: 1, quantity: 10, entry_time: d(52, 9), exit_time: d(51, 18), status: 'settled', settlement_price: 1, pnl: 3.65, pnl_percent: 61.3, fees: 0.35 },
  { id: 'demo-k-2', platform: 'kalshi', ticker: 'FEDCUT-MAR', market_title: 'Will the Fed cut rates in March 2025?', direction: 'NO', entry_price: 0.45, exit_price: 0, quantity: 20, entry_time: d(48), exit_time: d(45), status: 'settled', settlement_price: 0, pnl: 8.82, pnl_percent: 98, fees: 0.18 },
  { id: 'demo-k-3', platform: 'kalshi', ticker: 'SPX-500-25Q1', market_title: 'S&P 500 above 6000 by end of Q1 2025?', direction: 'YES', entry_price: 0.55, exit_price: 0, quantity: 15, entry_time: d(44), exit_time: d(42), status: 'settled', settlement_price: 0, pnl: -8.32, pnl_percent: -100, fees: 0.18 },
  { id: 'demo-k-4', platform: 'kalshi', ticker: 'SNOW-NYC-25', market_title: 'Will NYC get 1+ inch snow Jan 15-20?', direction: 'NO', entry_price: 0.72, exit_price: 1, quantity: 10, entry_time: d(38), exit_time: d(36), status: 'settled', settlement_price: 1, pnl: 2.72, pnl_percent: 38.9, fees: 0.08 },
  { id: 'demo-k-5', platform: 'kalshi', ticker: 'TEMP-NYC-70', market_title: 'NYC high temp above 70°F on Feb 1?', direction: 'YES', entry_price: 0.28, exit_price: 0, quantity: 25, entry_time: d(35), exit_time: d(34), status: 'settled', settlement_price: 0, pnl: -7.07, pnl_percent: -100, fees: 0.18 },
  { id: 'demo-k-6', platform: 'kalshi', ticker: 'CPI-FEB25', market_title: 'US CPI YoY above 3% in February 2025?', direction: 'NO', entry_price: 0.58, exit_price: 1, quantity: 20, entry_time: d(32), exit_time: d(30), status: 'settled', settlement_price: 1, pnl: 8.28, pnl_percent: 72.4, fees: 0.12 },
  { id: 'demo-k-7', platform: 'kalshi', ticker: 'NFL-SB-WIN', market_title: 'Chiefs to win Super Bowl LIX?', direction: 'YES', entry_price: 0.48, exit_price: 1, quantity: 30, entry_time: d(28), exit_time: d(26), status: 'settled', settlement_price: 1, pnl: 15.42, pnl_percent: 108.3, fees: 0.18 },
  { id: 'demo-k-8', platform: 'kalshi', ticker: 'OIL-80-MAR', market_title: 'WTI crude above $80 on Mar 1?', direction: 'YES', entry_price: 0.52, exit_price: 0, quantity: 15, entry_time: d(25), exit_time: d(23), status: 'settled', settlement_price: 0, pnl: -7.86, pnl_percent: -100, fees: 0.14 },
  { id: 'demo-k-9', platform: 'kalshi', ticker: 'UNEMPLOY-MAR', market_title: 'US unemployment rate below 4% in March?', direction: 'YES', entry_price: 0.65, exit_price: 1, quantity: 20, entry_time: d(20), exit_time: d(18), status: 'settled', settlement_price: 1, pnl: 6.94, pnl_percent: 53.8, fees: 0.06 },
  { id: 'demo-k-10', platform: 'kalshi', ticker: 'RAIN-LA-25', market_title: 'LA rainfall above 1" in February?', direction: 'NO', entry_price: 0.41, exit_price: 0, quantity: 20, entry_time: d(16), exit_time: d(14), status: 'settled', settlement_price: 0, pnl: 8.14, pnl_percent: 99.2, fees: 0.06 },
  // Polymarket
  { id: 'demo-p-1', platform: 'polymarket', ticker: 'trump-2024-win', market_title: 'Trump to win 2024 presidential election?', direction: 'YES', entry_price: 0.55, exit_price: 1, quantity: 50, entry_time: d(55, 14), exit_time: d(52), status: 'settled', settlement_price: 1, pnl: 22.25, pnl_percent: 81.8, fees: 0.75 },
  { id: 'demo-p-2', platform: 'polymarket', ticker: 'fed-rate-march', market_title: 'Fed rate cut by March 2025?', direction: 'YES', entry_price: 0.68, exit_price: 1, quantity: 25, entry_time: d(40), exit_time: d(38), status: 'settled', settlement_price: 1, pnl: 7.88, pnl_percent: 47.1, fees: 0.12 },
  { id: 'demo-p-3', platform: 'polymarket', ticker: 'btc-100k-jan', market_title: 'Bitcoin above $100k by end of January?', direction: 'NO', entry_price: 0.55, exit_price: 1, quantity: 20, entry_time: d(45), exit_time: d(43), status: 'settled', settlement_price: 1, pnl: 8.90, pnl_percent: 81.8, fees: 0.10 },
  { id: 'demo-p-4', platform: 'polymarket', ticker: 'ai-superintel-2025', market_title: 'AGI/ superintelligence by end of 2025?', direction: 'NO', entry_price: 0.88, exit_price: 1, quantity: 15, entry_time: d(30), exit_time: d(28), status: 'settled', settlement_price: 1, pnl: 1.80, pnl_percent: 13.6, fees: 0.00 },
  { id: 'demo-p-5', platform: 'polymarket', ticker: 'spacex-mars-2026', market_title: 'SpaceX crewed Mars mission by 2026?', direction: 'NO', entry_price: 0.72, exit_price: 0, quantity: 10, entry_time: d(22), exit_time: d(20), status: 'settled', settlement_price: 0, pnl: 7.20, pnl_percent: 100, fees: 0.00 },
  { id: 'demo-p-6', platform: 'polymarket', ticker: 'recession-2025', market_title: 'US recession in 2025?', direction: 'NO', entry_price: 0.35, exit_price: 0, quantity: 40, entry_time: d(18), exit_time: d(16), status: 'settled', settlement_price: 0, pnl: 13.80, pnl_percent: 98.6, fees: 0.20 },
  { id: 'demo-p-7', platform: 'polymarket', ticker: 'eth-etf-jan', market_title: 'Spot ETH ETF approved by Jan 15?', direction: 'YES', entry_price: 0.60, exit_price: 1, quantity: 25, entry_time: d(50), exit_time: d(48), status: 'settled', settlement_price: 1, pnl: 9.88, pnl_percent: 66.7, fees: 0.12 },
  { id: 'demo-p-8', platform: 'polymarket', ticker: 'gdp-q1-positive', market_title: 'US GDP growth positive in Q1 2025?', direction: 'YES', entry_price: 0.78, exit_price: 1, quantity: 20, entry_time: d(12), exit_time: d(10), status: 'settled', settlement_price: 1, pnl: 4.36, pnl_percent: 28.2, fees: 0.04 },
  { id: 'demo-p-9', platform: 'polymarket', ticker: 'tesla-300-mar', market_title: 'Tesla stock above $300 by Mar 1?', direction: 'NO', entry_price: 0.52, exit_price: 0, quantity: 15, entry_time: d(8), exit_time: d(6), status: 'settled', settlement_price: 0, pnl: 7.68, pnl_percent: 98.1, fees: 0.12 },
  { id: 'demo-p-10', platform: 'polymarket', ticker: 'snow-california', market_title: 'Major California snow event in February?', direction: 'YES', entry_price: 0.32, exit_price: 0, quantity: 30, entry_time: d(5), exit_time: d(3), status: 'settled', settlement_price: 0, pnl: -9.66, pnl_percent: -100, fees: 0.06 },
  // A few more for chart fill
  { id: 'demo-k-11', platform: 'kalshi', ticker: 'VIX-20-FEB', market_title: 'VIX below 20 on Feb 15?', direction: 'YES', entry_price: 0.70, exit_price: 1, quantity: 15, entry_time: d(14), exit_time: d(12), status: 'settled', settlement_price: 1, pnl: 4.44, pnl_percent: 42.9, fees: 0.06 },
  { id: 'demo-k-12', platform: 'kalshi', ticker: 'GOLD-2100', market_title: 'Gold above $2100/oz by end of Feb?', direction: 'NO', entry_price: 0.48, exit_price: 0, quantity: 20, entry_time: d(10), exit_time: d(8), status: 'settled', settlement_price: 0, pnl: 9.52, pnl_percent: 99.2, fees: 0.08 },
  { id: 'demo-p-11', platform: 'polymarket', ticker: 'inflation-3pct', market_title: 'US inflation below 3% by mid-2025?', direction: 'YES', entry_price: 0.58, exit_price: 1, quantity: 25, entry_time: d(6), exit_time: d(4), status: 'settled', settlement_price: 1, pnl: 10.38, pnl_percent: 72.4, fees: 0.12 },
];
