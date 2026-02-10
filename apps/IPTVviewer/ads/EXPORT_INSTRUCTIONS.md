# 🎨 HOW TO EXPORT ADS AS IMAGES (PNG/JPG)

## Method 1: Browser Screenshot (Easiest)

### For Windows:
1. **Open any HTML file** in Chrome/Edge (double-click the .html file)
2. **Press F12** to open DevTools
3. **Press Ctrl+Shift+P** to open Command Palette
4. Type **"Capture full size screenshot"** and hit Enter
5. **Saves as PNG** automatically to your Downloads folder

### For Specific Dimensions:
1. Open HTML file in browser
2. **F12 → DevTools**
3. Click **Toggle device toolbar** (Ctrl+Shift+M)
4. Enter **exact dimensions** (e.g., 1200x675)
5. **Ctrl+Shift+P** → "Capture screenshot"

---

## Method 2: Online Tools (High Quality)

### CloudConvert (Free, no signup)
1. Go to: https://cloudconvert.com/html-to-png
2. **Upload** .html file
3. Click **Convert**
4. **Download** PNG (perfect quality, exact dimensions)

### HTML to Image API (Free tier)
1. Go to: https://htmlcsstoimage.com/
2. **Paste HTML code** or upload file
3. Click **Create Image**
4. **Download** PNG/JPG

---

## Method 3: Node.js Script (Automated)

Install **puppeteer** (headless Chrome):
```powershell
npm install -g puppeteer
```

Save this as `export-ads.js`:
```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function exportAds() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const ads = [
    { file: 'praxis-twitter-01-one-place.html', width: 1200, height: 675, name: 'praxis-twitter-01.png' },
    { file: 'praxis-twitter-02-arbitrage.html', width: 1200, height: 675, name: 'praxis-twitter-02.png' },
    { file: 'monitor-twitter-01-dashboard.html', width: 1200, height: 675, name: 'monitor-twitter-01.png' },
  ];
  
  for (const ad of ads) {
    await page.setViewport({ width: ad.width, height: ad.height });
    await page.goto(`file://${__dirname}/${ad.file}`);
    await page.screenshot({ path: `exports/${ad.name}`, fullPage: false });
    console.log(`✓ Exported ${ad.name}`);
  }
  
  await browser.close();
  console.log('All ads exported!');
}

exportAds();
```

Run:
```powershell
node export-ads.js
```

---

## Method 4: Python + Selenium (Cross-platform)

Install:
```powershell
pip install selenium pillow
```

Script:
```python
from selenium import webdriver
from PIL import Image
import time

driver = webdriver.Chrome()

ads = [
    ('praxis-twitter-01-one-place.html', 1200, 675, 'praxis-twitter-01.png'),
    ('praxis-twitter-02-arbitrage.html', 1200, 675, 'praxis-twitter-02.png'),
]

for html_file, width, height, output_name in ads:
    driver.set_window_size(width, height)
    driver.get(f'file:///{html_file}')
    time.sleep(1)
    driver.save_screenshot(f'exports/{output_name}')
    print(f'✓ Exported {output_name}')

driver.quit()
```

---

## Method 5: Canva Import (For Further Editing)

1. **Export HTML as PNG** (Method 1 or 2)
2. Go to **Canva.com**
3. Click **Create a design** → **Custom size** (1200x675 for Twitter)
4. **Upload** your PNG
5. **Edit** text, colors, add effects
6. **Download** as PNG/JPG (max quality)

---

## Recommended Workflow

### For Quick Exports:
1. Open HTML in Chrome
2. F12 → Ctrl+Shift+M (device toolbar)
3. Set dimensions (1200x675)
4. Ctrl+Shift+P → "Capture screenshot"

### For Batch Exports:
1. Use **Node.js script** (Method 3)
2. Exports all 30+ ads in seconds
3. Perfect pixel-perfect quality

### For Final Polish:
1. Export PNG from HTML
2. Import to **Canva** or **Photoshop**
3. Add final touches (shadows, gradients, brand elements)
4. Export as **high-quality JPG** (<150 KB) or PNG

---

## File Size Optimization

### If PNG is too large (>150 KB):

**Online compressor:**
- https://tinypng.com/ (drag & drop, free)
- Reduces size by 70% with no visible quality loss

**Command-line (ImageMagick):**
```powershell
# Install: choco install imagemagick
magick convert input.png -quality 85 output.jpg
```

---

## Export Checklist

For each ad, verify:
- [ ] Correct dimensions (1200x675 for Twitter, etc.)
- [ ] Text is readable (not blurry)
- [ ] Colors match brand (#0a0a0f, #6366f1)
- [ ] File size <150 KB (for social media upload limits)
- [ ] Saved with descriptive name (praxis-twitter-01-one-place.png)

---

## Naming Convention

Use this pattern:
```
{product}-{platform}-{number}-{variant}.{ext}

Examples:
praxis-twitter-01-one-place.png
praxis-facebook-02-arbitrage.jpg
monitor-instagram-01-dashboard-square.png
praxis-display-728x90-leaderboard.png
```

---

## Where to Save

Create this folder structure:
```
C:\cevict-live\apps\IPTVviewer\ads\
├── exports\
│   ├── praxis\
│   │   ├── twitter\
│   │   ├── facebook\
│   │   ├── instagram\
│   │   └── display\
│   └── monitor\
│       ├── twitter\
│       ├── facebook\
│       ├── instagram\
│       └── display\
└── sources\  (HTML files here)
```

---

## Quick Export Commands

**Export single ad (Chrome screenshot):**
```powershell
# 1. Open HTML in Chrome
# 2. F12 → Ctrl+Shift+M → Set to 1200x675
# 3. Ctrl+Shift+P → "Capture screenshot"
```

**Export all ads (Node.js):**
```powershell
cd C:\cevict-live\apps\IPTVviewer\ads
node export-all-ads.js
```

**Compress all PNGs:**
```powershell
# Drag all PNGs to https://tinypng.com/
# Or use: magick mogrify -quality 85 *.png
```

---

## Upload to Ad Platforms

### Twitter/X Ads:
- Go to: https://ads.twitter.com/
- Upload PNG (1200x675)
- Add headline + CTA
- Set budget + targeting

### Facebook Ads Manager:
- Go to: https://business.facebook.com/adsmanager
- Create ad → Upload creative (1200x628)
- Add text + CTA
- Set audience + budget

### Instagram Ads (via Facebook):
- Same as Facebook Ads Manager
- Choose "Instagram" placement
- Upload 1080x1080 (square) or 1080x1350 (portrait)

### Display Ad Networks:
- **Google Display Network:** Upload 728x90, 300x250, 160x600
- **BuySellAds:** Same sizes
- **Carbon Ads:** 130x100 (if needed, resize the 300x250)

---

## READY TO EXPORT!

**You have 3 HTML ads ready:**
1. `praxis-twitter-01-one-place.html` (1200x675)
2. `praxis-twitter-02-arbitrage.html` (1200x675)
3. `monitor-twitter-01-dashboard.html` (1200x675)
4. `display-banners-all-sizes.html` (6 sizes in one file)

**Next:**
- Open each in Chrome → Screenshot (Method 1)
- Or run Node.js script to export all at once (Method 3)
- Upload to TinyPNG.com if file size >150 KB
- Deploy to ad platforms!

---

Questions? Need more ad variations? Just ask! 🚀
