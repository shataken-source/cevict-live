# Fishy Image Manifest

This file documents all Fishy mascot images that should be present in the directories.

## Android Images (10 images expected)

1. **fishy-android-1.png** - Blue creature with brown hat and goggles (safari/explorer style)
2. **fishy-android-2.png** - Blue dolphin with yellow Hawaiian shirt, tan hat, sunglasses
3. **fishy-android-3.png** - Blue creature with brown hat and dark sunglasses
4. **fishy-android-4.png** - Blue dolphin with yellow Hawaiian shirt, tan hat, sunglasses (circular frame)
5. **fishy-android-5.png** - Blue creature with brown hat and dark sunglasses (circular frame)
6. **fishy-android-6.png** - Blue dolphin with yellow Hawaiian shirt, tan hat, sunglasses (circular frame, thick black border)
7. **fishy-android-7.png** - Blue dolphin with yellow Hawaiian shirt, tan hat, sunglasses (circular frame)
8. **fishy-android-8.png** - Blue dolphin with yellow Hawaiian shirt, tan hat, sunglasses (circular frame)
9. **fishy-android-9.png** - Blue dolphin with yellow Hawaiian shirt, tan hat, sunglasses (circular frame)
10. **fishy-android-10.png** - Blue dolphin with yellow Hawaiian shirt, tan hat, sunglasses (circular frame)

## iOS Images (8 images expected)

1. **fishy-ios-1.png** - Blue creature with brown hat and goggles (safari/explorer style)
2. **fishy-ios-2.png** - Blue dolphin with yellow Hawaiian shirt, tan hat, sunglasses
3. **fishy-ios-3.png** - Blue creature with brown hat and dark sunglasses (circular frame)
4. **fishy-ios-4.png** - Blue dolphin with yellow Hawaiian shirt, tan hat, sunglasses (circular frame)
5. **fishy-ios-5.png** - Blue creature with brown hat and dark sunglasses (circular frame, thick black border)
6. **fishy-ios-6.png** - Blue dolphin with yellow Hawaiian shirt, tan hat, sunglasses (circular frame)
7. **fishy-ios-7.png** - Blue creature with brown hat and dark sunglasses (circular frame)
8. **fishy-ios-8.png** - Blue creature with brown hat and dark sunglasses (circular frame, pixelated/small icon)

## Web Images (2 images expected)

1. **fishy-web-1.png** - Blue dolphin with yellow Hawaiian shirt, tan hat, sunglasses (circular frame, thick black border)
2. **fishy-web-2.png** - Blue dolphin with yellow Hawaiian shirt, tan hat, sunglasses (oval frame)

## Common Characteristics

All Fishy images feature:
- **Character**: Blue dolphin/whale-like creature
- **Expression**: Wide, cheerful smile with pink/red tongue
- **Eyes**: Large, expressive black eyes with white pupils
- **Accessories**: 
  - Brown/tan wide-brimmed hat (fedora/safari style)
  - Dark sunglasses or goggles
  - Yellow Hawaiian shirt with orange floral patterns (some variants)
- **Style**: Clean, cartoon vector art with bold outlines
- **Framing**: Most images are circular with black/gray borders

## Image Status

- [ ] Android images uploaded
- [ ] iOS images uploaded  
- [ ] Web images uploaded

## Next Steps

1. Upload actual image files to their respective directories
2. Verify all images are accessible at `/fishy/{platform}/{filename}`
3. Update FishyAvatar components to use these images instead of SVG/emoji placeholders
4. Create responsive image sets for different screen densities

## Usage in Components

Once images are uploaded, update components like:
- `apps/wheretovacation/components/FISHY/FishyAvatar.tsx`
- `apps/wheretovacation/src/app/components/Fishy/FishyAvatar.tsx`

Example usage:
```tsx
<img 
  src="/fishy/web/fishy-web-1.png" 
  alt="Fishy AI Assistant" 
  className="w-16 h-16 rounded-full"
/>
```

