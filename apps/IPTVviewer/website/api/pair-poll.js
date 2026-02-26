// GET /api/pair-poll?code=1234 — TV app polls to check if credentials arrived
import { pollPairCode } from './_store.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing code parameter' });
  }

  const result = pollPairCode(String(code));

  if (!result.found) {
    return res.status(404).json({ error: result.error || 'Code not found or expired' });
  }

  if (!result.config) {
    // Still waiting for phone to submit
    return res.json({ status: 'waiting' });
  }

  // Config arrived
  return res.json({ status: 'ready', config: result.config });
}
