# Compliance Dashboard (No-BS)

Fleet-wide document and expiration tracking for boats, with PDF export for inspections/audits. This doc reflects what’s in the repo and what you need to run it.

---

## What’s in the repo

| Piece | Location | Notes |
|-------|----------|--------|
| **ComplianceDashboard** | `src/components/ComplianceDashboard.tsx` | Loads `boats` + `boat_documents` from Supabase; computes metrics and expiring list; renders ComplianceMetrics, ExpirationTimeline, VesselComplianceTable; Export PDF calls `compliance-report-pdf`. |
| **ComplianceMetrics** | `src/components/compliance/ComplianceMetrics.tsx` | Cards: total vessels, compliant vessels, expiring soon, expired, overall compliance %. |
| **ExpirationTimeline** | `src/components/compliance/ExpirationTimeline.tsx` | List of docs expiring in 90 days; color by urgency (red &lt;7d, yellow ≤30d, blue ≤90d). |
| **VesselComplianceTable** | `src/components/compliance/VesselComplianceTable.tsx` | Per-vessel compliance %, doc counts; “View details” links to `/fleet/:id`. |
| **compliance-report-pdf** | `supabase/functions/compliance-report-pdf/index.ts` | Accepts metrics + vessel list + expiring docs; returns `{ pdf: base64 }`. Uses pdf-lib. |
| **DB migration** | `supabase/migrations/20260210_boats_boat_documents.sql` | Creates `boats`, `boat_documents`, RLS. |

---

## Database

Run the migration so the dashboard has data to read:

- Apply `supabase/migrations/20260210_boats_boat_documents.sql`.

Tables:

- **boats** – id, name, registration_number, created_at. Dashboard uses id, name, registration_number.
- **boat_documents** – id, boat_id (FK boats), document_type, expiration_date, status, created_at. Compliance logic uses boat_id and expiration_date only (status is optional).

Compliance logic in the dashboard:

- **Compliant:** expiration_date &gt; 30 days from today.
- **Expiring:** 0 ≤ days until expiration ≤ 30.
- **Expired:** expiration_date in the past.
- **Vessel compliance %:** (compliant + expiring) / total docs × 100 (per vessel).
- **Compliant vessel:** vessel compliance ≥ 90%.
- **Overall fleet %:** (vessels with ≥90% compliance) / total vessels × 100.

---

## Where the dashboard is mounted

The dashboard is not wired in `App.tsx` in the snippet we saw. Mount it where you want (e.g. admin or fleet route), for example:

```tsx
import { ComplianceDashboard } from '@/components/ComplianceDashboard';
<ComplianceDashboard />
```

---

## PDF export

- **Flow:** User clicks “Export PDF” → frontend calls `compliance-report-pdf` with current metrics, vessel list, and expiring documents → function returns base64 PDF → browser downloads.
- **Deploy:** `supabase functions deploy compliance-report-pdf`.
- **Dependencies:** pdf-lib via esm.sh; no extra env vars.

If export fails: confirm the function is deployed, CORS, and that the request body matches what the function expects (metrics, vessels, expiringDocuments, generatedDate).

---

## Relation to other tables

- The app also has **vessels** (e.g. from `20260119_vessels.sql`) for charter/listings. **boats** here is for compliance only. You can keep boats and vessels in sync or treat boats as the compliance-specific list; the dashboard does not read from vessels.
- Notifications (email/SMS for expirations) are not part of this component; add them via cron or your notification system if needed.

---

## Checklist (e.g. for Coast Guard)

- All vessels in **boats** have documents in **boat_documents** as required.
- USCG documentation, insurance, safety equipment, fire extinguisher, etc. are reflected as document_type rows with correct expiration_date.
- No expired documents left unaddressed.
- Export PDF and use for inspection/audit as needed.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| No data | `boats` and `boat_documents` exist and have rows; RLS allows read. |
| PDF export fails | Deploy `compliance-report-pdf`; check Supabase function logs; confirm response shape (pdf base64). |
| Wrong percentages | Expiration dates and timezone; Refresh to recalc from current data. |

---

**Last updated:** February 2026 (no-BS pass).  
**See also:** `BOAT_DOCUMENTATION_GUIDE.md` if you have it; `COMPREHENSIVE_PLATFORM_GUIDE.md` (no-BS).
