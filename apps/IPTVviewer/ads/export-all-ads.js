// Automated Ad Export Script
// Install: npm install puppeteer
// Run: node export-all-ads.js

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create exports directory if it doesn't exist
const exportsDir = path.join(__dirname, 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

// Define all ads to export
const ads = [
  // PRAXIS - Twitter/X (1200x675)
  { 
    file: 'praxis-twitter-01-one-place.html', 
    width: 1200, 
    height: 675, 
    name: 'praxis-twitter-01-one-place.png' 
  },
  { 
    file: 'praxis-twitter-02-arbitrage.html', 
    width: 1200, 
    height: 675, 
    name: 'praxis-twitter-02-arbitrage.png' 
  },
  
  // WEBSITE MONITOR - Twitter/X (1200x675)
  { 
    file: 'monitor-twitter-01-dashboard.html', 
    width: 1200, 
    height: 675, 
    name: 'monitor-twitter-01-dashboard.png' 
  },
];

async function exportAds() {
  console.log('🚀 Starting ad export...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  let successCount = 0;
  let failCount = 0;
  
  for (const ad of ads) {
    try {
      // Set viewport to exact dimensions
      await page.setViewport({ 
        width: ad.width, 
        height: ad.height,
        deviceScaleFactor: 2 // 2x for high-DPI (retina) quality
      });
      
      // Load HTML file
      const htmlPath = path.join(__dirname, ad.file);
      await page.goto(`file://${htmlPath}`, { 
        waitUntil: 'networkidle0',
        timeout: 10000 
      });
      
      // Wait for any animations/fonts to load
      await page.waitForTimeout(500);
      
      // Take screenshot
      const outputPath = path.join(exportsDir, ad.name);
      await page.screenshot({ 
        path: outputPath,
        fullPage: false,
        type: 'png'
      });
      
      // Get file size
      const stats = fs.statSync(outputPath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`✓ ${ad.name} (${ad.width}x${ad.height}) - ${fileSizeKB} KB`);
      successCount++;
      
      // Warn if file is too large
      if (stats.size > 150000) {
        console.log(`  ⚠️  File size exceeds 150 KB - compress at https://tinypng.com/`);
      }
      
    } catch (error) {
      console.log(`✗ Failed to export ${ad.name}: ${error.message}`);
      failCount++;
    }
  }
  
  await browser.close();
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Export Summary:`);
  console.log(`   ✓ Success: ${successCount}`);
  console.log(`   ✗ Failed:  ${failCount}`);
  console.log(`   📁 Location: ${exportsDir}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  if (successCount > 0) {
    console.log(`🎉 All ads exported successfully!`);
    console.log(`\nNext steps:`);
    console.log(`1. Check ${exportsDir} for PNG files`);
    console.log(`2. If file size >150 KB, compress at https://tinypng.com/`);
    console.log(`3. Upload to ad platforms (Twitter, Facebook, etc.)`);
  }
}

// Run the export
exportAds().catch(error => {
  console.error('❌ Export failed:', error);
  process.exit(1);
});
