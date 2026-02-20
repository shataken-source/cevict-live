const crypto = require('crypto');
const fs = require('fs');

// Load env
const env = fs.readFileSync('.env.local', 'utf8');
let PRIVATE_KEY = '';
let inKey = false;
for (const line of env.split('\n')) {
  if (line.startsWith('KALSHI_PRIVATE_KEY=')) { 
    inKey = true; 
    PRIVATE_KEY = line.split('=').slice(1).join('=').trim() + '\n'; 
  }
  else if (inKey) { 
    if (line.trim() === '' || line.includes('=')) inKey = false; 
    else PRIVATE_KEY += line + '\n'; 
  }
}
PRIVATE_KEY = PRIVATE_KEY.trim();

console.log('Raw key analysis:');
console.log('Length:', PRIVATE_KEY.length);
console.log('Starts with:', JSON.stringify(PRIVATE_KEY.substring(0, 40)));
console.log('Ends with:', JSON.stringify(PRIVATE_KEY.slice(-40)));
console.log('Has BEGIN:', PRIVATE_KEY.includes('-----BEGIN'));
console.log('Has END:', PRIVATE_KEY.includes('-----END'));

// Check for Windows line endings
const hasCRLF = PRIVATE_KEY.includes('\r\n');
const hasLF = PRIVATE_KEY.includes('\n') && !hasCRLF;
console.log('Line endings:', hasCRLF ? 'CRLF' : hasLF ? 'LF' : 'none');

// Normalize to LF
let normalized = PRIVATE_KEY.replace(/\r\n/g, '\n');

// Extract base64 content between headers
const beginMatch = normalized.match(/-----BEGIN RSA PRIVATE KEY-----\n?([\s\S]*?)\n?-----END RSA PRIVATE KEY-----/);
if (beginMatch) {
  const base64Content = beginMatch[1].replace(/\s/g, '');
  console.log('\nBase64 content length:', base64Content.length);
  
  // Rebuild with proper 64-char lines
  const formatted = base64Content.match(/.{1,64}/g).join('\n');
  const reconstructed = `-----BEGIN RSA PRIVATE KEY-----\n${formatted}\n-----END RSA PRIVATE KEY-----`;
  
  console.log('\nReconstructed key preview:');
  console.log(reconstructed.split('\n').slice(0, 4).join('\n'));
  
  // Save to temp file and try signing
  const tempFile = 'C:\\temp\\kalshi_key_test.pem';
  fs.writeFileSync(tempFile, reconstructed);
  
  try {
    const msg = '1234567890GET/trade-api/v2/markets';
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(msg);
    sign.end();
    const signature = sign.sign({ 
      key: fs.readFileSync(tempFile), 
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING, 
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST 
    }).toString('base64');
    console.log('\n✅ Signing SUCCESS!');
    console.log('Signature length:', signature.length);
  } catch (e) {
    console.error('\n❌ Signing failed:', e.message);
  }
  
  // Cleanup
  try { fs.unlinkSync(tempFile); } catch {}
} else {
  console.log('Could not parse PEM structure');
}
