// Test The-Odds API for NASCAR
const API_KEY = 'dea4f9f87fe7a2e3642523ee51d398d9';

async function testTheOddsNASCAR() {
  console.log('🏎️ Testing The-Odds API for NASCAR...\n');
  
  try {
    // Try motorsports_nascar endpoint
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/motorsports_nascar/odds?apiKey=${API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`,
      { cache: 'no-store' }
    );
    
    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      const text = await response.text();
      console.log(`Error: ${text}`);
      return;
    }
    
    const data = await response.json();
    console.log(`✅ Found ${data.length} NASCAR events`);
    
    if (data.length > 0) {
      console.log('\nSample event:');
      console.log(`- ${data[0].home_team} vs ${data[0].away_team}`);
      console.log(`  Time: ${data[0].commence_time}`);
      console.log(`  Bookmakers: ${data[0].bookmakers?.length || 0}`);
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

testTheOddsNASCAR();
