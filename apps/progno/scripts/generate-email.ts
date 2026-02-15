/**
 * Progno Mailing List Email Generator
 * Generates HTML emails matching the OddsJam format with affiliate links
 */

import { writeFileSync } from 'fs';

// Affiliate codes - real referral codes
const AFFILIATE_CODES = {
  KALSHI: 'd8d90227-86fe-4516-971a-50e26d3b73f1',  // Kalshi referral code
  POLYMARKET: 'user_1KHG2EBC3R76GCE9SZ0S9ZS0E',  // Polymarket referral key
  PRIZEPICKS: 'HANDLE',  // Play $5, Get $50
  UNDERDOG: 'HANDLE'  // Play $5, Get $75
};

interface Prediction {
  event: string;
  league: string;
  sport: string;
  prediction: string;
  confidence: number;  // e.g., 3.08 for 3.08%
  recommendedBetSize: number;
  betType: string;
  eventDate: string;
  eventTime: string;
  timezone: string;
  recommendation: {
    pick: string;
    odds: number;
    bookmaker: string;
  };
  oddsComparison: {
    bookmaker: string;
    odds: number;
    isBest?: boolean;
  }[];
}

/**
 * Generate HTML email in OddsJam format
 */
export function generateEmailHTML(prediction: Prediction): string {
  const {
    event, league, sport, prediction: pick, confidence,
    recommendedBetSize, betType, eventDate, eventTime, timezone,
    recommendation, oddsComparison
  } = prediction;

  const bestOdds = oddsComparison.find(o => o.isBest) || oddsComparison[0];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Progno Pick: ${event}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .header .tagline { color: #93c5fd; margin: 5px 0 0 0; font-size: 14px; }
    .urgency { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 20px; font-weight: 600; color: #92400e; }
    .main-content { padding: 20px; }
    .event-title { font-size: 22px; font-weight: 700; color: #1f2937; margin-bottom: 5px; }
    .meta { color: #6b7280; font-size: 14px; margin-bottom: 15px; }
    .edge-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 18px; margin: 10px 0; }
    .bet-size { background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 15px 0; }
    .bet-size-label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .bet-size-value { color: #1f2937; font-size: 20px; font-weight: 700; }
    .recommendation { background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .rec-header { color: #1e40af; font-size: 12px; text-transform: uppercase; font-weight: 600; margin-bottom: 10px; }
    .rec-pick { font-size: 20px; font-weight: 700; color: #1f2937; margin-bottom: 5px; }
    .rec-odds { font-size: 28px; font-weight: 800; color: #059669; }
    .rec-bookmaker { color: #6b7280; font-size: 14px; margin-top: 5px; }
    .odds-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .odds-table th { background: #f9fafb; padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .odds-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .bookmaker-cell { display: flex; align-items: center; gap: 8px; }
    .bookmaker-logo { width: 24px; height: 24px; background: #e5e7eb; border-radius: 4px; }
    .odds-cell { font-weight: 700; font-size: 16px; }
    .odds-positive { color: #059669; }
    .odds-negative { color: #dc2626; }
    .best-odds { background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .cta-section { background: #1f2937; color: white; padding: 30px 20px; text-align: center; }
    .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; margin: 10px 0; }
    .affiliate-section { background: #f3f4f6; padding: 20px; }
    .affiliate-title { font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 15px; }
    .affiliate-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .affiliate-card { background: white; border-radius: 8px; padding: 15px; text-align: center; border: 2px solid #e5e7eb; }
    .affiliate-card.polymarket { border-color: #8b5cf6; }
    .affiliate-card.kalshi { border-color: #3b82f6; }
    .affiliate-logo { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
    .affiliate-bonus { font-size: 24px; font-weight: 800; color: #059669; }
    .affiliate-desc { font-size: 12px; color: #6b7280; margin: 5px 0 10px 0; }
    .affiliate-cta { display: block; background: #1f2937; color: white; padding: 10px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; }
    .unsubscribe { color: #6b7280; }
  </style>
</head>
<body>
  <div class="container" style="text-align: center;">
    <!-- Header -->
    <div class="header">
      <h1>🎯 PROGNO</h1>
      <p class="tagline">AI-Powered Sports Predictions</p>
    </div>

    <!-- Urgency Banner -->
    <div class="urgency" style="text-align: center;">
      🔥 This edge won't last long! Secure your advantage before odds shift.
    </div>

    <!-- Main Content -->
    <div class="main-content" style="text-align: center;">
      <div class="event-title">${event}</div>
      <div class="meta">${league} • ${sport} • ${eventDate}, ${eventTime} ${timezone}</div>

      <!-- Edge Badge -->
      <div class="edge-badge">+${confidence}% Edge</div>

      <!-- Bet Size -->
      <div class="bet-size">
        <div class="bet-size-label">Recommended Bet Size</div>
        <div class="bet-size-value">$${recommendedBetSize}</div>
      </div>

      <!-- Main Recommendation -->
      <div class="recommendation">
        <div class="rec-header">🏆 Progno Recommendation</div>
        <div class="rec-pick">${recommendation.pick}</div>
        <div class="rec-odds">${recommendation.odds > 0 ? '+' : ''}${recommendation.odds}</div>
        <div class="rec-bookmaker">Best odds at ${recommendation.bookmaker}</div>
        <a href="https://polymarket.com/sports?r=${AFFILIATE_CODES.POLYMARKET}" class="cta-button" style="margin-top: 15px;">Bet Now on ${recommendation.bookmaker}</a>
      </div>

      <!-- Odds Comparison -->
      <h3 style="font-size: 16px; color: #1f2937; margin-bottom: 15px;">📊 Odds Comparison</h3>
      <table class="odds-table">
        <tr>
          <th>Bookmaker</th>
          <th>Odds</th>
          <th></th>
        </tr>
        ${oddsComparison.map(odd => `
        <tr>
          <td>
            <div class="bookmaker-cell">
              <div class="bookmaker-logo"></div>
              <span>${odd.bookmaker}</span>
            </div>
          </td>
          <td class="odds-cell ${odd.odds > 0 ? 'odds-positive' : 'odds-negative'}">${odd.odds > 0 ? '+' : ''}${odd.odds}</td>
          <td>${odd.isBest ? '<span class="best-odds">BEST</span>' : ''}</td>
        </tr>
        `).join('')}
      </table>

      <!-- View Event Link -->
      <div style="text-align: center; margin: 20px 0;">
        <a href="https://progno.com/event/${encodeURIComponent(event)}" style="color: #3b82f6; text-decoration: none; font-weight: 600;">
          View Full Analysis on Progno →
        </a>
      </div>
    </div>

    <!-- CTA Section -->
    <div class="cta-section" style="text-align: center;">
      <h2 style="margin: 0 0 10px 0; font-size: 20px;">Start Predicting with Progno</h2>
      <p style="margin: 0 0 20px 0; color: #9ca3af;">Get AI-powered picks delivered to your inbox</p>
      <a href="https://progno.com/signup" class="cta-button">Start Earning Today</a>
    </div>

    <!-- Affiliate Section -->
    <div class="affiliate-section" style="text-align: center;">
      <div class="affiliate-title" style="text-align: center;">💰 Top Offers</div>
      <div class="affiliate-grid">
        <div class="affiliate-card polymarket">
          <div class="affiliate-logo" style="color: #8b5cf6;">Polymarket</div>
          <div class="affiliate-bonus">$10</div>
          <div class="affiliate-desc">Sign up bonus when you place your first bet</div>
          <a href="https://polymarket.com/?r=${AFFILIATE_CODES.POLYMARKET}" class="affiliate-cta" style="background: #8b5cf6;">Claim Bonus</a>
        </div>
        <div class="affiliate-card kalshi">
          <div class="affiliate-logo" style="color: #3b82f6;">Kalshi</div>
          <div class="affiliate-bonus">$10</div>
          <div class="affiliate-desc">Trading credits for new users</div>
          <a href="https://kalshi.com/sign-up/?referral=${AFFILIATE_CODES.KALSHI}" class="affiliate-cta" style="background: #3b82f6;">Claim Bonus</a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>© 2026 Cevict. All rights reserved.</p>
      <p class="unsubscribe">
        <a href="https://progno.com/unsubscribe" style="color: #9ca3af;">Unsubscribe</a> |
        <a href="https://progno.com/privacy" style="color: #9ca3af;">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Create sample prediction data
 */
export function createSamplePrediction(): Prediction {
  return {
    event: "Sydney Kings vs Perth Wildcats",
    league: "Australia - NBL",
    sport: "Basketball",
    prediction: "Sydney Kings Moneyline",
    confidence: 3.08,
    recommendedBetSize: 25,
    betType: "Moneyline",
    eventDate: "02/15/2026",
    eventTime: "00:30",
    timezone: "EST",
    recommendation: {
      pick: "Sydney Kings -355",
      odds: -355,
      bookmaker: "Polymarket"
    },
    oddsComparison: [
      { bookmaker: "Polymarket", odds: -355, isBest: true },
      { bookmaker: "OddsJam", odds: -411 },
      { bookmaker: "BetRivers", odds: -400 },
      { bookmaker: "NorthStar Bets", odds: -395 },
      { bookmaker: "Bally Bet", odds: -380 },
      { bookmaker: "Proline", odds: -375 },
      { bookmaker: "Unibet (Australia)", odds: 400, isBest: false },
      { bookmaker: "Desert Diamond", odds: 400 },
      { bookmaker: "TwinSpires", odds: 400 },
      { bookmaker: "betPARX", odds: 400 },
      { bookmaker: "TABtouch", odds: 400 },
      { bookmaker: "Four Winds", odds: 400 },
      { bookmaker: "Casumo", odds: 400 },
      { bookmaker: "SugarHouse", odds: 400 },
      { bookmaker: "Play Eagle", odds: 400 }
    ]
  };
}

/**
 * Generate and save email
 */
export function generateAndSaveEmail(prediction: Prediction, filename?: string): string {
  const html = generateEmailHTML(prediction);
  const outputFile = filename || `email-${Date.now()}.html`;
  writeFileSync(outputFile, html, 'utf-8');
  console.log(`✅ Email saved to: ${outputFile}`);
  return html;
}

// CLI usage
const isCLI = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('generate-email.ts');
if (isCLI) {
  const sample = createSamplePrediction();
  const html = generateAndSaveEmail(sample, 'sample-email.html');
  console.log('\n📧 Sample email generated!');
  console.log(`Prediction: ${sample.event}`);
  console.log(`Confidence: +${sample.confidence}% edge`);
  console.log(`Recommended bet: $${sample.recommendedBetSize}`);
}

export { AFFILIATE_CODES };
