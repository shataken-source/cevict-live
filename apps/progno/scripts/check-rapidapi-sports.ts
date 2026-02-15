// Check available sports in RapidAPI
const RAPIDAPI_KEY = '7ef3fb144dmshe8c25e6e3067f43p1b3b6djsna6f7ae896539';
const RAPIDAPI_HOST = 'odds-api1.p.rapidapi.com';

async function checkSports() {
  const res = await fetch(`https://${RAPIDAPI_HOST}/v4/sports`, {
    headers: {
      'x-rapidapi-key': RAPIDAPI_KEY,
      'x-rapidapi-host': RAPIDAPI_HOST,
    }
  });
  const data = await res.json();

  console.log('Response type:', typeof data);
  console.log('Is array:', Array.isArray(data));
  console.log('Response:', JSON.stringify(data).slice(0, 1000));

  if (Array.isArray(data)) {
    console.log('\nAvailable sports:');
    data.forEach((sport: any) => {
      console.log(`- ${sport.key}: ${sport.title}`);
    });
  } else {
    console.log('Unexpected response format');
  }
}

checkSports().catch(console.error);
