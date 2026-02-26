// Vercel serverless stream proxy for IPTV
// Proxies HLS manifests and TS segments to bypass CORS restrictions
// Usage: /api/stream?url=<encoded_stream_url>

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const decoded = decodeURIComponent(url);

    // Only allow proxying to known IPTV server patterns
    const parsed = new URL(decoded);
    const allowedPaths = ['/live/', '/movie/', '/series/', '/xmltv.php', '/get.php', '/player_api.php'];
    const isAllowed = allowedPaths.some(p => parsed.pathname.includes(p));
    if (!isAllowed) {
      return res.status(403).json({ error: 'URL not allowed through proxy' });
    }

    const headers = { 'User-Agent': 'SwitchbackTV/1.0' };

    // Forward Range header for seeking support
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const upstream = await fetch(decoded, {
      headers,
      signal: AbortSignal.timeout(30000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });
    }

    // Forward content type
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);

    // Forward content length
    const cl = upstream.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);

    // Forward accept-ranges for seeking
    const ar = upstream.headers.get('accept-ranges');
    if (ar) res.setHeader('Accept-Ranges', ar);

    // For m3u8 manifests, rewrite segment URLs to go through this proxy
    if (ct && (ct.includes('mpegurl') || ct.includes('m3u8') || decoded.endsWith('.m3u8'))) {
      let body = await upstream.text();

      // Rewrite relative segment URLs to absolute proxied URLs
      const baseUrl = decoded.substring(0, decoded.lastIndexOf('/') + 1);
      body = body.replace(/^(?!#)(\S+\.ts.*)$/gm, (match) => {
        const segUrl = match.startsWith('http') ? match : baseUrl + match;
        return `/api/stream?url=${encodeURIComponent(segUrl)}`;
      });
      // Also rewrite any nested m3u8 references (multi-quality streams)
      body = body.replace(/^(?!#)(\S+\.m3u8.*)$/gm, (match) => {
        const segUrl = match.startsWith('http') ? match : baseUrl + match;
        return `/api/stream?url=${encodeURIComponent(segUrl)}`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(body);
    }

    // For binary data (TS segments), pipe through
    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);

  } catch (err) {
    console.error('[stream proxy]', err.message);
    return res.status(502).json({ error: err.message });
  }
}
