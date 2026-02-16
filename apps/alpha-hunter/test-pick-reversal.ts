/**
 * Test if picks are reversed - check if mc_win_probability and pick refer to different teams
 */

const mockPicks = [
  {
    home_team: "Duke Blue Devils",
    away_team: "Syracuse Orange",
    pick: "Syracuse Orange",
    mc_win_probability: 0.1007, // 10%
    confidence: 92
  },
  {
    home_team: "Alabama St Hornets",
    away_team: "Miss Valley St Delta Devils",
    pick: "Miss Valley St Delta Devils",
    mc_win_probability: 0.2033, // 20%
    confidence: 92
  },
  {
    home_team: "Northwestern St Demons",
    away_team: "McNeese Cowboys",
    pick: "Northwestern St Demons",
    mc_win_probability: 0.85, // 85%
    confidence: 92
  }
];

console.log('='.repeat(70));
console.log('CHECKING IF PICKS ARE REVERSED');
console.log('='.repeat(70));

for (const p of mockPicks) {
  console.log(`\n${p.home_team} vs ${p.away_team}`);
  console.log(`Pick: ${p.pick}`);
  console.log(`MC win prob: ${(p.mc_win_probability * 100).toFixed(1)}%`);
  console.log(`Confidence: ${p.confidence}%`);
  
  // Scenario 1: MC is for HOME team (current assumption)
  const homeProb = p.mc_win_probability;
  const awayProb = 1 - p.mc_win_probability;
  const isHomePick = p.pick.includes(p.home_team.split(' ')[0]) || p.home_team.includes(p.pick.split(' ')[0]);
  const mcForPick = isHomePick ? homeProb : awayProb;
  
  console.log(`\n  Assumption: MC is HOME team probability`);
  console.log(`    ${p.home_team}: ${(homeProb * 100).toFixed(1)}%`);
  console.log(`    ${p.away_team}: ${(awayProb * 100).toFixed(1)}%`);
  console.log(`    Pick "${p.pick}" MC prob: ${(mcForPick * 100).toFixed(1)}%`);
  console.log(`    Confidence: ${p.confidence}%`);
  console.log(`    Match: ${Math.abs(mcForPick * 100 - p.confidence) < 5 ? '✅ YES' : '❌ NO - huge gap!'}`);
  
  // Scenario 2: MC is for PICKED team directly
  console.log(`\n  Alternative: MC is PICKED team probability`);
  console.log(`    ${p.pick}: ${(p.mc_win_probability * 100).toFixed(1)}%`);
  console.log(`    Confidence: ${p.confidence}%`);
  console.log(`    Match: ${Math.abs(p.mc_win_probability * 100 - p.confidence) < 5 ? '✅ YES' : '❌ NO - huge gap!'}`);
  
  // Check if confidence matches the OTHER team
  const otherTeamProb = isHomePick ? awayProb : homeProb;
  console.log(`\n  Check if confidence matches OTHER team:`);
  console.log(`    ${isHomePick ? p.away_team : p.home_team}: ${(otherTeamProb * 100).toFixed(1)}%`);
  console.log(`    Confidence: ${p.confidence}%`);
  console.log(`    Match: ${Math.abs(otherTeamProb * 100 - p.confidence) < 5 ? '✅ YES - PICK IS REVERSED!' : '❌ No match'}`);
}

console.log('\n' + '='.repeat(70));
console.log('CONCLUSION:');
console.log('If "Match" shows "PICK IS REVERSED!", then the pick field');
console.log('is pointing to the wrong team and should be the other team.');
console.log('='.repeat(70));
