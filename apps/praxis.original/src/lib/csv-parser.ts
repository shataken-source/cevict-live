import Papa from 'papaparse';
import type { Trade, KalshiCSVRow, PolymarketCSVRow, Platform } from '@/types';

export function parseKalshiCSV(csvText: string): Trade[] {
  const result = Papa.parse<KalshiCSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_'),
  });
  
  if (result.errors.length > 0) {
    console.warn('CSV parse errors:', result.errors);
  }
  
  const trades: Trade[] = [];
  const positionMap = new Map<string, { entries: KalshiCSVRow[], settlements: KalshiCSVRow[] }>();
  
  // Group by ticker
  result.data.forEach((row) => {
    if (!row.ticker) return;
    
    const existing = positionMap.get(row.ticker) || { entries: [], settlements: [] };
    
    if (row.action?.toLowerCase().includes('settlement') || row.type?.toLowerCase().includes('settlement')) {
      existing.settlements.push(row);
    } else {
      existing.entries.push(row);
    }
    
    positionMap.set(row.ticker, existing);
  });
  
  // Convert to trades
  positionMap.forEach((data, ticker) => {
    data.entries.forEach((entry, idx) => {
      const isYes = entry.yes_price && parseFloat(entry.yes_price) > 0;
      const entryPrice = isYes 
        ? parseFloat(entry.yes_price || '0') / 100 
        : parseFloat(entry.no_price || '0') / 100;
      
      const quantity = parseInt(entry.count || '1', 10);
      const fees = parseFloat(entry.fees || '0');
      
      // Find matching settlement
      const settlement = data.settlements.find((s, i) => i === idx) || data.settlements[0];
      
      let settlementPrice: number | undefined;
      let pnl: number | undefined;
      let status: Trade['status'] = 'open';
      
      if (settlement) {
        // Kalshi settles at $1 for correct, $0 for incorrect
        const settledYes = settlement.yes_price && parseFloat(settlement.yes_price) > 0;
        settlementPrice = settledYes ? 1 : 0;
        
        if (isYes) {
          pnl = (settlementPrice - entryPrice) * quantity - fees;
        } else {
          pnl = ((1 - settlementPrice) - entryPrice) * quantity - fees;
        }
        status = 'settled';
      }
      
      trades.push({
        id: `kalshi-${ticker}-${idx}-${Date.now()}`,
        platform: 'kalshi',
        ticker,
        market_title: entry.market || ticker,
        direction: isYes ? 'YES' : 'NO',
        entry_price: entryPrice,
        exit_price: settlementPrice,
        quantity,
        entry_time: new Date(entry.created_time || Date.now()),
        exit_time: settlement ? new Date(settlement.created_time || Date.now()) : undefined,
        status,
        settlement_price: settlementPrice,
        pnl,
        pnl_percent: pnl && entryPrice > 0 ? (pnl / (entryPrice * quantity)) * 100 : undefined,
        fees,
      });
    });
  });
  
  return trades;
}

export function parsePolymarketCSV(csvText: string): Trade[] {
  const result = Papa.parse<PolymarketCSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().replace(/\s+/g, '_'),
  });
  
  if (result.errors.length > 0) {
    console.warn('CSV parse errors:', result.errors);
  }
  
  return result.data
    .filter((row) => row.market && row.price)
    .map((row, idx) => {
      const price = parseFloat(row.price || '0');
      const shares = parseFloat(row.shares || '1');
      const fees = parseFloat(row.fees || '0');
      const total = parseFloat(row.total || '0');
      
      const direction = row.outcome?.toLowerCase() === 'yes' || row.side?.toLowerCase() === 'buy' 
        ? 'YES' : 'NO';
      
      return {
        id: `poly-${idx}-${Date.now()}`,
        platform: 'polymarket' as Platform,
        ticker: row.market?.substring(0, 20) || 'POLY',
        market_title: row.market || 'Unknown Market',
        direction,
        entry_price: price,
        quantity: shares,
        entry_time: new Date(row.timestamp || Date.now()),
        status: 'open' as const,
        fees,
      };
    });
}

export function parseGenericCSV(csvText: string): Trade[] {
  // Auto-detect format based on headers
  const firstLine = csvText.split('\n')[0].toLowerCase();
  
  if (firstLine.includes('kalshi') || firstLine.includes('yes_price') || firstLine.includes('no_price')) {
    return parseKalshiCSV(csvText);
  }
  
  if (firstLine.includes('polymarket') || firstLine.includes('outcome') || firstLine.includes('shares')) {
    return parsePolymarketCSV(csvText);
  }
  
  // Fallback to Kalshi format
  return parseKalshiCSV(csvText);
}

export function exportTradesToCSV(trades: Trade[]): string {
  const data = trades.map((t) => ({
    date: t.entry_time.toISOString(),
    platform: t.platform,
    ticker: t.ticker,
    market: t.market_title,
    direction: t.direction,
    entry_price: t.entry_price,
    exit_price: t.exit_price || '',
    quantity: t.quantity,
    status: t.status,
    pnl: t.pnl || '',
    fees: t.fees,
  }));
  
  return Papa.unparse(data);
}
