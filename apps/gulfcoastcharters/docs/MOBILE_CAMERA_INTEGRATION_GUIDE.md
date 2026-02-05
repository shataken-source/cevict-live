# Mobile Camera Integration for Catch Photos

## Overview
Gulf Coast Charters now includes comprehensive mobile camera integration for catch photo uploads with automatic EXIF data extraction, photo compression, and instant upload to the catch logger.

## Features Implemented

### 1. **MobileCameraCapture Component**
- Direct camera access with permission handling
- Photo gallery selection
- Real-time preview before upload
- EXIF metadata extraction (GPS location, timestamp)
- Automatic photo compression (max 1920px width, 85% quality)
- Instant upload to Supabase storage

### 2. **Photo Compression Utility**
Location: `src/utils/photoCompression.ts`

Functions:
- `compressImage()`: Reduces photo size while maintaining quality
- `extractEXIF()`: Extracts GPS coordinates and timestamp from photos

### 3. **Enhanced Catch Logger**
Location: `src/components/CatchLogger.tsx`

New Features:
- "Take Photo" button for direct camera access
- "Upload" button for gallery selection
- Location data automatically populated from photo EXIF
- GPS coordinates displayed on photo preview
- Latitude/longitude stored with catch data

## How It Works

### Camera Permissions
1. User clicks "Take Photo"
2. App requests camera permission
3. If granted: Opens camera interface
4. If denied: Shows error with instructions to enable in settings

### Photo Capture Flow
1. User takes photo or selects from gallery
2. Photo is compressed automatically
3. EXIF data extracted (GPS, timestamp)
4. Preview shown with location overlay
5. User clicks "Upload Photo"
6. Photo uploaded to Supabase storage
7. Location data auto-fills form fields

### Data Stored
- Photo URL (Supabase CDN)
- Latitude (decimal degrees)
- Longitude (decimal degrees)
- Capture timestamp
- Location string (auto-generated from coordinates)

## Usage Instructions

### For Users
1. Navigate to Catch Logger
2. Fill in basic catch information
3. Click "Take Photo" to use camera OR "Upload" for gallery
4. Allow camera/location permissions when prompted
5. Take photo (location automatically captured)
6. Review preview with GPS overlay
7. Click "Upload Photo"
8. Submit catch with photo and location data

### For Developers

#### Integrating Camera in Other Components
```typescript
import MobileCameraCapture from '@/components/MobileCameraCapture';
import { PhotoMetadata } from '@/utils/photoCompression';

const [showCamera, setShowCamera] = useState(false);

const handlePhotoCapture = (url: string, metadata: PhotoMetadata) => {
  console.log('Photo URL:', url);
  console.log('GPS:', metadata.latitude, metadata.longitude);
  console.log('Timestamp:', metadata.timestamp);
};

// Render
{showCamera && (
  <MobileCameraCapture
    onPhotoCapture={handlePhotoCapture}
    onClose={() => setShowCamera(false)}
  />
)}
```

## Browser Compatibility
- Chrome/Edge: Full support
- Safari iOS: Full support (requires HTTPS)
- Firefox: Full support
- Samsung Internet: Full support

## Permissions Required
1. **Camera Access**: For taking photos
2. **Location Access**: For GPS coordinates
3. **Storage Access**: For saving to Supabase

## Security Notes
- All photos uploaded to Supabase storage with authentication
- GPS data only captured with user permission
- Photos compressed before upload to reduce bandwidth
- HTTPS required for camera access on mobile

## Future Enhancements
- [ ] Offline photo queue (save locally, upload when online)
- [ ] Multiple photo upload per catch
- [ ] Photo editing (crop, rotate, filters)
- [ ] Species recognition via AI
- [ ] Weather data from photo timestamp
- [ ] Automatic fish measurement from photo
