/**
 * Video Generator
 * 
 * Generates videos from PetReunion stories using ffmpeg
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { resolveProjectPath } = require('../config/loader');

class VideoGenerator {
  constructor(outputDir) {
    this.outputDir = resolveProjectPath(outputDir);
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate video from story data
   * @param {object} storyData - Story object with script, caption, images, etc.
   * @param {object} options - Generation options
   * @returns {Promise<string>} Path to generated video
   */
  async generateVideo(storyData, options = {}) {
    const {
      width = 1080,
      height = 1920, // TikTok vertical format
      duration = 30, // seconds
      fps = 30,
    } = options;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(this.outputDir, `video-${timestamp}.mp4`);

    return new Promise((resolve, reject) => {
      // Create a simple text-based video with the story information
      // This is a basic implementation - can be enhanced with images, animations, etc.
      
      const text = this.formatStoryText(storyData);
      
      // Use ffmpeg to create a video with text overlay
      const command = ffmpeg()
        .input('color=c=black:s=' + width + 'x' + height + ':d=' + duration)
        .inputFormat('lavfi')
        .videoCodec('libx264')
        .outputOptions([
          '-pix_fmt yuv420p',
          '-r ' + fps,
          `-vf "drawtext=text='${this.escapeText(text)}':fontfile=/Windows/Fonts/arial.ttf:fontsize=60:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5:boxborderw=10"`
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('🎬 Starting video generation...');
          console.log(`   Command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            process.stdout.write(`\r   Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log(`\n✅ Video generated: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error(`\n❌ Video generation failed: ${error.message}`);
          reject(error);
        });

      command.run();
    });
  }

  /**
   * Format story text for video display
   */
  formatStoryText(storyData) {
    const lines = [];
    
    if (storyData.story) {
      lines.push(storyData.story.title || 'Lost Pet Alert');
      lines.push('');
      if (storyData.story.petType) {
        lines.push(`Type: ${storyData.story.petType}`);
      }
      if (storyData.story.location) {
        lines.push(`Location: ${storyData.story.location}`);
      }
      lines.push('');
      if (storyData.script) {
        // Use first 2-3 sentences of script
        const sentences = storyData.script.split(/[.!?]+/).filter(s => s.trim()).slice(0, 3);
        lines.push(...sentences.map(s => s.trim()));
      }
    }
    
    return lines.join('\\n');
  }

  /**
   * Escape text for ffmpeg drawtext filter
   */
  escapeText(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/:/g, '\\:');
  }

  /**
   * Generate video with images (if available)
   * @param {object} storyData - Story with images array
   * @param {object} options - Generation options
   * @returns {Promise<string>} Path to generated video
   */
  async generateVideoWithImages(storyData, options = {}) {
    const {
      width = 1080,
      height = 1920,
      duration = 30,
      fps = 30,
    } = options;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(this.outputDir, `video-${timestamp}.mp4`);

    // If story has images, use first image as background
    if (storyData.story?.images && storyData.story.images.length > 0) {
      const imageUrl = storyData.story.images[0];
      // Download image if it's a URL, or use local path
      const imagePath = imageUrl.startsWith('http') 
        ? await this.downloadImage(imageUrl)
        : resolveProjectPath(imageUrl);

      if (fs.existsSync(imagePath)) {
        return this.generateVideoFromImage(imagePath, storyData, outputPath, options);
      }
    }

    // Fallback to text-only video
    return this.generateVideo(storyData, options);
  }

  /**
   * Generate video from image
   */
  async generateVideoFromImage(imagePath, storyData, outputPath, options) {
    const { width = 1080, height = 1920, duration = 30, fps = 30 } = options;
    const text = this.formatStoryText(storyData);

    return new Promise((resolve, reject) => {
      ffmpeg(imagePath)
        .inputOptions([
          '-loop', '1',
          '-t', duration.toString(),
        ])
        .videoCodec('libx264')
        .outputOptions([
          '-pix_fmt yuv420p',
          '-r ' + fps,
          `-vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,drawtext=text='${this.escapeText(text)}':fontfile=/Windows/Fonts/arial.ttf:fontsize=50:fontcolor=white:x=(w-text_w)/2:y=h-th-50:box=1:boxcolor=black@0.7:boxborderw=10"`
        ])
        .output(outputPath)
        .on('start', () => {
          console.log('🎬 Generating video from image...');
        })
        .on('end', () => {
          console.log(`✅ Video generated: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error(`❌ Video generation failed: ${error.message}`);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Download image from URL (placeholder - would need http/https module)
   */
  async downloadImage(url) {
    // Placeholder - in production, use axios or node-fetch to download
    // For now, return URL as-is (ffmpeg can handle http URLs)
    return url;
  }
}

module.exports = VideoGenerator;
