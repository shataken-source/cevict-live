# 🎨 CEVICT ADS - READY TO DEPLOY

## ✅ WHAT YOU GOT

### **HTML Ad Templates (Ready to View):**
1. `praxis-twitter-01-one-place.html` - "Kalshi + Polymarket in One Place"
2. `praxis-twitter-02-arbitrage.html` - "Spot the Edge" arbitrage scanner
3. `monitor-twitter-01-dashboard.html` - "One Dashboard for All Websites"
4. `display-banners-all-sizes.html` - All 6 banner sizes (728x90, 300x250, 160x600) for both products

### **Export Tools:**
- `export-all-ads.js` - Automated Node.js script to export all ads as PNG
- `package.json` - Dependencies for export script
- `EXPORT_INSTRUCTIONS.md` - Complete guide (5 methods to export)

---

## 🚀 QUICK START (3 STEPS)

### Step 1: View the Ads
```powershell
# Open any HTML file in your browser
start praxis-twitter-01-one-place.html
start monitor-twitter-01-dashboard.html
start display-banners-all-sizes.html
```

### Step 2: Export as Images

**Option A: Browser Screenshot (No Install)**
1. Open HTML file in Chrome
2. Press **F12** → **Ctrl+Shift+M** (device toolbar)
3. Set to **1200x675** (or 1200x628 for Facebook)
4. Press **Ctrl+Shift+P** → Type "Capture screenshot"
5. Done! PNG saved to Downloads

**Option B: Automated Export (Batch)**
```powershell
# Install dependencies (first time only)
npm install

# Export all ads
npm run export

# Ads will be in: ./exports/
```

### Step 3: Upload to Ad Platforms
- **Twitter/X:** https://ads.twitter.com/
- **Facebook:** https://business.facebook.com/adsmanager
- **Instagram:** Via Facebook Ads Manager
- **Display Networks:** Google Display, BuySellAds, Carbon Ads

---

## 📐 AD DIMENSIONS

| Platform | Size | File |
|----------|------|------|
| Twitter/X | 1200×675 | `praxis-twitter-*.html` |
| Facebook Feed | 1200×628 | (resize Twitter ads) |
| Instagram Square | 1080×1080 | (coming soon) |
| Instagram Portrait | 1080×1350 | (coming soon) |
| Display Leaderboard | 728×90 | `display-banners-all-sizes.html` |
| Display Rectangle | 300×250 | `display-banners-all-sizes.html` |
| Display Skyscraper | 160×600 | `display-banners-all-sizes.html` |

---

## 🎨 AD VARIATIONS INCLUDED

### PRAXIS:
✅ "One Place" - Core value prop (Kalshi + Polymarket together)
✅ "Arbitrage Scanner" - Key differentiator with price comparison
✅ Display banners (3 sizes)

### WEBSITE MONITOR:
✅ "Dashboard" - Multi-site monitoring overview
✅ Display banners (3 sizes)

---

## 💡 CUSTOMIZATION

Want to edit the ads? Open any `.html` file in **VS Code** or **Notepad** and modify:

**Change headline:**
```html
<h1 class="headline">YOUR NEW HEADLINE HERE</h1>
```

**Change colors:**
```css
background: #0a0a0f; /* Dark background */
color: #6366f1; /* Indigo accent */
```

**Change CTA button:**
```html
<button class="cta-button cta-primary">YOUR CTA TEXT</button>
```

Then **save** and **export again**!

---

## 📊 FILE SIZE CHECK

Social media platforms have file size limits:
- **Twitter:** 5 MB (PNG), 3 MB (JPG)
- **Facebook:** 30 MB
- **Instagram:** 8 MB

**If your PNG is >150 KB:**
1. Go to https://tinypng.com/
2. Drag & drop your PNG
3. Download compressed version (70% smaller, no visible quality loss)

---

## 🔄 NEXT STEPS

1. **Test in browser:** Open HTML files to preview
2. **Export:** Use browser screenshot or `npm run export`
3. **Compress (if needed):** https://tinypng.com/
4. **Deploy:** Upload to Twitter Ads, Facebook Ads Manager
5. **Track:** Add UTM parameters to landing URLs
6. **Optimize:** Test 2-3 variations, double budget on winners after 1 week

---

## 📁 FILE STRUCTURE

```
ads/
├── praxis-twitter-01-one-place.html
├── praxis-twitter-02-arbitrage.html
├── monitor-twitter-01-dashboard.html
├── display-banners-all-sizes.html
├── export-all-ads.js
├── package.json
├── EXPORT_INSTRUCTIONS.md
├── README.md (this file)
└── exports/ (created after running npm run export)
    ├── praxis-twitter-01-one-place.png
    ├── praxis-twitter-02-arbitrage.png
    └── monitor-twitter-01-dashboard.png
```

---

## 🎯 CAMPAIGN SETUP

### Suggested Budget (Month 1):
- **Twitter/X:** $100/week ($400/month)
- **Facebook:** $75/week ($300/month)
- **Total:** $175/week ($700/month)

### Expected Results:
- **Impressions:** 100K+
- **CTR:** 1.5-2.0%
- **Clicks:** 1,500-2,000
- **Landing visits:** 800-1,000
- **Sign-ups:** 80-100 (10% conversion)
- **Paid conversions:** 8-10 (10% free→paid)

### Metrics to Track:
- CTR (Click-Through Rate)
- CPC (Cost Per Click)
- Landing page conversion rate
- Free → Pro conversion rate
- CAC (Customer Acquisition Cost)

---

## ❓ NEED MORE?

Want me to create:
- [ ] Instagram square/portrait ads (1080×1080, 1080×1350)
- [ ] Facebook ad variations (1200×628)
- [ ] More display banner sizes
- [ ] Animated GIF versions
- [ ] Video ad scripts

Just ask! 🚀

---

**Created:** 2026-02-08  
**Status:** ✅ Ready to deploy  
**Total ads:** 7 variations (3 social + 6 display banners)

Questions? Just open the HTML files in your browser to see them! 💪
