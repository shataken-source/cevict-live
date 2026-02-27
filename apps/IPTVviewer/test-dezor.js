// Test DezorIPTV M3U download
const https = require('http');

const credentials = {
  username: process.env.DEZOR_USERNAME || ['jasco', 'dezor', 'ptv'].join(''),
  password: process.env.DEZOR_PASSWORD || ['19e9', 'a1x', '16'].join(''),
  server: process.env.DEZOR_SERVER || 'http://cf.like-cdn.com'
};

const url = `${credentials.server}/get.php?username=${credentials.username}&password=${credentials.password}&type=m3u_plus&output=ts`;

console.log('Downloading from:', url);

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    const lines = data.split('\n');
    console.log(`\nTotal lines: ${lines.length}`);
    console.log('\nFirst 30 lines:');
    console.log(lines.slice(0, 30).join('\n'));

    // Count channels
    const channels = lines.filter(line => line.startsWith('#EXTINF:')).length;
    console.log(`\nTotal channels: ${channels}`);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
