// Test SportsBlaze API (expired Jan 15, 2026)
const API_KEY = 'sbfhgr1cnxqlmxab8eggxbt';

async function testSportsBlaze() {
  console.log('🔥 Testing SportsBlaze API...');
  console.log('Note: Key expired Jan 15, 2026\n');
  
  try {
    const response = await fetch(
      `https://api.sportsblaze.com/nfl/v1/boxscores/daily/2025-02-09.json?key=${API_KEY}`
    );
    
    if (response.status === 401) {
      console.log('❌ KEY EXPIRED - Unauthorized (401)');
      console.log('Request new key at: https://sportsblaze.com/');
    } else if (!response.ok) {
      console.log(`❌ HTTP ${response.status}`);
    } else {
      const data = await response.json();
      console.log('✅ Key still works!');
      console.log(`Found ${data.length || 0} games`);
    }
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
  }
}

testSportsBlaze();
