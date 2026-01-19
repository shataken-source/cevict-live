# Compliance Dashboard Guide

## Overview
The Compliance Dashboard provides comprehensive fleet-wide document tracking, expiration monitoring, and regulatory compliance management. It includes PDF export functionality for Coast Guard inspections and audits.

## Features

### 1. Fleet-Wide Metrics
- **Total Vessels**: Complete count of all boats in the fleet
- **Compliant Vessels**: Vessels with 90%+ compliance rate
- **Expiring Soon**: Documents expiring within 30 days
- **Expired Documents**: Overdue documents requiring immediate attention
- **Overall Compliance**: Fleet-wide compliance percentage

### 2. Expiration Timeline
- Visual timeline of upcoming expirations (next 90 days)
- Color-coded urgency indicators:
  - **Red**: Expired or expiring within 7 days (Critical)
  - **Yellow**: Expiring within 30 days (Warning)
  - **Blue**: Expiring within 90 days (Upcoming)
- Sorted by urgency with most critical items first

### 3. Vessel Compliance Table
- Individual compliance status for each vessel
- Document counts by status (compliant, expiring, expired)
- Compliance percentage with visual progress bar
- Quick view button to access vessel details

### 4. Regulatory Requirements Tracking
- Standard Coast Guard requirements
- USCG Documentation
- Insurance Certificates
- Safety Equipment Inspections
- Fire Extinguisher Certifications

### 5. PDF Export for Audits
- One-click export to professional PDF report
- Includes all metrics and vessel status
- Upcoming expirations list
- Formatted for Coast Guard inspections
- Timestamped and ready for submission

## Usage

### Accessing the Dashboard
```typescript
import { ComplianceDashboard } from '@/components/ComplianceDashboard';

// In your app
<ComplianceDashboard />
```

### Refreshing Data
Click the "Refresh" button to reload the latest compliance data from the database.

### Exporting Reports
1. Click "Export PDF" button
2. Report generates with current fleet status
3. PDF downloads automatically
4. Use for Coast Guard inspections or internal audits

## Database Requirements

The dashboard requires these Supabase tables:

### boats table
```sql
- id (uuid)
- name (text)
- registration_number (text)
- created_at (timestamp)
```

### boat_documents table
```sql
- id (uuid)
- boat_id (uuid, foreign key to boats)
- document_type (text)
- expiration_date (date)
- status (text)
- created_at (timestamp)
```

## Compliance Calculations

### Vessel Compliance Percentage
```
Compliance % = (Compliant Docs + Expiring Docs) / Total Docs × 100
```

### Document Status Categories
- **Compliant**: Expiration date > 30 days away
- **Expiring**: Expiration date within 30 days
- **Expired**: Expiration date has passed

### Overall Fleet Compliance
```
Fleet Compliance % = Vessels with 90%+ compliance / Total Vessels × 100
```

## Color Coding System

### Compliance Levels
- **Green (90-100%)**: Excellent - Fully compliant
- **Yellow (70-89%)**: Good - Minor attention needed
- **Red (0-69%)**: Needs Attention - Immediate action required

### Urgency Indicators
- **Red Dot**: Expired or critical (< 7 days)
- **Yellow Dot**: Warning (8-30 days)
- **Blue Dot**: Upcoming (31-90 days)

## Best Practices

### Regular Monitoring
- Review dashboard weekly
- Address expired documents immediately
- Plan renewals 60 days in advance

### Pre-Inspection Preparation
1. Export PDF report 1 week before inspection
2. Review all red/yellow items
3. Update expired documents
4. Ensure all vessels show 90%+ compliance

### Document Management
- Upload documents as soon as received
- Set expiration dates accurately
- Enable email notifications for upcoming expirations
- Keep digital copies in Supabase storage

## Integration with Other Systems

### Fleet Management
The dashboard integrates with the Fleet Management system to pull vessel and document data.

### Notification System
Connects to email/SMS reminder systems for expiration alerts.

### Captain Dashboard
Captains can view their assigned vessel's compliance status.

## Troubleshooting

### No Data Showing
- Ensure boats are added to the `boats` table
- Verify documents are uploaded to `boat_documents` table
- Check Supabase connection

### PDF Export Fails
- Check that `compliance-report-pdf` edge function is deployed
- Verify CORS headers are configured
- Ensure browser allows downloads

### Incorrect Compliance Percentages
- Verify expiration dates are set correctly
- Check document status values
- Refresh the dashboard data

## Coast Guard Inspection Checklist

✅ All vessels have current USCG documentation
✅ Insurance certificates are valid and up-to-date
✅ Safety equipment inspections completed
✅ Fire extinguisher certifications current
✅ No expired documents in fleet
✅ PDF report generated and printed
✅ Overall compliance > 90%

## Support

For issues or questions about the Compliance Dashboard:
1. Check this guide first
2. Review the BOAT_DOCUMENTATION_GUIDE.md
3. Contact fleet management administrator
4. Review Supabase logs for errors

## Future Enhancements

Potential additions:
- Automated expiration email alerts
- OCR integration for document scanning (see OCR_INTEGRATION_REMINDER.md)
- Mobile app for on-site inspections
- Integration with Coast Guard API for verification
- Historical compliance tracking and trends
- Predictive analytics for renewal planning
