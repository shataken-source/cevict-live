# Coast Guard Inspection Interface Guide

## Overview
Mobile-optimized inspection interface for Coast Guard officers and auditors to conduct vessel compliance inspections on-site with offline support.

## Features

### 1. QR Code Scanning
- Scan vessel QR codes for instant identification
- Automatic vessel data loading
- Camera access for mobile devices

### 2. Offline Mode
- Full functionality without internet connection
- Automatic online/offline detection
- Local storage for offline inspections
- Sync when connection restored

### 3. Digital Signature Capture
- Touch-based signature drawing
- Canvas-based capture
- Signature required for submission
- Clear and redraw capability

### 4. Inspection Checklist
- Pre-configured safety requirements
- Documentation verification
- Navigation equipment checks
- Notes for each item
- General inspection notes

## Usage

### For Inspectors

1. **Start Inspection**
   - Open inspection interface
   - Tap "Start Scan" to scan vessel QR code
   - Vessel details load automatically

2. **Complete Checklist**
   - Check each requirement
   - Add notes for any issues
   - Mark compliant items
   - Document deficiencies

3. **Add Signature**
   - Tap "Add Signature"
   - Draw signature on screen
   - Tap "Save" to confirm

4. **Submit or Save**
   - Online: Tap "Submit" to send immediately
   - Offline: Tap "Save Offline" for later sync

### Offline Workflow

When offline:
1. Inspections saved to device storage
2. Red "Offline" badge displayed
3. "Submit" button disabled
4. Use "Save Offline" instead

When back online:
1. Green "Online" badge appears
2. Sync saved inspections manually
3. Or wait for automatic sync

## Database Setup

**IMPORTANT**: Due to database policy limits, create the inspections table manually:

```sql
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id UUID,
  inspector_name TEXT,
  items JSONB,
  general_notes TEXT,
  signature TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspections_vessel ON inspections(vessel_id);
```

## Mobile Optimization

- Touch-optimized interface
- Large tap targets
- Responsive design
- Works on phones and tablets
- Camera integration
- Gesture support for signatures

## Security

- Signatures stored as base64 images
- Offline data encrypted in localStorage
- Automatic sync when online
- Inspection records timestamped

## Best Practices

1. **Before Inspection**
   - Ensure camera permissions granted
   - Test offline mode
   - Verify vessel QR codes readable

2. **During Inspection**
   - Complete all checklist items
   - Add detailed notes for deficiencies
   - Take photos if needed (future feature)
   - Sign before submission

3. **After Inspection**
   - Submit immediately if online
   - Save offline if no connection
   - Sync when back in coverage area
   - Verify submission successful

## Troubleshooting

**Camera not working:**
- Check browser permissions
- Use HTTPS connection
- Try different browser

**Can't submit:**
- Check online status
- Use "Save Offline" instead
- Sync later when online

**Signature not saving:**
- Draw signature completely
- Ensure you tap "Save"
- Try clearing and redrawing

## Future Enhancements

- Photo capture for deficiencies
- GPS location tracking
- Weather conditions logging
- PDF report generation
- Email inspection reports
- Multi-language support
