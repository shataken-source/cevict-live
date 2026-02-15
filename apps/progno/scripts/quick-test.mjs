console.log('Testing SportsBlaze...');
fetch('https://api.sportsblaze.com/nascar/v1/boxscores/daily/2026-02-15.json?key=sbf556ejht8g2wvxf3bbeby')
  .then(r => {
    console.log('NASCAR Status:', r.status);
    return r.text();
  })
  .then(t => console.log('Response:', t.slice(0, 200)))
  .catch(e => console.error('Error:', e.message));
