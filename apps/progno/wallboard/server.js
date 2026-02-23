const express = require('express');
const path = require('path');
const http = require('http');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = 3434;
const API_PORT = 3008;

// Proxy /api/* → localhost:3008/api/* (avoids CORS from port 3434 → 3008)
app.use('/api', (req, res) => {
  const options = {
    hostname: 'localhost',
    port: API_PORT,
    path: '/api' + req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${API_PORT}` },
  };
  const proxy = http.request(options, (apiRes) => {
    res.writeHead(apiRes.statusCode, apiRes.headers);
    apiRes.pipe(res, { end: true });
  });
  proxy.on('error', (e) => {
    console.error('[proxy error]', e.message);
    res.status(502).json({ error: 'API unavailable', detail: e.message });
  });
  req.pipe(proxy, { end: true });
});

// Serve static files from wallboard directory
app.use(express.static(__dirname));

// Main wallboard route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;

  console.log('\n' + '='.repeat(60));
  console.log('🎯 CEVICT WALLBOARD SERVER');
  console.log('='.repeat(60));
  console.log(`\n📺 Wallboard running at: ${url}`);
  console.log('\n🔗 Access Options:');
  console.log(`   1. On this computer: ${url}`);
  console.log(`   2. On TV browser: http://[YOUR-IP]:${PORT}`);
  console.log(`   3. Cast from Chrome: Click cast icon while viewing ${url}`);
  console.log('\n📱 QR Code (scan with phone to cast):\n');

  qrcode.generate(url, { small: true });

  console.log('\n💡 Tips:');
  console.log('   - Bookmark this URL on your TV browser');
  console.log('   - Use Chrome cast from your laptop');
  console.log('   - Press F11 for fullscreen');
  console.log('\n' + '='.repeat(60) + '\n');
});
