// Vercel serverless proxy for Xtream Codes API
// Bypasses CORS — all calls from the browser go through here

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    action,
    server = process.env.IPTV_SERVER || '',
    username = process.env.IPTV_USER || '',
    password = process.env.IPTV_PASS || '',
    category_id,
    vod_id,
    series_id,
    stream_id,
    limit = '500',
    offset = '0',
  } = req.query;

  if (!server || !username || !password) {
    return res.status(400).json({ error: 'Missing credentials. Set server, username, and password in query params or IPTV_SERVER/IPTV_USER/IPTV_PASS env vars.' });
  }

  const base = `${server}/player_api.php?username=${username}&password=${password}`;

  try {
    let url;
    switch (action) {
      // ── AUTH / INFO ──────────────────────────────
      case 'get_user_info':
        url = base;
        break;

      // ── LIVE TV ──────────────────────────────────
      case 'get_live_categories':
        url = `${base}&action=get_live_categories`;
        break;

      case 'get_live_streams':
        url = category_id
          ? `${base}&action=get_live_streams&category_id=${category_id}`
          : `${base}&action=get_live_streams`;
        break;

      // ── VOD ──────────────────────────────────────
      case 'get_vod_categories':
        url = `${base}&action=get_vod_categories`;
        break;

      case 'get_vod_streams':
        url = category_id
          ? `${base}&action=get_vod_streams&category_id=${category_id}`
          : `${base}&action=get_vod_streams`;
        break;

      case 'get_vod_info':
        url = `${base}&action=get_vod_info&vod_id=${vod_id}`;
        break;

      // ── SERIES ───────────────────────────────────
      case 'get_series_categories':
        url = `${base}&action=get_series_categories`;
        break;

      case 'get_series':
        url = category_id
          ? `${base}&action=get_series&category_id=${category_id}`
          : `${base}&action=get_series`;
        break;

      case 'get_series_info':
        url = `${base}&action=get_series_info&series_id=${series_id}`;
        break;

      // ── EPG ──────────────────────────────────────
      case 'get_short_epg':
        url = `${base}&action=get_short_epg&stream_id=${stream_id}&limit=${limit}`;
        break;

      case 'get_simple_data_table':
        url = `${base}&action=get_simple_data_table&stream_id=${stream_id}`;
        break;

      // ── STREAM URL (returns redirect target) ─────
      case 'get_stream_url':
        // Return the HLS URL without proxying the stream itself
        return res.json({
          url: `${server}/live/${username}/${password}/${stream_id}.m3u8`,
          ts_url: `${server}/live/${username}/${password}/${stream_id}.ts`,
        });

      case 'get_vod_url':
        return res.json({
          url: `${server}/movie/${username}/${password}/${vod_id}.mp4`,
        });

      // ── M3U playlist ─────────────────────────────
      case 'get_m3u':
        url = `${server}/get.php?username=${username}&password=${password}&type=m3u_plus&output=ts`;
        const m3uRes = await fetch(url, { signal: AbortSignal.timeout(30000) });
        res.setHeader('Content-Type', 'application/x-mpegurl');
        return res.send(await m3uRes.text());

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    const upstream = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'SwitchbackTV/1.0' },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream error', status: upstream.status });
    }

    const data = await upstream.json();
    return res.json(data);

  } catch (err) {
    console.error('[iptv proxy]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
