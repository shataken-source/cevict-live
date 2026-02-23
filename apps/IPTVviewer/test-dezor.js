// Test DezorIPTV M3U download
const https = require('http');

const credentials = {
  username: 'jascodezorptv',
  password: '19e9a1x16',
  server: 'http://cf.like-cdn.com'
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
