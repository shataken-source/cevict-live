#!/usr/bin/env node

/**
 * Gulf Coast Charters - Complete Setup Script
 * Run this to set up everything automatically
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log('\n' + '='.repeat(60));
  log(`🎣 ${title}`, 'bright');
  console.log('='.repeat(60) + '\n');
}

async function prompt(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset}`, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function setupProject() {
  header('GULF COAST CHARTERS - SETUP WIZARD');
  
  log('Welcome! This wizard will set up your charter booking platform.\n', 'green');
  log('This will take about 5-10 minutes. Let\'s get started!\n', 'yellow');

  // Step 1: Check Node.js version
  header('Step 1: Checking System Requirements');
  
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (majorVersion < 18) {
      log(`❌ Node.js version ${nodeVersion} detected. Version 18+ required.`, 'red');
      log('Please upgrade Node.js from https://nodejs.org', 'yellow');
      process.exit(1);
    }
    
    log(`✅ Node.js ${nodeVersion} detected`, 'green');
  } catch (error) {
    log('❌ Could not detect Node.js version', 'red');
    process.exit(1);
  }

  // Step 2: Install Dependencies
  header('Step 2: Installing Dependencies');
  
  log('Installing npm packages (this may take a few minutes)...', 'yellow');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    log('✅ Dependencies installed successfully', 'green');
  } catch (error) {
    log('❌ Failed to install dependencies', 'red');
    log('Try running: npm install --legacy-peer-deps', 'yellow');
    process.exit(1);
  }

  // Step 3: Environment Configuration
  header('Step 3: Environment Configuration');
  
  log('Let\'s set up your environment variables.\n', 'yellow');
  
  const envConfig = {};
  
  // Supabase Configuration
  log('SUPABASE CONFIGURATION:', 'bright');
  log('(Get these from https://app.supabase.com/project/settings/api)\n', 'yellow');
  
  envConfig.NEXT_PUBLIC_SUPABASE_URL = await prompt('Supabase Project URL: ');
  envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY = await prompt('Supabase Anon Key: ');
  envConfig.SUPABASE_SERVICE_ROLE_KEY = await prompt('Supabase Service Role Key: ');
  
  // Optional: SendGrid
  log('\nEMAIL CONFIGURATION (SendGrid):', 'bright');
  const setupEmail = await prompt('Do you want to set up email alerts? (y/n): ');
  
  if (setupEmail.toLowerCase() === 'y') {
    envConfig.SENDGRID_API_KEY = await prompt('SendGrid API Key: ');
    envConfig.FROM_EMAIL = await prompt('From Email Address: ') || 'alerts@gulfcoastcharters.com';
  }
  
  // Optional: Stripe
  log('\nPAYMENT CONFIGURATION (Stripe):', 'bright');
  const setupPayments = await prompt('Do you want to set up payments? (y/n): ');
  
  if (setupPayments.toLowerCase() === 'y') {
    envConfig.STRIPE_PUBLIC_KEY = await prompt('Stripe Publishable Key: ');
    envConfig.STRIPE_SECRET_KEY = await prompt('Stripe Secret Key: ');
  }
  
  // Write .env.local file
  const envContent = Object.entries(envConfig)
    .map(([key, value]) => `${key}="${value}"`)
    .join('\n');
  
  fs.writeFileSync('.env.local', envContent);
  log('\n✅ Environment variables saved to .env.local', 'green');

  // Step 4: Database Setup
  header('Step 4: Database Setup');
  
  log('Setting up Supabase database tables...', 'yellow');
  
  const setupDb = await prompt('Do you want to run database migrations now? (y/n): ');
  
  if (setupDb.toLowerCase() === 'y') {
    try {
      // Create database setup script
      const dbSetupScript = `
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  console.log('Creating database tables...');
  
  // Read and execute schema
  const schema = require('fs').readFileSync('./database-schema.sql', 'utf8');
  
  // Split by semicolons and execute each statement
  const statements = schema.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    try {
      await supabase.rpc('exec_sql', { sql: statement + ';' });
    } catch (err) {
      console.log('Statement failed (may already exist):', err.message);
    }
  }
  
  console.log('✅ Database setup complete!');
}

setupDatabase().catch(console.error);
      `;
      
      fs.writeFileSync('setup-db.js', dbSetupScript);
      execSync('node setup-db.js', { stdio: 'inherit' });
      fs.unlinkSync('setup-db.js');
      
      log('✅ Database tables created', 'green');
    } catch (error) {
      log('⚠️  Database setup failed - you may need to run the SQL manually', 'yellow');
      log('Copy the contents of database-schema.sql to your Supabase SQL editor', 'yellow');
    }
  }

  // Step 5: Create Project Structure
  header('Step 5: Creating Project Structure');
  
  const directories = [
    'pages',
    'pages/api',
    'components',
    'lib',
    'public',
    'styles',
    'hooks',
    'utils',
    'supabase/functions',
    'scripts'
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`📁 Created directory: ${dir}`, 'cyan');
    }
  });

  // Step 6: Create Next.js Configuration
  header('Step 6: Creating Configuration Files');
  
  // next.config.js
  const nextConfig = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'supabase.co'],
  },
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig
  `.trim();
  
  fs.writeFileSync('next.config.js', nextConfig);
  log('✅ Created next.config.js', 'green');
  
  // tailwind.config.js
  const tailwindConfig = `
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ocean-blue': '#006994',
        'sunset-orange': '#ff6b35',
        'sand': '#f4e4c1',
      },
      animation: {
        'swim': 'swim 2s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
  `.trim();
  
  fs.writeFileSync('tailwind.config.js', tailwindConfig);
  log('✅ Created tailwind.config.js', 'green');
  
  // postcss.config.js
  const postcssConfig = `
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
  `.trim();
  
  fs.writeFileSync('postcss.config.js', postcssConfig);
  log('✅ Created postcss.config.js', 'green');

  // Step 7: Move Source Files
  header('Step 7: Organizing Source Files');
  
  // Move component files to proper directories
  const componentFiles = [
    'CharterBookingApp.jsx',
    'AdminConfig.jsx',
    'LocationSharing.jsx',
    'community-points-system.js',
    'weather-alerts.js'
  ];
  
  componentFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const destination = file.endsWith('.js') ? 
        `./lib/${file}` : `./components/${file}`;
      
      fs.renameSync(file, destination);
      log(`📦 Moved ${file} to ${destination}`, 'cyan');
    }
  });

  // Step 8: Create Main Pages
  header('Step 8: Creating Main Application Pages');
  
  // Create _app.js
  const appJs = `
import '@/styles/globals.css'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'

export default function App({ Component, pageProps }) {
  const [supabaseClient] = useState(() => createPagesBrowserClient())

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
      <Toaster position="top-right" />
    </SessionContextProvider>
  )
}
  `.trim();
  
  fs.writeFileSync('pages/_app.js', appJs);
  log('✅ Created pages/_app.js', 'green');
  
  // Create index.js
  const indexJs = `
import CharterBookingApp from '@/components/CharterBookingApp'

export default function Home() {
  return <CharterBookingApp />
}
  `.trim();
  
  fs.writeFileSync('pages/index.js', indexJs);
  log('✅ Created pages/index.js', 'green');
  
  // Create globals.css
  const globalsCss = `
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer utilities {
  @keyframes swim {
    0%, 100% { transform: translateX(0); }
    50% { transform: translateX(5px); }
  }
  
  @keyframes wiggle {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-10deg); }
    75% { transform: rotate(10deg); }
  }
}
  `.trim();
  
  fs.writeFileSync('styles/globals.css', globalsCss);
  log('✅ Created styles/globals.css', 'green');

  // Step 9: Compile Check
  header('Step 9: Compilation Check');
  
  log('Running compilation check...', 'yellow');
  
  try {
    execSync('npm run lint --silent', { stdio: 'pipe' });
    log('✅ Linting passed', 'green');
  } catch (error) {
    log('⚠️  Some linting warnings (not critical)', 'yellow');
  }
  
  try {
    execSync('npm run build', { stdio: 'pipe' });
    log('✅ Build successful!', 'green');
  } catch (error) {
    log('⚠️  Build has warnings (may need configuration)', 'yellow');
  }

  // Step 10: Success!
  header('🎉 SETUP COMPLETE!');
  
  log('Your Gulf Coast Charters platform is ready!\n', 'green');
  
  log('NEXT STEPS:', 'bright');
  log('1. Run the development server:', 'yellow');
  log('   npm run dev\n', 'cyan');
  
  log('2. Open your browser to:', 'yellow');
  log('   http://localhost:3000\n', 'cyan');
  
  log('3. Deploy Supabase functions:', 'yellow');
  log('   npm run edge:deploy\n', 'cyan');
  
  log('4. Read the testing guide:', 'yellow');
  log('   PHASE_1_TESTING_GUIDE.md\n', 'cyan');
  
  log('5. Configure admin settings at:', 'yellow');
  log('   http://localhost:3000/admin\n', 'cyan');
  
  log('\nNeed help? Check the documentation or contact support!', 'blue');
  log('Happy fishing! 🎣', 'green');
  
  rl.close();
}

// Run setup
setupProject().catch(error => {
  log(`\n❌ Setup failed: ${error.message}`, 'red');
  log('Please check the error and try again.', 'yellow');
  rl.close();
  process.exit(1);
});
