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
    const allowedPaths = ['/live/', '/movie/', '/series/', '/xmltv.php', '/get.php', '/player_api.php', '/hls/'];
    const allowedExts = ['.ts', '.m3u8', '.m3u', '.mp4', '.mkv', '.avi'];
    const isAllowed = allowedPaths.some(p => parsed.pathname.includes(p))
      || allowedExts.some(ext => parsed.pathname.endsWith(ext));
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

      // Use the FINAL URL after redirects (not the original) so absolute-path
      // segments like /hls/xxx.ts resolve against the correct server.
      const finalUrl = upstream.url || decoded;
      const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
      const origin = new URL(finalUrl).origin;

      function resolveSegUrl(seg) {
        if (seg.startsWith('http')) return seg;
        if (seg.startsWith('/')) return origin + seg;  // absolute path
        return baseUrl + seg;                          // relative path
      }

      body = body.replace(/^(?!#)(\S+\.ts.*)$/gm, (match) => {
        return `/api/stream?url=${encodeURIComponent(resolveSegUrl(match))}`;
      });
      // Also rewrite any nested m3u8 references (multi-quality streams)
      body = body.replace(/^(?!#)(\S+\.m3u8.*)$/gm, (match) => {
        return `/api/stream?url=${encodeURIComponent(resolveSegUrl(match))}`;
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
