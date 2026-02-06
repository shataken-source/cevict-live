/**
 * TikTok Login CLI
 * 
 * Manual login flow - saves cookies for future use
 */

const { loadConfig, getAccountConfig } = require('../../config/loader');
const TikTokBrowser = require('../../tiktok/browser');

async function main() {
  const args = process.argv.slice(2);
  const accountId = args.find(arg => arg.startsWith('--account'))?.split('=')[1] || 
                    args[args.indexOf('--account') + 1] || 
                    'primary';

  console.log(`\n🔐 TikTok Login - Account: ${accountId}\n`);

  // Load config
  const config = loadConfig();
  if (!config) {
    process.exit(1);
  }

  const accountConfig = getAccountConfig(config, accountId);
  if (!accountConfig) {
    process.exit(1);
  }

  // Initialize browser
  const browser = new TikTokBrowser(config, accountConfig);
  
  try {
    await browser.initialize();
    await browser.goToLogin();
    await browser.waitForLogin();
    
    console.log('\n✅ Login successful! Cookies saved.');
    console.log(`   You can now use other commands with --account ${accountId}\n`);
  } catch (error) {
    console.error(`\n❌ Login failed: ${error.message}\n`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
