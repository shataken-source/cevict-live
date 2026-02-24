/**
 * Generate Switchback Lite app icons using pngjs.
 * Creates mipmap PNGs at all Android densities.
 * Design: Dark background with cyan play button (distinct from Switchback TV's pink).
 */

const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const RES_DIR = path.join(__dirname, '..', 'app', 'src', 'main', 'res');

// Colors — CYAN theme (distinct from Switchback TV's pink #ff0064)
const BG = { r: 10, g: 10, b: 15 };         // #0a0a0f
const PRIMARY = { r: 0, g: 212, b: 255 };    // #00d4ff (cyan)
const WHITE = { r: 255, g: 255, b: 255 };
const DARK_PANEL = { r: 20, g: 20, b: 30 };  // #14141e

function createPNG(width, height) {
  return new PNG({ width, height });
}

function setPixel(png, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function fillRect(png, x, y, w, h, color) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(png, x + dx, y + dy, color.r, color.g, color.b);
    }
  }
}

function fillCircle(png, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= r2) {
        setPixel(png, cx + dx, cy + dy, color.r, color.g, color.b);
      }
    }
  }
}

function fillRoundedRect(png, x, y, w, h, radius, color) {
  fillRect(png, x + radius, y, w - 2 * radius, h, color);
  fillRect(png, x, y + radius, w, h - 2 * radius, color);
  fillCircle(png, x + radius, y + radius, radius, color);
  fillCircle(png, x + w - radius - 1, y + radius, radius, color);
  fillCircle(png, x + radius, y + h - radius - 1, radius, color);
  fillCircle(png, x + w - radius - 1, y + h - radius - 1, radius, color);
}

function drawPlayButton(png, cx, cy, size, color) {
  const halfH = Math.floor(size / 2);
  const width = Math.floor(size * 0.87);
  const left = cx - Math.floor(width / 3);

  for (let dy = -halfH; dy <= halfH; dy++) {
    const progress = 1 - Math.abs(dy) / halfH;
    const rowWidth = Math.floor(width * progress);
    for (let dx = 0; dx < rowWidth; dx++) {
      setPixel(png, left + dx, cy + dy, color.r, color.g, color.b);
    }
  }
}

function drawIcon(size) {
  const png = createPNG(size, size);
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const margin = Math.floor(size * 0.08);

  // Background
  fillRect(png, 0, 0, size, size, BG);

  // Outer rounded rect border (cyan)
  const borderSize = Math.floor(size * 0.04);
  fillRoundedRect(png, margin, margin, size - 2 * margin, size - 2 * margin,
    Math.floor(size * 0.15), PRIMARY);

  // Inner dark panel
  fillRoundedRect(png, margin + borderSize, margin + borderSize,
    size - 2 * margin - 2 * borderSize, size - 2 * margin - 2 * borderSize,
    Math.floor(size * 0.12), DARK_PANEL);

  // Central play button circle (cyan)
  const circleR = Math.floor(size * 0.25);
  fillCircle(png, cx, cy, circleR, PRIMARY);

  // Play triangle (white)
  const triSize = Math.floor(circleR * 1.1);
  drawPlayButton(png, cx + Math.floor(triSize * 0.08), cy, triSize, WHITE);

  // "L" indicator bottom-right (for "Lite")
  const dotR = Math.floor(size * 0.04);
  const dotX = size - margin - Math.floor(size * 0.14);
  const dotY = size - margin - Math.floor(size * 0.14);
  fillCircle(png, dotX, dotY, dotR, PRIMARY);

  return png;
}

function savePNG(png, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
  console.log(`Created: ${filePath} (${png.width}x${png.height})`);
}

// Android mipmap densities
const DENSITIES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

console.log('Generating Switchback Lite icons (cyan theme)...\n');

for (const [folder, size] of Object.entries(DENSITIES)) {
  savePNG(drawIcon(size), path.join(RES_DIR, folder, 'ic_launcher.png'));
}

// Also update the vector XML to match (foreground layer for adaptive icons)
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground>
        <inset
            android:drawable="@mipmap/ic_launcher"
            android:inset="25%" />
    </foreground>
</adaptive-icon>
`;

// Create background color resource
const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0a0a0f</color>
</resources>
`;

const valuesDir = path.join(RES_DIR, 'values');
if (!fs.existsSync(valuesDir)) fs.mkdirSync(valuesDir, { recursive: true });

// Write ic_launcher_background color
const colorsPath = path.join(valuesDir, 'colors.xml');
fs.writeFileSync(colorsPath, colorsXml);
console.log(`Created: ${colorsPath}`);

// Update anydpi launcher to use adaptive icon with PNG foreground
const anydpiDir = path.join(RES_DIR, 'mipmap-anydpi-v26');
if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });
fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), adaptiveXml);
console.log(`Updated: ${path.join(anydpiDir, 'ic_launcher.xml')}`);

console.log('\nDone! All Switchback Lite icons generated.');
