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

const server = http.createServer(async (req, res) => {
  // Proxy /api/* requests to Progno on port 3008
  if (req.url.startsWith('/api/')) {
    try {
      const proxyUrl = PROGNO_API + req.url;
      const proxyRes = await fetch(proxyUrl, {
        method: req.method,
        headers: { ...req.headers, host: 'localhost:3008' },
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

  // Prevent path traversal
  if (!filePath.startsWith(DIR)) {
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Wallboard server running at http://localhost:${PORT}`);
  console.log(`On your TV: http://<your-ip>:${PORT}`);
  console.log(`Proxying /api/* -> ${PROGNO_API}`);
});
