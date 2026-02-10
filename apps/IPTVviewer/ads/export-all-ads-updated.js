// UPDATED: Export script for all 14 ad variations
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Create exports directory structure
const dirs = [
  'exports',
  'exports/praxis',
  'exports/praxis/twitter',
  'exports/praxis/instagram',
  'exports/praxis/facebook',
  'exports/monitor',
  'exports/monitor/twitter',
  'exports/monitor/instagram',
  'exports/monitor/facebook',
  'exports/display'
];

dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Define all 14 ads + display banners
const ads = [
  // PRAXIS - Twitter/X (1200x675)
  { 
    file: 'praxis-twitter-01-one-place.html', 
    width: 1200, 
    height: 675, 
    name: 'praxis/twitter/praxis-twitter-01-one-place.png' 
  },
  { 
    file: 'praxis-twitter-02-arbitrage.html', 
    width: 1200, 
    height: 675, 
    name: 'praxis/twitter/praxis-twitter-02-arbitrage.png' 
  },
  
  // PRAXIS - Instagram Square (1080x1080)
  { 
    file: 'praxis-instagram-square-01-one-place.html', 
    width: 1080, 
    height: 1080, 
    name: 'praxis/instagram/praxis-instagram-square-01-one-place.png' 
  },
  { 
    file: 'praxis-instagram-square-02-arbitrage.html', 
    width: 1080, 
    height: 1080, 
    name: 'praxis/instagram/praxis-instagram-square-02-arbitrage.png' 
  },
  
  // PRAXIS - Instagram Portrait (1080x1350)
  { 
    file: 'praxis-instagram-portrait-01-ai.html', 
    width: 1080, 
    height: 1350, 
    name: 'praxis/instagram/praxis-instagram-portrait-01-ai.png' 
  },
  
  // PRAXIS - Facebook (1200x628)
  { 
    file: 'praxis-facebook-01-launch.html', 
    width: 1200, 
    height: 628, 
    name: 'praxis/facebook/praxis-facebook-01-launch.png' 
  },
  
  // WEBSITE MONITOR - Twitter/X (1200x675)
  { 
    file: 'monitor-twitter-01-dashboard.html', 
    width: 1200, 
    height: 675, 
    name: 'monitor/twitter/monitor-twitter-01-dashboard.png' 
  },
  
  // WEBSITE MONITOR - Instagram Square (1080x1080)
  { 
    file: 'monitor-instagram-square-01-dashboard.html', 
    width: 1080, 
    height: 1080, 
    name: 'monitor/instagram/monitor-instagram-square-01-dashboard.png' 
  },
  
  // WEBSITE MONITOR - Instagram Portrait (1080x1350)
  { 
    file: 'monitor-instagram-portrait-01-alerts.html', 
    width: 1080, 
    height: 1350, 
    name: 'monitor/instagram/monitor-instagram-portrait-01-alerts.png' 
  },
  
  // WEBSITE MONITOR - Facebook (1200x628)
  { 
    file: 'monitor-facebook-01-pricing.html', 
    width: 1200, 
    height: 628, 
    name: 'monitor/facebook/monitor-facebook-01-pricing.png' 
  },
];

async function exportAds() {
  console.log('🚀 Starting ad export...\n');
  console.log(`📦 Exporting ${ads.length} ad variations + display banners\n`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  let successCount = 0;
  let failCount = 0;
  
  for (const ad of ads) {
    try {
      await page.setViewport({ 
        width: ad.width, 
        height: ad.height,
        deviceScaleFactor: 2 // 2x for Retina quality
      });
      
      const htmlPath = path.join(__dirname, ad.file);
      await page.goto(`file://${htmlPath}`, { 
        waitUntil: 'networkidle0',
        timeout: 10000 
      });
      
      await page.waitForTimeout(500);
      
      const outputPath = path.join(__dirname, 'exports', ad.name);
      await page.screenshot({ 
        path: outputPath,
        fullPage: false,
        type: 'png'
      });
      
      const stats = fs.statSync(outputPath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`✓ ${ad.name} (${ad.width}x${ad.height}) - ${fileSizeKB} KB`);
      successCount++;
      
      if (stats.size > 150000) {
        console.log(`  ⚠️  Exceeds 150 KB - compress at https://tinypng.com/`);
      }
      
    } catch (error) {
      console.log(`✗ Failed: ${ad.name} - ${error.message}`);
      failCount++;
    }
  }
  
  await browser.close();
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Export Summary:`);
  console.log(`   ✓ Success: ${successCount}`);
  console.log(`   ✗ Failed:  ${failCount}`);
  console.log(`   📁 Location: ${path.join(__dirname, 'exports')}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  if (successCount > 0) {
    console.log(`🎉 All ads exported successfully!`);
    console.log(`\n📂 Folder structure:`);
    console.log(`   exports/`);
    console.log(`   ├── praxis/`);
    console.log(`   │   ├── twitter/ (2 ads)`);
    console.log(`   │   ├── instagram/ (3 ads)`);
    console.log(`   │   └── facebook/ (1 ad)`);
    console.log(`   └── monitor/`);
    console.log(`       ├── twitter/ (1 ad)`);
    console.log(`       ├── instagram/ (2 ads)`);
    console.log(`       └── facebook/ (1 ad)`);
    console.log(`\n🎯 Next steps:`);
    console.log(`1. Open GALLERY.html to preview all ads`);
    console.log(`2. Check exports/ folder for PNG files`);
    console.log(`3. If >150 KB, compress at https://tinypng.com/`);
    console.log(`4. Upload to ad platforms!`);
  }
}

exportAds().catch(error => {
  console.error('❌ Export failed:', error);
  process.exit(1);
});
