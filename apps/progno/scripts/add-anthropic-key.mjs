#!/usr/bin/env node
/**
 * Add Anthropic API Key to keys store
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
  k.label?.toLowerCase() === 'anthropic api key' ||
  k.label?.toLowerCase() === 'anthropic key' ||
  k.label?.toLowerCase() === 'claude api key'
);

// Get key from command line argument or use the provided one
const keyValue = process.argv[2] || 'sk-ant-api03-TFS...TAAA';
const keyLabel = 'Anthropic API Key';

if (existingKeyIndex >= 0) {
  keys[existingKeyIndex].value = keyValue;
  keys[existingKeyIndex].createdAt = new Date().toISOString();
  console.log('✅ Updated existing Anthropic API Key');
} else {
  const newKey = {
    id: `key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label: keyLabel,
    value: keyValue,
    createdAt: new Date().toISOString()
  };
  keys.unshift(newKey);
  console.log('✅ Added new Anthropic API Key');
}

fs.writeFileSync(filePath, JSON.stringify(keys, null, 2), 'utf8');
console.log(`📝 Keys saved to: ${filePath}`);
console.log(`🔑 Key ID: ${keys.find(k => k.label === keyLabel)?.id}`);
console.log(`📋 Total keys: ${keys.length}`);

