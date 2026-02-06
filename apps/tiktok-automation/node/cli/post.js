/**
 * TikTok Post CLI
 * 
 * Posts a video to TikTok
 */

const { loadConfig, getAccountConfig, loadSecrets } = require('../../config/loader');
const TikTokBrowser = require('../../tiktok/browser');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  const accountId = args.find(arg => arg.startsWith('--account'))?.split('=')[1] || 
                    args[args.indexOf('--account') + 1] || 
                    'primary';
  const videoPath = args.find(arg => arg.startsWith('--video'))?.split('=')[1] || 
                    args[args.indexOf('--video') + 1];

  console.log(`\n📤 TikTok Post - Account: ${accountId}\n`);

  if (!videoPath) {
    console.error('❌ Error: --video path is required');
    console.error('   Usage: node cli/post.js --account primary --video path/to/video.mp4');
    process.exit(1);
  }

  // Load config
  const config = loadConfig();
  if (!config) {
    process.exit(1);
  }

  const accountConfig = getAccountConfig(config, accountId);
  if (!accountConfig) {
    process.exit(1);
  }

  // Check if logged in
  const CookieManager = require('../../auth/cookie-manager');
  if (!CookieManager.hasCookies(accountConfig.cookiesFile)) {
    console.error('❌ Error: Not logged in. Run login first:');
    console.error(`   node cli/login.js --account ${accountId}`);
    process.exit(1);
  }

  // Initialize browser
  const browser = new TikTokBrowser(config, accountConfig);
  
  try {
    await browser.initialize();
    await browser.goToUpload();
    
    // For now, use video filename as caption (can be enhanced with AI)
    const videoName = path.basename(videoPath, path.extname(videoPath));
    const caption = `#LostPet #PetReunion ${videoName}`;
    
    await browser.uploadVideo(videoPath, caption);
    
    console.log('\n✅ Video posted successfully!\n');
  } catch (error) {
    console.error(`\n❌ Post failed: ${error.message}\n`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
