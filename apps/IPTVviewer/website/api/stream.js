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
    const allowedPaths = ['/live/', '/movie/', '/series/', '/xmltv.php', '/get.php', '/player_api.php', '/hls/', '/play/', '/streaming/', '/timeshift/', '/catchup/'];
    const allowedExts = ['.ts', '.m3u8', '.m3u', '.mp4', '.mkv', '.avi', '.key', '.aac', '.vtt', '.srt'];
    const isAllowed = allowedPaths.some(p => parsed.pathname.includes(p))
      || allowedExts.some(ext => parsed.pathname.endsWith(ext))
      || /\.\w{2,4}(\?|$)/.test(parsed.pathname); // allow any extension with query string
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

    // Detect m3u8 manifests by content-type OR URL extension
    const isM3u8 = (ct && (ct.includes('mpegurl') || ct.includes('m3u'))) || decoded.endsWith('.m3u8') || decoded.includes('.m3u8?');

    if (isM3u8) {
      let body = await upstream.text();

      // Use the FINAL URL after redirects (not the original) so absolute-path
      // segments like /hls/xxx.ts resolve against the correct server.
      const finalUrl = upstream.url || decoded;
      const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);
      const origin = new URL(finalUrl).origin;

      function resolveSegUrl(seg) {
        seg = seg.trim();
        if (seg.startsWith('http')) return seg;
        if (seg.startsWith('/')) return origin + seg;  // absolute path
        return baseUrl + seg;                          // relative path
      }

      function proxyUrl(raw) {
        return `/api/stream?url=${encodeURIComponent(resolveSegUrl(raw))}`;
      }

      // Rewrite ALL non-comment, non-empty lines (segments, sub-playlists, keys, etc.)
      body = body.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          // Rewrite URI="..." inside EXT-X-KEY and EXT-X-MAP tags
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
              return `URI="${proxyUrl(uri)}"`;
            });
          }
          return line;
        }
        // Non-comment line = segment or sub-playlist URL
        return proxyUrl(trimmed);
      }).join('\n');

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
