#!/usr/bin/env node
/**
 * Add News API Key to keys store
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prognoAppDir = path.resolve(__dirname, '..');
const baseDir = path.join(prognoAppDir, '.progno');
const filePath = path.join(baseDir, 'keys.json');

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

let keys = [];
if (fs.existsSync(filePath)) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    keys = JSON.parse(raw);
    if (!Array.isArray(keys)) {
      keys = [];
    }
  } catch (err) {
    console.warn('Could not read existing keys file, starting fresh');
    keys = [];
  }
}

const existingKeyIndex = keys.findIndex(k =>
  k.label?.toLowerCase() === 'news api key' ||
  k.label?.toLowerCase() === 'newsapi key'
);

const keyLabel = 'News API Key';
const keyValue =
  process.env.NEWS_API_KEY ||
  process.env.NEWSAPI_KEY ||
  process.argv[2];

if (!keyValue) {
  console.error('Missing News API key.');
  console.error('Usage: node scripts/add-news-api-key.mjs <NEWS_API_KEY>');
  console.error('Or set NEWS_API_KEY / NEWSAPI_KEY in your environment.');
  process.exit(1);
}

if (existingKeyIndex >= 0) {
  keys[existingKeyIndex].value = keyValue;
  keys[existingKeyIndex].createdAt = new Date().toISOString();
  console.log('✅ Updated existing News API Key');
} else {
  const newKey = {
    id: `key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label: keyLabel,
    value: keyValue,
    createdAt: new Date().toISOString()
  };
  keys.unshift(newKey);
  console.log('✅ Added new News API Key');
}

fs.writeFileSync(filePath, JSON.stringify(keys, null, 2), 'utf8');
console.log(`📝 Keys saved to: ${filePath}`);
console.log(`🔑 Key ID: ${keys.find(k => k.label === keyLabel)?.id}`);
console.log(`📋 Total keys: ${keys.length}`);
console.log(`\n✅ News API Key configured!`);
console.log(`   The system will now use NewsAPI.org for news collection.`);

