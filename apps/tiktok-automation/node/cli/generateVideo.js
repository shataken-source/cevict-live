/**
 * Generate Video CLI
 * 
 * Generates a video from PetReunion story using AI and ffmpeg
 */

const { loadConfig, getAccountConfig, loadSecrets } = require('../../config/loader');
const PetReunionFetcher = require('../../petreunion/fetcher');
const OpenAIClient = require('../../ai/openai-client');
const VideoGenerator = require('../../video/generator');
const path = require('path');
const fs = require('fs');
const { resolveProjectPath } = require('../../config/loader');

// Note: This is a placeholder - full video generation with ffmpeg would go here
// For now, this creates a simple text-based video or uses existing templates

async function main() {
  const args = process.argv.slice(2);
  const accountId = args.find(arg => arg.startsWith('--account'))?.split('=')[1] || 
                    args[args.indexOf('--account') + 1] || 
                    'primary';

  console.log(`\n🎬 Generate Video - Account: ${accountId}\n`);

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

  // Fetch PetReunion stories
  const fetcher = new PetReunionFetcher(config.petreunion.latestApiUrl);
  console.log('📡 Fetching PetReunion stories...');
  
  const stories = await fetcher.fetchLatestStories(config.petreunion.maxStoriesPerRun || 5);
  if (stories.length === 0) {
    console.log('⚠️  No stories found');
    process.exit(0);
  }

  console.log(`✅ Found ${stories.length} stories\n`);

  // Generate content for first story
  const story = fetcher.formatStoryForVideo(stories[0]);
  console.log(`📝 Processing story: ${story.title}`);

  const aiClient = new OpenAIClient(secrets.openai.apiKey);
  
  // Generate script and caption
  const script = await aiClient.generateVideoScript(story);
  const { caption, hashtags } = await aiClient.generateCaption(story, script);

  console.log('\n📄 Generated Script:');
  console.log(script);
  console.log('\n📝 Generated Caption:');
  console.log(caption);
  console.log('\n🏷️  Hashtags:', hashtags.join(', '));

  // Save generated content
  const videoFolder = resolveProjectPath(accountConfig.videoFolder);
  if (!fs.existsSync(videoFolder)) {
    fs.mkdirSync(videoFolder, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const contentFile = path.join(videoFolder, `story-${timestamp}.json`);
  
  const storyData = {
    story,
    script,
    caption,
    hashtags,
    generatedAt: new Date().toISOString(),
  };
  
  fs.writeFileSync(contentFile, JSON.stringify(storyData, null, 2));
  console.log(`\n✅ Content saved to: ${contentFile}`);

  // Generate video with ffmpeg
  console.log('\n🎬 Generating video...');
  try {
    const generator = new VideoGenerator(videoFolder);
    const videoPath = await generator.generateVideoWithImages(storyData, {
      width: 1080,
      height: 1920,
      duration: 30,
      fps: 30,
    });

    // Save video path in story data
    storyData.videoPath = videoPath;
    fs.writeFileSync(contentFile, JSON.stringify(storyData, null, 2));

    console.log(`\n✅ Video generated: ${videoPath}`);
    console.log(`\n📤 Ready to post! Run:`);
    console.log(`   node cli/post.js --account ${accountId} --video "${videoPath}"\n`);
  } catch (error) {
    console.error(`\n⚠️  Video generation failed: ${error.message}`);
    console.log('   Content saved - you can generate video manually or retry later.\n');
  }
}

main().catch(error => {
  console.error(`\n❌ Error: ${error.message}\n`);
  process.exit(1);
});
