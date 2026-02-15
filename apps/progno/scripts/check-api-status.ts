// Check API-SPORTS account status and available sports
const API_KEY = '55ec5171c639766087f9fea40d9cb215';

async function checkStatus() {
  const res = await fetch('https://v1.api-sports.io/status', {
    headers: { 'x-apisports-key': API_KEY }
  });
  const data = await res.json();
  
  console.log('Account:', JSON.stringify(data.response?.account, null, 2));
  console.log('Subscriptions:', JSON.stringify(data.response?.subscriptions, null, 2));
  
  // Check if Formula 1/NASCAR is available
  const f1Res = await fetch('https://v1.formula-1.api-sports.io/seasons', {
    headers: { 'x-apisports-key': API_KEY }
  });
  const f1Data = await f1Res.json();
  console.log('\nF1 Available:', f1Data.response?.length > 0 ? 'YES' : 'NO');
  if (f1Data.errors) console.log('F1 Errors:', f1Data.errors);
}

checkStatus().catch(console.error);
