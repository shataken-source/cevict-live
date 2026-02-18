const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3008,
  path: '/api/cron/daily-predictions',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer k-N92_wv6guYo_uKHPLTZ5FPjh6H61VIWk-1jpvUnk0='
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('BODY:', data.slice(0, 1000)); // Log first 1000 chars
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();