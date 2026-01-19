// Arbitrage Betting Detection Engine

export interface BookOdds {
  bookmaker: string
  home: number  // American odds
  away: number
  spread?: number
  total?: number
  overOdds?: number
  underOdds?: number
}

export interface ArbitrageOpportunity {
  game: string
  sport: string
  type: 'moneyline' | 'spread' | 'total'
  profit: number  // Percentage profit guaranteed
  stake: number   // Total stake needed
  bets: ArbBet[]
  expiry?: Date
}

export interface ArbBet {
  bookmaker: string
  selection: string
  odds: number      // American odds
  stake: number     // Amount to bet
  payout: number    // Expected payout
}

// Convert American odds to decimal
function americanToDecimal(american: number): number {
  if (american > 0) {
    return (american / 100) + 1
  } else {
    return (100 / Math.abs(american)) + 1
  }
}

// Convert decimal odds to implied probability
function decimalToProb(decimal: number): number {
  return 1 / decimal
}

// Detect moneyline arbitrage
export function detectMoneylineArb(books: BookOdds[], game: string, sport: string): ArbitrageOpportunity | null {
  if (books.length < 2) return null
  
  // Find best odds for each outcome
  let bestHome = { book: '', odds: -Infinity, decimal: 0 }
  let bestAway = { book: '', odds: -Infinity, decimal: 0 }
  
  for (const book of books) {
    const homeDecimal = americanToDecimal(book.home)
    const awayDecimal = americanToDecimal(book.away)
    
    if (homeDecimal > bestHome.decimal) {
      bestHome = { book: book.bookmaker, odds: book.home, decimal: homeDecimal }
    }
    
    if (awayDecimal > bestAway.decimal) {
      bestAway = { book: book.bookmaker, odds: book.away, decimal: awayDecimal }
    }
  }
  
  // Calculate total implied probability
  const totalProb = decimalToProb(bestHome.decimal) + decimalToProb(bestAway.decimal)
  
  // Arbitrage exists if total probability < 1
  if (totalProb >= 1) return null
  
  // Calculate profit percentage
  const profit = ((1 / totalProb) - 1) * 100
  
  // Calculate optimal stakes for $100 total
  const totalStake = 100
  const homeStake = (totalStake * decimalToProb(bestHome.decimal)) / totalProb
  const awayStake = (totalStake * decimalToProb(bestAway.decimal)) / totalProb
  
  return {
    game,
    sport,
    type: 'moneyline',
    profit: Math.round(profit * 100) / 100,
    stake: totalStake,
    bets: [
      {
        bookmaker: bestHome.book,
        selection: 'Home',
        odds: bestHome.odds,
        stake: Math.round(homeStake * 100) / 100,
        payout: Math.round(homeStake * bestHome.decimal * 100) / 100
      },
      {
        bookmaker: bestAway.book,
        selection: 'Away',
        odds: bestAway.odds,
        stake: Math.round(awayStake * 100) / 100,
        payout: Math.round(awayStake * bestAway.decimal * 100) / 100
      }
    ]
  }
}

// Detect total (over/under) arbitrage
export function detectTotalArb(books: BookOdds[], game: string, sport: string): ArbitrageOpportunity | null {
  if (books.length < 2) return null
  
  let bestOver = { book: '', odds: -Infinity, decimal: 0, total: 0 }
  let bestUnder = { book: '', odds: -Infinity, decimal: 0, total: 0 }
  
  for (const book of books) {
    if (!book.total || !book.overOdds || !book.underOdds) continue
    
    const overDecimal = americanToDecimal(book.overOdds)
    const underDecimal = americanToDecimal(book.underOdds)
    
    if (overDecimal > bestOver.decimal) {
      bestOver = { book: book.bookmaker, odds: book.overOdds, decimal: overDecimal, total: book.total }
    }
    
    if (underDecimal > bestUnder.decimal) {
      bestUnder = { book: book.bookmaker, odds: book.underOdds, decimal: underDecimal, total: book.total }
    }
  }
  
  if (bestOver.decimal === 0 || bestUnder.decimal === 0) return null
  
  const totalProb = decimalToProb(bestOver.decimal) + decimalToProb(bestUnder.decimal)
  
  if (totalProb >= 1) return null
  
  const profit = ((1 / totalProb) - 1) * 100
  const totalStake = 100
  const overStake = (totalStake * decimalToProb(bestOver.decimal)) / totalProb
  const underStake = (totalStake * decimalToProb(bestUnder.decimal)) / totalProb
  
  return {
    game,
    sport,
    type: 'total',
    profit: Math.round(profit * 100) / 100,
    stake: totalStake,
    bets: [
      {
        bookmaker: bestOver.book,
        selection: `Over ${bestOver.total}`,
        odds: bestOver.odds,
        stake: Math.round(overStake * 100) / 100,
        payout: Math.round(overStake * bestOver.decimal * 100) / 100
      },
      {
        bookmaker: bestUnder.book,
        selection: `Under ${bestUnder.total}`,
        odds: bestUnder.odds,
        stake: Math.round(underStake * 100) / 100,
        payout: Math.round(underStake * bestUnder.decimal * 100) / 100
      }
    ]
  }
}

// Find all arbitrage opportunities from multiple books
export function findAllArbitrageOpportunities(
  gamesWithBooks: { game: string, sport: string, books: BookOdds[] }[]
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = []
  
  for (const gameData of gamesWithBooks) {
    const mlArb = detectMoneylineArb(gameData.books, gameData.game, gameData.sport)
    if (mlArb && mlArb.profit > 0.5) {  // Only show if profit > 0.5%
      opportunities.push(mlArb)
    }
    
    const totalArb = detectTotalArb(gameData.books, gameData.game, gameData.sport)
    if (totalArb && totalArb.profit > 0.5) {
      opportunities.push(totalArb)
    }
  }
  
  // Sort by profit descending
  return opportunities.sort((a, b) => b.profit - a.profit)
}