/**
 * Generate Switchback TV app icons using pngjs (no native dependencies).
 * Creates icon.png (1024x1024), adaptive-icon.png (1024x1024),
 * splash.png (1284x2778), and favicon.png (48x48).
 *
 * Design: Dark background with a stylized "S" play button in red/pink (#ff0064).
 */

const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Colors
const BG = { r: 10, g: 10, b: 10 };        // #0a0a0a
const PRIMARY = { r: 255, g: 0, b: 100 };   // #ff0064
const WHITE = { r: 255, g: 255, b: 255 };
const DARK_PANEL = { r: 26, g: 26, b: 26 }; // #1a1a1a

function createPNG(width, height) {
  const png = new PNG({ width, height });
  return png;
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
  // Fill center
  fillRect(png, x + radius, y, w - 2 * radius, h, color);
  fillRect(png, x, y + radius, w, h - 2 * radius, color);
  // Fill corners
  fillCircle(png, x + radius, y + radius, radius, color);
  fillCircle(png, x + w - radius - 1, y + radius, radius, color);
  fillCircle(png, x + radius, y + h - radius - 1, radius, color);
  fillCircle(png, x + w - radius - 1, y + h - radius - 1, radius, color);
}

function drawPlayTriangle(png, cx, cy, size, color) {
  // Draw a play button triangle (pointing right)
  const h = size;       // height of triangle
  const w = size * 0.87; // width (equilateral-ish)
  const startX = cx - w / 3;
  const startY = cy - h / 2;

  for (let row = 0; row < h; row++) {
    const progress = row / h;
    const rowWidth = progress <= 0.5
      ? Math.floor(w * (progress * 2))
      : Math.floor(w * ((1 - progress) * 2));
    for (let col = 0; col < rowWidth; col++) {
      setPixel(png, Math.floor(startX + col), Math.floor(startY + row), color.r, color.g, color.b);
    }
  }
}

function drawPlayButton(png, cx, cy, size, color) {
  // A proper right-pointing triangle
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

function drawLetterS(png, cx, cy, size, color, thickness) {
  // Draw a stylized "S" using arcs approximated with filled regions
  const r = Math.floor(size / 2);
  const t = thickness;

  // Top arc (curves right then left)
  for (let angle = 0; angle < 180; angle++) {
    const rad = (angle * Math.PI) / 180;
    const arcCx = cx;
    const arcCy = cy - r / 2;
    for (let tr = 0; tr < t; tr++) {
      const ar = r / 2 - tr;
      const px = Math.floor(arcCx + ar * Math.cos(rad));
      const py = Math.floor(arcCy - ar * Math.sin(rad));
      setPixel(png, px, py, color.r, color.g, color.b);
    }
  }

  // Bottom arc (curves left then right)
  for (let angle = 180; angle < 360; angle++) {
    const rad = (angle * Math.PI) / 180;
    const arcCx = cx;
    const arcCy = cy + r / 2;
    for (let tr = 0; tr < t; tr++) {
      const ar = r / 2 - tr;
      const px = Math.floor(arcCx + ar * Math.cos(rad));
      const py = Math.floor(arcCy - ar * Math.sin(rad));
      setPixel(png, px, py, color.r, color.g, color.b);
    }
  }
}

function drawSwitchbackIcon(size) {
  const png = createPNG(size, size);
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const margin = Math.floor(size * 0.1);

  // Background
  fillRect(png, 0, 0, size, size, BG);

  // Outer rounded rect border (pink glow effect)
  const borderSize = Math.floor(size * 0.04);
  fillRoundedRect(png, margin, margin, size - 2 * margin, size - 2 * margin,
    Math.floor(size * 0.15), PRIMARY);

  // Inner dark panel
  fillRoundedRect(png, margin + borderSize, margin + borderSize,
    size - 2 * margin - 2 * borderSize, size - 2 * margin - 2 * borderSize,
    Math.floor(size * 0.12), DARK_PANEL);

  // Central play button circle background
  const circleR = Math.floor(size * 0.25);
  fillCircle(png, cx, cy, circleR, PRIMARY);

  // Play triangle inside circle
  const triSize = Math.floor(circleR * 1.1);
  drawPlayButton(png, cx + Math.floor(triSize * 0.08), cy, triSize, WHITE);

  // "S" letter top-left
  const sSize = Math.floor(size * 0.18);
  const sCx = margin + Math.floor(size * 0.18);
  const sCy = margin + Math.floor(size * 0.18);
  drawLetterS(png, sCx, sCy, sSize, PRIMARY, Math.max(2, Math.floor(size * 0.025)));

  // Small dots decoration (bottom corners)
  const dotR = Math.floor(size * 0.015);
  fillCircle(png, margin + Math.floor(size * 0.15), size - margin - Math.floor(size * 0.12), dotR, PRIMARY);
  fillCircle(png, size - margin - Math.floor(size * 0.15), size - margin - Math.floor(size * 0.12), dotR, PRIMARY);

  return png;
}

function drawSplash(width, height) {
  const png = createPNG(width, height);
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  // Black background
  fillRect(png, 0, 0, width, height, BG);

  // Central play button
  const circleR = Math.floor(Math.min(width, height) * 0.08);
  fillCircle(png, cx, cy, circleR, PRIMARY);
  const triSize = Math.floor(circleR * 1.1);
  drawPlayButton(png, cx + Math.floor(triSize * 0.08), cy, triSize, WHITE);

  // Horizontal line accent
  const lineW = Math.floor(width * 0.3);
  const lineH = Math.floor(height * 0.003);
  fillRect(png, cx - Math.floor(lineW / 2), cy + circleR + Math.floor(height * 0.04), lineW, lineH, PRIMARY);

  return png;
}

function savePNG(png, filePath) {
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
  console.log(`Created: ${filePath} (${png.width}x${png.height})`);
}

// Generate all icons
console.log('Generating Switchback TV icons...\n');

// icon.png — 1024x1024
savePNG(drawSwitchbackIcon(1024), path.join(ASSETS_DIR, 'icon.png'));

// adaptive-icon.png — 1024x1024 (foreground only, with safe zone padding)
savePNG(drawSwitchbackIcon(1024), path.join(ASSETS_DIR, 'adaptive-icon.png'));

// splash.png — 1284x2778
savePNG(drawSplash(1284, 2778), path.join(ASSETS_DIR, 'splash.png'));

// favicon.png — 48x48
savePNG(drawSwitchbackIcon(48), path.join(ASSETS_DIR, 'favicon.png'));

console.log('\nDone! All icons generated.');
