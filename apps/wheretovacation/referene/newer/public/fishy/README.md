# Fishy Mascot Images

This directory contains Fishy mascot images for different platforms.

## Directory Structure

- `android/` - Android app icons and images
- `ios/` - iOS app icons and images  
- `web/` - Web app icons and images

## Image Specifications

### Android
- Recommended sizes: 48dp, 72dp, 96dp, 144dp, 192dp
- Formats: PNG (preferred), WebP
- Naming: `fishy-android-{size}.png` (e.g., `fishy-android-192.png`)

### iOS
- Recommended sizes: 60pt, 120pt, 180pt (@2x, @3x)
- Formats: PNG (preferred)
- Naming: `fishy-ios-{size}.png` (e.g., `fishy-ios-120.png`)

### Web
- Recommended sizes: 192px, 512px, favicon sizes
- Formats: PNG, SVG, ICO
- Naming: `fishy-web-{size}.png` (e.g., `fishy-web-512.png`)

## Usage

Images can be referenced in code as:
```tsx
<img src="/fishy/android/fishy-android-192.png" alt="Fishy" />
```

