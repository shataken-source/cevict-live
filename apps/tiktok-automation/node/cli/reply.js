/**
 * Reply to Comments CLI
 * 
 * Automatically replies to TikTok comments using AI
 */

const { loadConfig, getAccountConfig, loadSecrets } = require('../../config/loader');
const TikTokBrowser = require('../../tiktok/browser');
const OpenAIClient = require('../../ai/openai-client');
const CookieManager = require('../../auth/cookie-manager');
const StateManager = require('../../services/state-manager');
const { retry, RateLimiter } = require('../../services/retry');
const fs = require('fs');
const { resolveProjectPath } = require('../../config/loader');
const path = require('path');


async function main() {
  const args = process.argv.slice(2);
  const accountId = args.find(arg => arg.startsWith('--account'))?.split('=')[1] || 
                    args[args.indexOf('--account') + 1] || 
                    'primary';
  const videoUrl = args.find(arg => arg.startsWith('--video'))?.split('=')[1] || 
                   args[args.indexOf('--video') + 1];

  console.log(`\n💬 Reply to Comments - Account: ${accountId}\n`);

  if (!videoUrl) {
    console.error('❌ Error: --video URL is required');
    console.error('   Usage: node cli/reply.js --account primary --video https://tiktok.com/@user/video/123');
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

  const secrets = loadSecrets();
  if (!secrets.openai?.apiKey) {
    console.error('❌ Error: OpenAI API key not found in secrets');
    process.exit(1);
  }

  // Check if logged in
  if (!CookieManager.hasCookies(accountConfig.cookiesFile)) {
    console.error('❌ Error: Not logged in. Run login first:');
    console.error(`   node cli/login.js --account ${accountId}`);
    process.exit(1);
  }

  // Load state manager
  const stateManager = new StateManager(accountConfig.repliedStateFile);
  const rateLimiter = new RateLimiter(10, 60000); // Max 10 replies per minute

  // Initialize browser and AI
  const browser = new TikTokBrowser(config, accountConfig);
  const aiClient = new OpenAIClient(secrets.openai.apiKey);
  
  try {
    await browser.initialize();
    
    // Get comments
    console.log('📥 Fetching comments...');
    const comments = await browser.getComments(videoUrl);
    console.log(`✅ Found ${comments.length} comments\n`);

    // Filter out already replied comments
    const newComments = comments.filter(c => !stateManager.hasRepliedToComment(c.id));
    
    if (newComments.length === 0) {
      console.log('✅ No new comments to reply to\n');
      stateManager.updateLastChecked();
      return;
    }

    console.log(`💬 Processing ${newComments.length} new comments...\n`);

    // For each comment, generate and post reply
    for (const comment of newComments.slice(0, 10)) { // Limit to 10 per run
      try {
        // Rate limiting
        await rateLimiter.waitIfNeeded();

        console.log(`📝 Comment: "${comment.text.substring(0, 50)}..."`);
        
        // Generate reply (using a generic story context for now)
        const story = {
          petType: 'Pet',
          location: 'Unknown',
          status: 'missing',
        };
        
        // Retry reply generation with exponential backoff
        const reply = await retry(
          () => aiClient.generateCommentReply(comment.text, story),
          { maxRetries: 3, initialDelay: 1000 }
        );
        console.log(`   Reply: "${reply}"`);

        // Retry posting reply
        await retry(
          () => browser.replyToComment(comment.id, reply),
          { maxRetries: 3, initialDelay: 2000 }
        );
        
        // Mark as replied
        stateManager.markCommentReplied(comment.id);
        console.log('   ✅ Replied\n');
        
      } catch (error) {
        console.error(`   ❌ Failed to reply: ${error.message}\n`);
      }
    }

    stateManager.updateLastChecked();
    stateManager.cleanup(); // Keep state file manageable

    console.log('✅ Reply session complete\n');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
