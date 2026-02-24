#!/usr/bin/env node

/**
 * Automated Setup Script for Charter Booking Platform
 * This script checks requirements and guides you through the setup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🎣 Gulf Coast Charters - Automated Setup\n');
console.log('========================================\n');

// Step 1: Check Node.js version
console.log('✓ Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required. You have:', nodeVersion);
  console.log('   Please upgrade: https://nodejs.org/');
  process.exit(1);
}
console.log(`  ✓ Node.js ${nodeVersion} detected\n`);

// Step 2: Check for .env.local file
console.log('✓ Checking environment configuration...');
if (!fs.existsSync('.env.local')) {
  console.log('  ⚠️  .env.local not found. Creating from template...');
  fs.copyFileSync('.env.local.example', '.env.local');
  console.log('  ✓ .env.local created');
  console.log('  ⚠️  IMPORTANT: Update .env.local with your Supabase credentials!');
  console.log('     Get them from: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/api\n');
} else {
  console.log('  ✓ .env.local found\n');
}

// Step 3: Check if Supabase credentials are configured
const envContent = fs.readFileSync('.env.local', 'utf8');
if (envContent.includes('your_anon_key_here') || envContent.includes('your_service_role_key_here')) {
  console.log('⚠️  WARNING: Supabase credentials not configured!');
  console.log('   Please update .env.local with your actual credentials before running the app.\n');
}

// Step 4: Check package.json
console.log('✓ Checking package.json...');
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found!');
  process.exit(1);
}
console.log('  ✓ package.json found\n');

// Step 5: Install dependencies
console.log('✓ Installing dependencies...');
console.log('  This may take a few minutes...\n');

try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('\n  ✓ Dependencies installed successfully\n');
} catch (error) {
  console.error('❌ Failed to install dependencies');
  console.error('   Please run: npm install');
  process.exit(1);
}

// Step 6: Check for database setup
console.log('✓ Database setup reminder...');
console.log('  Have you run COMPLETE_DATABASE_SETUP.sql in Supabase?');
console.log('  If not, follow these steps:');
console.log('  1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/sql');
console.log('  2. Open: COMPLETE_DATABASE_SETUP.sql');
console.log('  3. Copy and paste the entire file');
console.log('  4. Click "Run" and wait for completion\n');

// Step 7: Final instructions
console.log('========================================');
console.log('✅ SETUP COMPLETE!\n');
console.log('Next steps:');
console.log('1. Update .env.local with your Supabase credentials');
console.log('2. Run the database setup SQL (see instructions above)');
console.log('3. Start the dev server: npm run dev');
console.log('4. Open http://localhost:3000 in your browser\n');
console.log('For detailed instructions, see README.md');
console.log('========================================\n');
console.log('🚀 Happy fishing! 🎣\n');
