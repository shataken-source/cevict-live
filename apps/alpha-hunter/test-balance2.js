require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const crypto = require('crypto');
const https = require('https');

const apiKeyId = process.env.KALSHI_API_KEY_ID;
const rawKey = process.env.KALSHI_PRIVATE_KEY || '';
const baseUrl = 'https://api.elections.kalshi.com';

function reformatPem(pem) {
  const beginMatch = pem.match(/-----BEGIN ([^-]+)-----/);
  const endMatch = pem.match(/-----END ([^-]+)-----/);
  if (!beginMatch || !endMatch) return pem;
  const type = beginMatch[1];
  const b64 = pem.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '');
  const wrapped = (b64.match(/.{1,64}/g) ?? []).join('\n');
  return `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----`;
}

const privateKey = reformatPem(rawKey.replace(/\\n/g, '\n').replace(/"/g, '').trim());

// Validate key
try {
  crypto.createPrivateKey(privateKey);
  console.log('Key valid');
} catch (e) {
  console.log('Key INVALID:', e.message);
  process.exit(1);
}

function signRequest(method, path, useMs = true) {
  // Kalshi docs say milliseconds, but some versions use seconds
  const timestamp = useMs ? Date.now().toString() : Math.floor(Date.now() / 1000).toString();
  const pathOnly = path.split('?')[0];
  const msg = timestamp + method.toUpperCase() + pathOnly;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(msg);
  sign.end();
  const signature = sign.sign({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
  }).toString('base64');
  return { signature, timestamp };
}

function apiGet(path, useMs = true) {
  return new Promise((res, rej) => {
    const { signature, timestamp } = signRequest('GET', path, useMs);
    const url = new URL(baseUrl + path);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'KALSHI-ACCESS-KEY': apiKeyId,
        'KALSHI-ACCESS-SIGNATURE': signature,
        'KALSHI-ACCESS-TIMESTAMP': timestamp,
      }
    };
    const req = https.request(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try { res({ status: r.statusCode, body: JSON.parse(d) }); }
        catch { res({ status: r.statusCode, body: d }); }
      });
    });
    req.on('error', rej);
    req.end();
  });
}

async function main() {
  console.log('--- Try milliseconds timestamp ---');
  const bal1 = await apiGet('/trade-api/v2/portfolio/balance', true);
  console.log('Status:', bal1.status, JSON.stringify(bal1.body).slice(0, 120));

  console.log('\n--- Try seconds timestamp ---');
  const bal2 = await apiGet('/trade-api/v2/portfolio/balance', false);
  console.log('Status:', bal2.status, JSON.stringify(bal2.body).slice(0, 120));
}

main().catch(console.error);
