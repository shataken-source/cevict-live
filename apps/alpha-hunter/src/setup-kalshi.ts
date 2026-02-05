/**
 * KALSHI API SETUP HELPER
 * Helps configure your Kalshi API key properly
 *
 * Run: npm run setup-kalshi-key
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import crypto from 'crypto';

const envPath = path.join(process.cwd(), '.env.local');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║            🎯 KALSHI API SETUP HELPER 🎯                     ║
╚══════════════════════════════════════════════════════════════╝

This script helps you set up your Kalshi API credentials.

📋 BEFORE YOU START:
1. Log into your Kalshi account at https://kalshi.com
2. Go to Settings → API Keys
3. Create a new API key if you don't have one
4. Download the private key file (.pem file)
5. Copy the Key ID
`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  // Get Key ID
  const keyId = await question('\n📝 Enter your Kalshi API Key ID:\n> ');

  if (!keyId || keyId.length < 10) {
    console.log('❌ Invalid Key ID. It should look like: 8ccdb333-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    rl.close();
    return;
  }

  // Get Private Key
  console.log(`
📝 Enter your Private Key:
   You can either:
   A) Paste the path to your .pem file
   B) Paste the entire key contents (including BEGIN/END lines)

   NOTE: After pasting, press Enter twice to confirm.
`);

  let privateKey = '';
  let emptyLineCount = 0;

  console.log('> Paste your key (Enter twice when done):');

  for await (const line of rl) {
    if (line.trim() === '') {
      emptyLineCount++;
      if (emptyLineCount >= 1 && privateKey.length > 100) {
        break;
      }
    } else {
      emptyLineCount = 0;

      // Check if it's a file path
      if (line.endsWith('.pem') && fs.existsSync(line.trim())) {
        privateKey = fs.readFileSync(line.trim(), 'utf8');
        console.log('✅ Read key from file');
        break;
      }

      privateKey += line + '\n';
    }
  }

  rl.close();

  // Clean up the key
  privateKey = privateKey.trim();

  // Validate the key
  console.log('\n🔍 Validating key...');
  console.log(`   Key length: ${privateKey.length} characters`);

  if (privateKey.length < 1500) {
    console.log('❌ Key seems too short. RSA-2048 keys should be ~1700 characters.');
    console.log('   Make sure you copied the ENTIRE key including:');
    console.log('   -----BEGIN RSA PRIVATE KEY-----');
    console.log('   [base64 content - multiple lines]');
    console.log('   -----END RSA PRIVATE KEY-----');
    return;
  }

  // Test if the key can be loaded
  try {
    const keyObj = crypto.createPrivateKey(privateKey);
    console.log(`✅ Key is valid! Type: ${keyObj.asymmetricKeyType}, Bits: ${keyObj.asymmetricKeyDetails?.modulusLength || 'N/A'}`);
  } catch (err: any) {
    console.log(`❌ Key validation failed: ${err.message}`);
    console.log('   Please make sure the key is complete and properly formatted.');
    return;
  }

  // Escape the key for .env file (convert newlines to \n)
  const escapedKey = privateKey.replace(/\n/g, '\\n');

  // Read existing .env.local
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add Kalshi credentials
  const updateEnvVar = (content: string, key: string, value: string): string => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      return content.replace(regex, `${key}=${value}`);
    } else {
      return content + (content.endsWith('\n') ? '' : '\n') + `${key}=${value}\n`;
    }
  };

  envContent = updateEnvVar(envContent, 'KALSHI_API_KEY_ID', keyId.trim());
  envContent = updateEnvVar(envContent, 'KALSHI_PRIVATE_KEY', `"${escapedKey}"`);
  envContent = updateEnvVar(envContent, 'KALSHI_ENV', 'demo'); // Start with demo mode

  // Write the updated .env.local
  fs.writeFileSync(envPath, envContent);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║               ✅ KALSHI API CONFIGURED! ✅                   ║
╚══════════════════════════════════════════════════════════════╝

Your credentials have been saved to .env.local

🎯 NEXT STEPS:
1. Test the connection:
   npm run rebalance status

2. Start trading (DEMO mode by default):
   npm run kalshi

3. Production trading:
   This repo is intentionally DEMO-ONLY for Kalshi; do NOT set KALSHI_ENV=production.

⚠️  SECURITY REMINDER:
- Never share your private key
- Never commit .env.local to git
- The key is stored securely in your local file only
`);
}

main().catch(console.error);

