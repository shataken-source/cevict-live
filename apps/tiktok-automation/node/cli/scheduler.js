/**
 * Scheduler CLI
 * 
 * Runs scheduled tasks: daily posts, hourly replies, Q&A every 2 hours
 */

const cron = require('node-cron');
const { loadConfig, getAccountConfig, loadSecrets } = require('../../config/loader');
const { exec } = require('child_process');
const path = require('path');
const { resolveProjectPath } = require('../../config/loader');

/**
 * Parse time string (HH:MM) and return cron expression for daily execution
 */
function parseDailyTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return `${minutes} ${hours} * * *`; // cron: minute hour day month weekday
}

/**
 * Run a CLI command
 */
function runCommand(command, accountId) {
  return new Promise((resolve, reject) => {
    const fullCommand = `node ${path.join(__dirname, command)} --account ${accountId}`;
    console.log(`\n🔄 Running: ${fullCommand}`);
    
    exec(fullCommand, { cwd: path.resolve(__dirname, '..') }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        reject(error);
      } else {
        console.log(stdout);
        if (stderr) console.error(stderr);
        resolve();
      }
    });
  });
}

async function main() {
  console.log('\n⏰ TikTok Automation Scheduler\n');

  // Load config
  const config = loadConfig();
  if (!config) {
    process.exit(1);
  }

  // Schedule tasks for each account
  for (const account of config.accounts) {
    console.log(`📅 Scheduling tasks for account: ${account.id}\n`);

    // Daily post
    if (account.schedule?.dailyPostTimeCST) {
      const cronExpr = parseDailyTime(account.schedule.dailyPostTimeCST);
      cron.schedule(cronExpr, async () => {
        console.log(`\n📤 Daily post scheduled for ${account.id}`);
        try {
          // First generate video, then post
          await runCommand('generateVideo.js', account.id);
          // Note: Would need to find the generated video and post it
          // For now, this is a placeholder
        } catch (error) {
          console.error(`Failed daily post for ${account.id}:`, error.message);
        }
      });
      console.log(`   ✅ Daily post: ${account.schedule.dailyPostTimeCST} CST`);
    }

    // Hourly replies
    if (account.schedule?.hourlyReplies) {
      cron.schedule('0 * * * *', async () => {
        console.log(`\n💬 Hourly reply check for ${account.id}`);
        // Note: Would need video URLs to check - this is a placeholder
        // In production, you'd maintain a list of your video URLs
      });
      console.log(`   ✅ Hourly replies: enabled`);
    }

    // Q&A every N hours
    if (account.schedule?.qaEveryHours) {
      const hours = account.schedule.qaEveryHours;
      cron.schedule(`0 */${hours} * * *`, async () => {
        console.log(`\n❓ Q&A check for ${account.id} (every ${hours} hours)`);
        try {
          await runCommand('qa.js', account.id);
        } catch (error) {
          console.error(`Failed Q&A for ${account.id}:`, error.message);
        }
      });
      console.log(`   ✅ Q&A: every ${hours} hours`);
    }
  }

  console.log('\n✅ Scheduler started. Press Ctrl+C to stop.\n');
  console.log('📊 Tasks will run according to schedule above.\n');

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Scheduler stopped.\n');
    process.exit(0);
  });
}

main().catch(error => {
  console.error(`\n❌ Scheduler error: ${error.message}\n`);
  process.exit(1);
});
