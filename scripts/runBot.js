#!/usr/bin/env node

/**
 * Script to run the daily bot
 * 
 * This script can be run directly or via cron job
 * Usage: node scripts/runBot.js
 */

const https = require('https');
const http = require('http');

// Configuration
const BOT_URL = process.env.BOT_URL || 'http://localhost:3000/api/bot/run';
const BOT_API_KEY = process.env.BOT_API_KEY || 'your-secret-bot-key';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Make HTTP request to bot API
 */
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Main function to run the bot
 */
async function runBot() {
  console.log(`🤖 Starting daily bot run (${NODE_ENV})`);
  console.log(`📡 Calling bot API: ${BOT_URL}`);
  
  try {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BOT_API_KEY}`
      },
      body: JSON.stringify({
        config: {
          enableLawUpdates: true,
          enableDataCleanup: true,
          enableNotifications: true,
          enableAnalytics: true,
          logLevel: NODE_ENV === 'production' ? 'info' : 'debug'
        }
      })
    };

    const startTime = Date.now();
    const response = await makeRequest(BOT_URL, options);
    const duration = Date.now() - startTime;

    console.log(`✅ Bot completed in ${duration}ms`);
    console.log(`📊 Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const result = response.data;
      console.log(`📈 Results:`);
      console.log(`   - Success: ${result.success}`);
      console.log(`   - Duration: ${result.duration}ms`);
      console.log(`   - Total Updated: ${result.summary.totalUpdated}`);
      console.log(`   - Errors: ${result.summary.errorsCount}`);
      
      if (result.results.lawUpdates) {
        console.log(`   - Laws Updated: ${result.results.lawUpdates.updated}`);
        console.log(`   - New Laws: ${result.results.lawUpdates.new}`);
      }
      
      if (result.results.dataCleanup) {
        console.log(`   - Items Cleaned: ${result.results.dataCleanup.cleaned}`);
      }
      
      if (result.results.notifications) {
        console.log(`   - Notifications Sent: ${result.results.notifications.sent}`);
      }
      
      if (result.errors.length > 0) {
        console.log(`⚠️  Errors:`);
        result.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
      }
    } else {
      console.log(`❌ Bot failed with status ${response.statusCode}`);
      console.log(`Response:`, response.data);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`💥 Bot execution failed:`, error);
    process.exit(1);
  }
}

/**
 * Get bot status
 */
async function getBotStatus() {
  console.log(`📊 Getting bot status...`);
  
  try {
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BOT_API_KEY}`
      }
    };

    const response = await makeRequest(BOT_URL, options);
    
    if (response.statusCode === 200) {
      const status = response.data;
      console.log(`📈 Bot Status:`);
      console.log(`   - Status: ${status.status}`);
      console.log(`   - Last Run: ${status.lastRun?.timestamp || 'Never'}`);
      console.log(`   - Last Run Duration: ${status.lastRun?.duration || 0}ms`);
      console.log(`   - Recent Runs: ${status.recentRuns?.length || 0}`);
      
      if (status.lastRun?.errors?.length > 0) {
        console.log(`⚠️  Last Run Errors:`);
        status.lastRun.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
      }
    } else {
      console.log(`❌ Failed to get status: ${response.statusCode}`);
      console.log(`Response:`, response.data);
    }
    
  } catch (error) {
    console.error(`💥 Status check failed:`, error);
  }
}

// Command line arguments
const command = process.argv[2];

if (command === 'status') {
  getBotStatus();
} else if (command === 'run' || !command) {
  runBot();
} else {
  console.log('Usage:');
  console.log('  node scripts/runBot.js [run|status]');
  console.log('');
  console.log('Commands:');
  console.log('  run     - Run the daily bot (default)');
  console.log('  status  - Get bot status and recent runs');
  process.exit(1);
}
