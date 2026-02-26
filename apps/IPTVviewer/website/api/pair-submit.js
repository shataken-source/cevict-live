// POST /api/pair-submit — Phone submits provider credentials for a pairing code
import { submitPairConfig } from './_store.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { code, server, username, password, epg } = req.body || {};

  if (!code || !server || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields: code, server, username, password' });
  }

  const config = { server, username, password };
  if (epg) config.epg = epg;

  const result = submitPairConfig(String(code), config);
  if (!result.ok) {
    return res.status(404).json({ error: result.error });
  }
  return res.json({ ok: true, message: 'Config sent to TV. It should appear in a few seconds.' });
}
