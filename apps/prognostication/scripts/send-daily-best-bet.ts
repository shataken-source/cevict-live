/**
 * Daily script to send the best exclusive bet to free SMS subscribers
 *
 * Run this daily via cron job or scheduled task
 * Example cron: 0 9 * * * (9 AM daily)
 *
 * Usage:
 *   pnpm tsx scripts/send-daily-best-bet.ts
 *
 * Or via API:
 *   curl -X POST http://localhost:3000/api/sms/send-daily-best-bet \
 *     -H "Authorization: Bearer YOUR_ADMIN_PASSWORD"
 */

// Using native fetch (Node 18+)

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.PROGNOSTICATION_ADMIN_PASSWORD;

async function sendDailyBestBet() {
  try {
    console.log('🚀 Starting daily best bet SMS send...');

    const response = await fetch(`${SITE_URL}/api/sms/send-daily-best-bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ADMIN_PASSWORD && { 'Authorization': `Bearer ${ADMIN_PASSWORD}` }),
      },
    });

    const data = await response.json() as any;

    if (data.success) {
      console.log(`✅ Success! Sent to ${data.sent} subscribers`);
      if (data.bestBet) {
        console.log(`📊 Best Bet: ${data.bestBet.game}`);
        console.log(`   Pick: ${data.bestBet.pick}`);
        console.log(`   Confidence: ${data.bestBet.confidence}%`);
        console.log(`   Edge: ${data.bestBet.edge}%`);
      }
      if (data.errors > 0) {
        console.warn(`⚠️  ${data.errors} errors occurred`);
        if (data.errorDetails) {
          console.warn('Error details:', data.errorDetails);
        }
      }
    } else {
      console.error(`❌ Failed: ${data.error}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error sending daily best bet:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  sendDailyBestBet();
}

export { sendDailyBestBet };

