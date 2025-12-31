import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const key = process.env.KALSHI_PRIVATE_KEY || '';
console.log('Key length:', key.length);
console.log('Has \\n:', key.includes('\\n'));
console.log('Has actual newline:', key.includes('\n'));
console.log('First 100 chars:', key.substring(0, 100));

const keyFixed = key.replace(/\\n/g, '\n');
console.log('\nAfter replace:');
console.log('Has newlines:', keyFixed.includes('\n'));
console.log('First 100 chars:', keyFixed.substring(0, 100));

import crypto from 'crypto';
try {
  const keyObj = crypto.createPrivateKey({ key: keyFixed, format: 'pem' });
  console.log('\n✅ Key parsed successfully!');
} catch (err: any) {
  console.log('\n❌ Key parse error:', err.message);
}
