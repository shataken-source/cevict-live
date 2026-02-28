const express = require('express');
const path = require('path');
const http = require('http');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = 3434;
const API_PORT = 3008;

// SAFE proxy allowlist — only read-only public endpoints.
// Admin/trading/cron routes are NEVER proxied.
const ALLOWED_PROXY_PREFIXES = [
  '/api/picks/',
  '/api/espn-scores',
  '/api/health/',
  '/api/performance',
  '/api/accuracy',
  '/api/progno/daily-card',
  '/api/progno/predictions',
];

function isProxyAllowed(url) {
  // Only allow GET requests through the proxy
  return ALLOWED_PROXY_PREFIXES.some(p => url.startsWith(p));
}

app.use('/api', (req, res) => {
  const apiPath = '/api' + req.url;

  // Block non-GET and any route not in the allowlist
  if (req.method !== 'GET' || !isProxyAllowed(apiPath)) {
    return res.status(403).json({ error: 'Forbidden: this route is not available through the wallboard proxy' });
  }

  // Strip sensitive headers before forwarding
  const safeHeaders = { ...req.headers, host: `localhost:${API_PORT}` };
  delete safeHeaders['authorization'];
  delete safeHeaders['x-admin-secret'];
  delete safeHeaders['cookie'];

  const options = {
    hostname: 'localhost',
    port: API_PORT,
    path: apiPath,
    method: 'GET',
    headers: safeHeaders,
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

// Serve static files — only known safe extensions (not package.json, node_modules, etc.)
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html', 'js', 'css', 'mp3', 'png', 'jpg', 'svg'] }));
app.use(express.static(__dirname, {
  index: false,
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.html', '.js', '.css', '.mp3', '.png', '.jpg', '.svg', '.ico'].includes(ext)) {
      res.status(403).end('Forbidden');
    }
  }
}));

// Main wallboard route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '127.0.0.1', () => {
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
