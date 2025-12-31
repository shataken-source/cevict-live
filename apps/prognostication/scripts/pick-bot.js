/**
 * PROGNO Pick Bot
 * Watches prognos-output/ directory for pick files and processes them
 */

const fs = require('fs');
const path = require('path');
const { chokidar } = require('chokidar');

class PrognoPickBot {
  constructor() {
    this.outputDir = path.join(__dirname, '../prognos-output');
    this.dataFile = path.join(__dirname, '../public/progno-picks.json');
    this.picks = [];
    this.watcher = null;
  }

  /**
   * Initialize the pick bot
   */
  async init() {
    console.log('🤖 PROGNO Pick Bot initializing...');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Load existing picks
    await this.loadExistingPicks();
    
    // Process existing files
    await this.processAllFiles();
    
    console.log('✅ PROGNO Pick Bot ready!');
  }

  /**
   * Load existing picks from data file
   */
  async loadExistingPicks() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = fs.readFileSync(this.dataFile, 'utf8');
        this.picks = JSON.parse(data);
        console.log(`📊 Loaded ${this.picks.length} existing picks`);
      }
    } catch (error) {
      console.log('📝 No existing picks found, starting fresh');
      this.picks = [];
    }
  }

  /**
   * Save picks to data file
   */
  async savePicks() {
    try {
      // Ensure public directory exists
      const publicDir = path.dirname(this.dataFile);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      fs.writeFileSync(this.dataFile, JSON.stringify(this.picks, null, 2));
      console.log(`💾 Saved ${this.picks.length} picks to ${this.dataFile}`);
    } catch (error) {
      console.error('❌ Failed to save picks:', error);
    }
  }

  /**
   * Process all files in output directory
   */
  async processAllFiles() {
    try {
      const files = fs.readdirSync(this.outputDir);
      let totalPicks = 0;

      for (const file of files) {
        if (file.includes('picks')) {
          const picks = await this.processFile(file);
          totalPicks += picks.length;
          console.log(`✅ Found ${picks.length} picks in ${file}`);
        }
      }

      await this.savePicks();
      console.log(`🎉 Total: ${totalPicks} picks processed!`);
    } catch (error) {
      console.error('❌ Error processing files:', error);
    }
  }

  /**
   * Process a single pick file
   */
  async processFile(filename) {
    const filePath = path.join(this.outputDir, filename);
    const extension = path.extname(filename);
    let picks = [];

    try {
      switch (extension) {
        case '.csv':
          picks = this.parseCSV(filePath);
          break;
        case '.json':
          picks = this.parseJSON(filePath);
          break;
        case '.txt':
          picks = this.parseTXT(filePath);
          break;
        default:
          console.log(`⚠️  Unsupported file type: ${extension}`);
      }

      // Add picks to our collection
      picks.forEach(pick => {
        // Add unique ID and timestamp if not present
        if (!pick.id) {
          pick.id = `${pick.sport?.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        if (!pick.timestamp) {
          pick.timestamp = new Date().toISOString();
        }
        if (!pick.source) {
          pick.source = filename;
        }
        
        // Remove duplicates based on sport and game
        const existingIndex = this.picks.findIndex(p => 
          p.sport === pick.sport && p.game === pick.game
        );
        
        if (existingIndex >= 0) {
          this.picks[existingIndex] = pick;
        } else {
          this.picks.push(pick);
        }
      });

      return picks;
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error);
      return [];
    }
  }

  /**
   * Parse CSV file
   */
  parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const picks = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const pick = {};
      
      headers.forEach((header, index) => {
        pick[header] = values[index] || '';
      });

      // Convert confidence to number
      if (pick.confidence) {
        pick.confidence = parseInt(pick.confidence);
      }

      picks.push(pick);
    }

    return picks;
  }

  /**
   * Parse JSON file
   */
  parseJSON(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // Handle different JSON structures
    if (Array.isArray(data)) {
      return data;
    } else if (data.picks && Array.isArray(data.picks)) {
      return data.picks;
    } else {
      return [data];
    }
  }

  /**
   * Parse TXT file
   */
  parseTXT(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    const picks = [];

    lines.forEach(line => {
      // Parse lines like: "NFL: Chiefs vs Bills - Chiefs -3.5 (94% confidence)"
      const match = line.match(/^(\w+):\s*(.+?)\s*-\s*(.+?)\s*\((\d+)%\s*confidence\)/);
      
      if (match) {
        picks.push({
          sport: match[1],
          game: match[2].trim(),
          prediction: match[3].trim(),
          confidence: parseInt(match[4]),
          analysis: `Parsed from ${path.basename(filePath)}`,
          status: 'active'
        });
      }
    });

    return picks;
  }

  /**
   * Start watching for file changes
   */
  startWatching() {
    console.log('👀 Watching for new pick files...');
    
    this.watcher = chokidar.watch(this.outputDir, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });

    this.watcher
      .on('add', async (filePath) => {
        const filename = path.basename(filePath);
        if (filename.includes('picks')) {
          console.log(`📁 New file detected: ${filename}`);
          await this.processFile(filename);
          await this.savePicks();
        }
      })
      .on('change', async (filePath) => {
        const filename = path.basename(filePath);
        if (filename.includes('picks')) {
          console.log(`📝 File updated: ${filename}`);
          await this.processFile(filename);
          await this.savePicks();
        }
      })
      .on('error', error => {
        console.error(`❌ Watcher error: ${error}`);
      });
  }

  /**
   * Stop watching
   */
  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      console.log('🛑 Stopped watching for files');
    }
  }

  /**
   * Get current picks
   */
  getPicks() {
    return this.picks;
  }

  /**
   * Get picks by sport
   */
  getPicksBySport(sport) {
    return this.picks.filter(pick => pick.sport?.toLowerCase() === sport.toLowerCase());
  }

  /**
   * Get picks by confidence level
   */
  getPicksByConfidence(minConfidence = 70) {
    return this.picks.filter(pick => pick.confidence >= minConfidence);
  }
}

// CLI interface
async function main() {
  const bot = new PrognoPickBot();
  
  try {
    await bot.init();
    
    const command = process.argv[2];
    
    if (command === 'watch') {
      bot.startWatching();
      
      // Keep process running
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down PROGNO Pick Bot...');
        bot.stopWatching();
        process.exit(0);
      });
      
      console.log('🔄 Bot is watching for changes. Press Ctrl+C to stop.');
    } else {
      // Just run once
      await bot.processAllFiles();
      console.log('✅ Processing complete!');
    }
  } catch (error) {
    console.error('❌ Bot error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PrognoPickBot;
