// Vercel serverless proxy for short EPG per stream
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    stream_id,
    server = process.env.IPTV_SERVER || 'http://blogyfy.xyz',
    username = process.env.IPTV_USER || 'jascodezoriptv',
    password = process.env.IPTV_PASS || '19e993b7f5',
    limit = '4',
  } = req.query;

  if (!stream_id) return res.status(400).json({ error: 'stream_id required' });

  try {
    const url = `${server}/player_api.php?username=${username}&password=${password}&action=get_short_epg&stream_id=${stream_id}&limit=${limit}`;
    const upstream = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await upstream.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message, epg_listings: [] });
  }
}
