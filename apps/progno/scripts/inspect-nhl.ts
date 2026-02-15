// Inspect ESPN NHL API for odds
async function inspectNHL() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard');
  const data = await res.json();
  
  console.log('Total NHL events:', data.events?.length);
  
  // Find first game with odds
  for (const event of data.events || []) {
    const comp = event.competitions?.[0];
    const odds = comp?.odds;
    
    if (odds && odds.length > 0) {
      console.log('\n=== Game with odds ===');
      console.log('Name:', event.name);
      console.log('Date:', event.date);
      
      const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
      console.log('Home:', home?.team?.name);
      console.log('Away:', away?.team?.name);
      
      console.log('\nOdds data:');
      console.log(JSON.stringify(odds[0], null, 2));
      break;
    }
  }
}

inspectNHL().catch(console.error);
