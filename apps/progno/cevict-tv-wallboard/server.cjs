const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3434;
const PROGNO_API = 'http://localhost:3008';
const DIR = __dirname;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
};

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

const server = http.createServer(async (req, res) => {
  // Proxy /api/* requests to Progno on port 3008 (safe routes only)
  if (req.url.startsWith('/api/')) {
    // Block non-GET and any route not in the allowlist
    if (req.method !== 'GET' || !ALLOWED_PROXY_PREFIXES.some(p => req.url.startsWith(p))) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: this route is not available through the wallboard proxy' }));
      return;
    }

    try {
      // Strip sensitive headers before forwarding
      const safeHeaders = { ...req.headers, host: 'localhost:3008' };
      delete safeHeaders['authorization'];
      delete safeHeaders['x-admin-secret'];
      delete safeHeaders['cookie'];

      const proxyUrl = PROGNO_API + req.url;
      const proxyRes = await fetch(proxyUrl, {
        method: 'GET',
        headers: safeHeaders,
      });
      res.writeHead(proxyRes.status, {
        'Content-Type': proxyRes.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      const body = await proxyRes.arrayBuffer();
      res.end(Buffer.from(body));
    } catch (e) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error: ' + e.message }));
    }
    return;
  }

  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(DIR, filePath);

  // Prevent path traversal (use path.resolve + lowercase compare for Windows compatibility)
  const resolved = path.resolve(filePath);
  const dirResolved = path.resolve(DIR);
  if (!resolved.toLowerCase().startsWith(dirResolved.toLowerCase())) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + req.url);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Wallboard server running at http://localhost:${PORT}`);
  console.log(`On your TV: http://<your-ip>:${PORT}`);
  console.log(`Proxying /api/* -> ${PROGNO_API}`);
});
