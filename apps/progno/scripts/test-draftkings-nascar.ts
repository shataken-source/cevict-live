// Test DraftKings NASCAR odds
import { fetchDraftKingsNASCAROdds, convertDraftKingsToOddsService } from '../lib/draftkings-client';

async function test() {
  console.log('🏎️ Testing DraftKings NASCAR odds...\n');
  
  const events = await fetchDraftKingsNASCAROdds();
  
  if (events.length === 0) {
    console.log('❌ No events found from DraftKings');
    return;
  }
  
  console.log(`✅ Found ${events.length} events:\n`);
  
  events.forEach(event => {
    console.log(`📅 ${event.name}`);
    console.log(`   Time: ${event.startTime}`);
    console.log(`   Drivers: ${event.drivers.length}`);
    
    // Show top 10 drivers
    console.log('\n   Top 10 favorites:');
    event.drivers.slice(0, 10).forEach((driver, i) => {
      console.log(`   ${i + 1}. ${driver.name}: ${driver.oddsAmerican} (${driver.odds})`);
    });
    console.log('');
  });
  
  // Test conversion
  const converted = convertDraftKingsToOddsService(events);
  console.log(`✅ Converted to ${converted.length} OddsService events`);
}

test().catch(console.error);
