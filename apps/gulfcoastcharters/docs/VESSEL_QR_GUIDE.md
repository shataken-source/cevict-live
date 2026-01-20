# Vessel QR Code Generator Guide

## Overview

The Vessel QR Code Generator allows boat owners and captains to create unique QR codes for each vessel. These QR codes encode vessel registration, documentation numbers, and compliance data for quick identification during Coast Guard inspections.

## Features

### 1. QR Code Generation
- Unique QR codes for each vessel
- Encodes vessel ID, name, registration, and documentation numbers
- High-resolution 512x512 pixel codes
- Timestamp for verification

### 2. Printable Labels
- Three label sizes: Small (2"x2"), Medium (4"x4"), Large (6"x6")
- Professional layout with vessel information
- Print-optimized styling
- Durable format for outdoor mounting

### 3. Export Options
- Download as PNG image
- Direct print from browser
- High-quality output for professional printing services

## Usage

### For Boat Owners

1. **Generate QR Code**
   - Navigate to Fleet Management > QR Code Generator
   - Select your vessel from dropdown
   - Choose label size (medium recommended)
   - QR code generates automatically

2. **Print Labels**
   - Click "Print Label" for direct printing
   - Or download PNG for professional printing
   - Use weather-resistant label paper
   - Laminate for extra durability

3. **Mount on Vessel**
   - Place in visible location (helm, transom)
   - Ensure accessible to inspectors
   - Keep clean and readable
   - Replace if damaged or faded

### For Coast Guard Officers

1. **Scan QR Code**
   - Open inspection interface
   - Tap "Start Scan"
   - Point camera at vessel QR code
   - Vessel data loads automatically

2. **Verify Information**
   - Check registration matches physical documentation
   - Verify documentation number
   - Review compliance status
   - Begin inspection checklist

## QR Code Data Structure

Each QR code contains:
```json
{
  "vesselId": "uuid",
  "name": "Vessel Name",
  "registration": "ABC-1234",
  "documentation": "1234567",
  "timestamp": "2025-11-17T09:00:00Z"
}
```

## Label Specifications

### Small (2" x 2")
- Ideal for: Small boats, dinghies, PWCs
- QR size: 1.5" square
- Text: Minimal (name + reg only)

### Medium (4" x 4") - Recommended
- Ideal for: Most recreational boats
- QR size: 3" square
- Text: Full vessel information
- Scannable from 3-5 feet

### Large (6" x 6")
- Ideal for: Commercial vessels, charters
- QR size: 5" square
- Text: Complete details
- Scannable from 5-10 feet

## Printing Tips

### Home Printing
- Use weather-resistant label paper
- Set printer to highest quality
- Use color mode for best contrast
- Laminate after printing

### Professional Printing
- Download PNG at full resolution
- Request outdoor-grade vinyl
- UV-resistant ink recommended
- Consider adhesive backing

## Mounting Locations

**Best Locations:**
- Helm station (primary)
- Transom (backup)
- Engine compartment door
- Document storage area

**Avoid:**
- Direct sunlight exposure
- Areas prone to spray/splash
- High-traffic wear areas
- Below waterline

## Maintenance

- Inspect monthly for damage
- Clean with mild soap and water
- Replace if faded or cracked
- Keep backup labels onboard

## Security & Privacy

- QR codes contain only basic vessel info
- No owner personal data encoded
- Compliance data requires database access
- Timestamp prevents code replication

## Troubleshooting

**QR Code Won't Generate?**
- Check vessel has registration number
- Verify internet connection
- Refresh page and try again

**Print Quality Poor?**
- Increase printer quality settings
- Use photo paper for better results
- Download PNG for professional printing

**Scanner Can't Read Code?**
- Clean QR code surface
- Improve lighting conditions
- Move camera closer/farther
- Replace damaged label

## Integration

The QR codes integrate with:
- Coast Guard Inspection Interface
- Compliance Dashboard
- Fleet Management System
- Document Verification System

## Best Practices

1. Generate new codes annually
2. Keep digital backups
3. Print multiple copies
4. Document mounting locations
5. Train crew on QR system
6. Include in vessel documentation

## Regulatory Compliance

- QR codes supplement (not replace) required documentation
- Must still display registration numbers per regulations
- Codes assist inspections but don't satisfy legal requirements
- Keep physical documents onboard

## Support

For issues or questions:
- Check vessel registration is current
- Verify printer settings
- Contact fleet management
- Review Coast Guard inspection guide
