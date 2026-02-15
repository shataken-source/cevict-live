// Test SportsBlaze API for NASCAR
const API_KEY = 'sbf556ejht8g2wvxf3bbeby';

async function testSportsBlazeNASCAR() {
  console.log('🔥 Testing SportsBlaze API for NASCAR...\n');
  
  try {
    // Try NASCAR endpoint
    const response = await fetch(
      `https://api.sportsblaze.com/nascar/v1/boxscores/daily/2026-02-15.json?key=${API_KEY}`
    );
    
    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      const text = await response.text();
      console.log(`Error: ${text}`);
      return;
    }
    
    const data = await response.json();
    console.log('✅ SportsBlaze NASCAR data:');
    console.log(JSON.stringify(data, null, 2).slice(0, 500));
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

// Also try motorsports endpoint
async function testMotorsports() {
  console.log('\n🔥 Testing Motorsports endpoint...\n');
  
  try {
    const response = await fetch(
      `https://api.sportsblaze.com/motorsports/v1/events/daily/2026-02-15.json?key=${API_KEY}`
    );
    
    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
      console.log('Motorsports endpoint not available');
      return;
    }
    
    const data = await response.json();
    console.log('✅ Motorsports data found');
    console.log(JSON.stringify(data, null, 2).slice(0, 500));
  } catch (error) {
    console.log('Motorsports endpoint not available');
  }
}

testSportsBlazeNASCAR().then(() => testMotorsports());
