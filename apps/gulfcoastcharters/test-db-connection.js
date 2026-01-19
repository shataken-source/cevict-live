#!/usr/bin/env node
/**
 * Database Connection Test Script
 * Purpose: Verify Supabase Postgres connection after password rotation
 * Usage: node test-db-connection.js
 * 
 * Prerequisites:
 * - npm install pg dotenv
 * - Ensure .env.local or .env file has SUPABASE_DB_URL or DATABASE_URL
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { Client } = require('pg');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`${'='.repeat(60)}`, 'cyan');
  log(` ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
}

async function testConnection(connectionString, label) {
  logSection(`Testing: ${label}`);
  
  if (!connectionString) {
    log('❌ Connection string not found', 'red');
    log(`   Missing environment variable for ${label}`, 'yellow');
    return false;
  }
  
  // Mask password in log
  const maskedUrl = connectionString.replace(/:([^@]+)@/, ':****@');
  log(`📍 Connection: ${maskedUrl}`, 'blue');
  
  const client = new Client({ connectionString });
  
  try {
    log('🔌 Connecting...', 'yellow');
    await client.connect();
    log('✅ Connection successful', 'green');
    
    // Test 1: Basic query
    log('🧪 Running test query: SELECT 1', 'yellow');
    const result1 = await client.query('SELECT 1 as test');
    log(`✅ Result: ${result1.rows[0].test}`, 'green');
    
    // Test 2: Check current time
    log('🧪 Running test query: SELECT NOW()', 'yellow');
    const result2 = await client.query('SELECT NOW() as current_time');
    log(`✅ Server time: ${result2.rows[0].current_time}`, 'green');
    
    // Test 3: Check database name
    log('🧪 Running test query: SELECT current_database()', 'yellow');
    const result3 = await client.query('SELECT current_database() as db_name');
    log(`✅ Database: ${result3.rows[0].db_name}`, 'green');
    
    // Test 4: Check if pg_cron extension exists (for gateway health)
    log('🧪 Checking pg_cron extension...', 'yellow');
    try {
      const result4 = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
        ) as has_pg_cron
      `);
      
      if (result4.rows[0].has_pg_cron) {
        log('✅ pg_cron extension found', 'green');
        
        // Try to query cron jobs
        try {
          const result5 = await client.query('SELECT COUNT(*) as job_count FROM cron.job');
          log(`✅ Cron jobs count: ${result5.rows[0].job_count}`, 'green');
        } catch (err) {
          log(`⚠️  Can't query cron.job table: ${err.message}`, 'yellow');
        }
      } else {
        log('⚠️  pg_cron extension not installed (this may be normal)', 'yellow');
      }
    } catch (err) {
      log(`⚠️  Error checking pg_cron: ${err.message}`, 'yellow');
    }
    
    // Test 5: Check connection info
    log('🧪 Checking connection details...', 'yellow');
    const result6 = await client.query(`
      SELECT 
        inet_server_addr() as server_ip,
        inet_server_port() as server_port,
        version() as pg_version
    `);
    log(`✅ Server IP: ${result6.rows[0].server_ip}`, 'green');
    log(`✅ Server Port: ${result6.rows[0].server_port}`, 'green');
    log(`✅ PostgreSQL: ${result6.rows[0].pg_version.split(',')[0]}`, 'green');
    
    await client.end();
    log('🔌 Disconnected', 'yellow');
    log('', 'reset');
    log('✅ ALL TESTS PASSED', 'green');
    
    return true;
    
  } catch (error) {
    log(`❌ Connection failed: ${error.message}`, 'red');
    
    // Provide troubleshooting tips
    if (error.message.includes('authentication failed')) {
      log('', 'reset');
      log('💡 Troubleshooting tips:', 'yellow');
      log('   1. Verify password in connection string is correct', 'reset');
      log('   2. Check if password needs URL encoding (special chars)', 'reset');
      log('   3. Ensure password was copied correctly from Supabase dashboard', 'reset');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEDOUT')) {
      log('', 'reset');
      log('💡 Troubleshooting tips:', 'yellow');
      log('   1. Check your internet connection', 'reset');
      log('   2. Verify the pooler URL is correct', 'reset');
      log('   3. Try using Transaction Pooler (port 6543) instead of Direct/Session', 'reset');
      log('   4. Check if your network blocks port 5432 or 6543', 'reset');
    } else if (error.message.includes('ECONNREFUSED')) {
      log('', 'reset');
      log('💡 Troubleshooting tips:', 'yellow');
      log('   1. Supabase project may be paused (check dashboard)', 'reset');
      log('   2. Wrong connection URL format', 'reset');
      log('   3. Network firewall blocking connection', 'reset');
    }
    
    try {
      await client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    
    return false;
  }
}

async function main() {
  log('', 'reset');
  log(`${'*'.repeat(60)}`, 'bright');
  log(' 🔐 SUPABASE DATABASE CONNECTION TESTER', 'bright');
  log(` Project: rdbuwyefbgnbuhmjrizo`, 'cyan');
  log(` Date: ${new Date().toISOString()}`, 'cyan');
  log(`${'*'.repeat(60)}`, 'bright');
  
  const connectionStrings = [
    {
      label: 'SUPABASE_DB_URL',
      url: process.env.SUPABASE_DB_URL
    },
    {
      label: 'DATABASE_URL',
      url: process.env.DATABASE_URL
    },
    {
      label: 'DIRECT_URL',
      url: process.env.DIRECT_URL
    },
    {
      label: 'POSTGRES_URL',
      url: process.env.POSTGRES_URL
    }
  ];
  
  let testedCount = 0;
  let successCount = 0;
  
  for (const conn of connectionStrings) {
    if (conn.url) {
      testedCount++;
      const success = await testConnection(conn.url, conn.label);
      if (success) successCount++;
      
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Final summary
  logSection('SUMMARY');
  log(`Total tested: ${testedCount}`, 'cyan');
  log(`Successful: ${successCount}`, successCount === testedCount ? 'green' : 'yellow');
  log(`Failed: ${testedCount - successCount}`, testedCount === successCount ? 'reset' : 'red');
  
  if (successCount === testedCount && testedCount > 0) {
    log('', 'reset');
    log('🎉 All database connections are working!', 'green');
    log('✅ Password rotation successful', 'green');
  } else if (successCount > 0) {
    log('', 'reset');
    log('⚠️  Some connections failed. Check the output above.', 'yellow');
  } else if (testedCount === 0) {
    log('', 'reset');
    log('❌ No connection strings found in environment variables', 'red');
    log('💡 Make sure you have .env.local or .env file with:', 'yellow');
    log('   SUPABASE_DB_URL or DATABASE_URL', 'reset');
  } else {
    log('', 'reset');
    log('❌ All connections failed. Password rotation may have issues.', 'red');
  }
  
  log('', 'reset');
  
  process.exit(testedCount === 0 || successCount < testedCount ? 1 : 0);
}

// Run the tests
main().catch(error => {
  log('', 'reset');
  log(`❌ Unexpected error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
