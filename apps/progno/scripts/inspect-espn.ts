// Quick test to inspect ESPN API structure
async function inspectESPN() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard');
  const data = await res.json();
  
  console.log('Total events:', data.events?.length);
  
  if (data.events?.[0]) {
    const event = data.events[0];
    console.log('\nEvent keys:', Object.keys(event));
    console.log('\nCompetition keys:', Object.keys(event.competitions?.[0] || {}));
    
    // Check for odds
    const comp = event.competitions?.[0];
    if (comp?.odds) {
      console.log('\nOdds found:', JSON.stringify(comp.odds, null, 2));
    } else {
      console.log('\nNo odds in competition');
    }
    
    // Check for provider
    if (comp?.odds?.provider) {
      console.log('\nProvider:', comp.odds.provider);
    }
  }
}

inspectESPN().catch(console.error);
