# Enhanced Captain Management System Specification

## Critical Features Analysis & Implementation Plan

---

## 1. DOCUMENT MANAGEMENT SYSTEM ✅

### Overview
Captains must be able to purchase, renew, and manage all required maritime documents and certifications directly through the platform.

### Required Documents
- **USCG Captain's License** (OUPV, Master, etc.)
- **TWIC Card** (Transportation Worker Identification Credential)
- **Medical Certificate**
- **Drug Testing Certification**
- **First Aid/CPR Certification**
- **State Fishing Licenses**
- **Business Insurance Documents**
- **Vessel Documentation**
- **Training Academy Certificates**

### Features

#### A. Purchase New Documents
```javascript
// Purchase flow
{
  documentType: 'USCG_LICENSE' | 'TWIC' | 'MEDICAL' | 'DRUG_TEST' | 'FIRST_AID' | 'FISHING_LICENSE' | 'INSURANCE' | 'VESSEL_DOC',
  action: 'purchase',
  details: {
    licenseType: 'OUPV' | 'MASTER_100' | 'MASTER_200',
    duration: '1_year' | '5_years',
    rushProcessing: boolean,
    upgradeFromExisting: string // existing license ID if upgrading
  },
  payment: {
    amount: number,
    method: 'credit_card' | 'ach' | 'wire',
    invoiceNeeded: boolean
  }
}
```

**Purchase Process:**
1. Captain selects document type from dashboard
2. System checks for prerequisites (e.g., medical cert required for license renewal)
3. Captain uploads required documents/photos
4. Payment processing with invoice generation
5. Application submission to appropriate authority (USCG, TSA, etc.)
6. Status tracking with email notifications
7. Document delivery (digital + physical mail if required)

#### B. Renew Existing Documents
```javascript
// Renewal flow
{
  documentId: 'uuid',
  action: 'renew',
  renewalType: 'standard' | 'early' | 'late',
  updates: {
    addressChange: boolean,
    nameChange: boolean,
    upgradeRequested: boolean,
    additionalEndorsements: string[]
  },
  requiredDocs: {
    medicalCert: File,
    drugTest: File,
    trainingProof: File[]
  }
}
```

**Renewal Features:**
- Automated renewal reminders (90 days, 60 days, 30 days, 1 week before expiration)
- One-click renewal for documents with no changes
- Bulk renewal for multiple expiring documents
- Grace period tracking for late renewals
- Penalty fee calculation for expired documents
- Continuing education hour tracking

**Renewal Timeline Dashboard:**
```
┌─────────────────────────────────────────────────────┐
│ DOCUMENT RENEWAL STATUS                              │
├─────────────────────────────────────────────────────┤
│ USCG License (Master 100T)          ⚠️  45 days      │
│ ├─ Expires: Jan 15, 2026                            │
│ └─ [Renew Now] [Set Reminder]                       │
│                                                      │
│ Medical Certificate                 ✅  Valid        │
│ ├─ Expires: Mar 22, 2026                            │
│ └─ 121 days remaining                               │
│                                                      │
│ TWIC Card                           🔴  EXPIRED     │
│ ├─ Expired: Oct 1, 2025                             │
│ └─ [Renew Immediately] $125 late fee applies        │
│                                                      │
│ First Aid/CPR                       ⏰  15 days      │
│ ├─ Expires: Dec 6, 2025                             │
│ └─ [Schedule Training] [Upload Certificate]         │
└─────────────────────────────────────────────────────┘
```

#### C. Delete/Archive Documents
```javascript
// Deletion rules and process
{
  documentId: 'uuid',
  action: 'delete' | 'archive',
  reason: 'EXPIRED' | 'REPLACED' | 'REVOKED' | 'ERROR' | 'NO_LONGER_NEEDED',
  confirmations: {
    acknowledgeCoastGuardRequirement: boolean,
    retentionPeriodWaived: boolean,
    backupSaved: boolean
  }
}
```

**Deletion Policy:**
- ⚠️ **Active documents cannot be deleted** - only archived
- Expired documents moved to archive after 7 years (federal requirement)
- Replaced documents automatically archived with reference to new version
- Captains can permanently delete documents older than 7 years
- Archive includes full audit trail (who, when, why)
- Deleted documents kept in system backup for 30 days (recovery option)

**Audit Trail Example:**
```
Document: USCG License #123456
├─ Issued: Jan 15, 2021 by USCG
├─ Renewed: Jan 10, 2026 (replaced #123456)
├─ Archived: Jan 10, 2026 by System (auto)
└─ Status: Archived (superseded by #789012)
```

### Database Schema for Document Management

```sql
-- Documents table
CREATE TABLE captain_documents (
  id UUID PRIMARY KEY,
  captain_id UUID REFERENCES captains(id),
  document_type VARCHAR(50) NOT NULL,
  document_number VARCHAR(100) UNIQUE,
  issue_date DATE NOT NULL,
  expiration_date DATE,
  issuing_authority VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active', -- active, expired, revoked, archived, pending
  file_url TEXT NOT NULL, -- encrypted storage URL
  file_hash VARCHAR(64), -- SHA-256 for verification
  thumbnail_url TEXT,
  
  -- Purchase/Renewal tracking
  purchase_date TIMESTAMP,
  purchase_amount DECIMAL(10,2),
  renewal_count INTEGER DEFAULT 0,
  next_renewal_date DATE,
  renewal_reminder_sent BOOLEAN DEFAULT FALSE,
  
  -- Deletion/Archive
  archived_date TIMESTAMP,
  archived_by UUID,
  archived_reason TEXT,
  deletion_eligible_date DATE, -- 7 years after expiration
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document transactions (purchases/renewals)
CREATE TABLE document_transactions (
  id UUID PRIMARY KEY,
  captain_id UUID REFERENCES captains(id),
  document_id UUID REFERENCES captain_documents(id),
  transaction_type VARCHAR(20), -- purchase, renewal, upgrade, replacement
  amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  payment_status VARCHAR(20),
  invoice_number VARCHAR(50),
  confirmation_number VARCHAR(100),
  
  -- Application tracking
  application_status VARCHAR(50), -- submitted, in_review, approved, rejected
  submitted_date TIMESTAMP,
  approval_date TIMESTAMP,
  rejection_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Document audit log
CREATE TABLE document_audit_log (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES captain_documents(id),
  action VARCHAR(50), -- created, viewed, updated, renewed, archived, deleted, downloaded
  performed_by UUID, -- captain_id or admin_id
  performed_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  coast_guard_access BOOLEAN DEFAULT FALSE -- flag if accessed during CG inspection
);
```

---

## 2. OFFLINE MODE FOR COAST GUARD INSPECTIONS ✅

### Overview
**Federal Requirement:** Captains must be able to present all documents during Coast Guard boardings, even without internet connectivity.

### Technical Implementation

#### A. Progressive Web App (PWA)
```javascript
// Service Worker for offline functionality
const CACHE_NAME = 'captain-docs-v1';
const OFFLINE_DOCUMENTS = [
  '/offline-dashboard',
  '/documents/all',
  '/licenses/view',
  '/certifications/view',
  '/vessel-docs/view'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_DOCUMENTS);
    })
  );
});

// Offline document access
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/documents/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

#### B. Local Storage Strategy
```javascript
// IndexedDB for document storage
const DB_NAME = 'CaptainDocumentsDB';
const DB_VERSION = 1;

const documentStore = {
  // Store complete document data
  saveDocumentOffline: async (document) => {
    const db = await openDB(DB_NAME, DB_VERSION);
    await db.put('documents', {
      id: document.id,
      type: document.type,
      data: document.data,
      imageData: document.imageData, // Base64 encoded
      pdfData: document.pdfData, // Base64 encoded
      lastSync: Date.now(),
      expirationDate: document.expirationDate
    });
  },
  
  // Retrieve for offline viewing
  getDocumentOffline: async (documentId) => {
    const db = await openDB(DB_NAME, DB_VERSION);
    return await db.get('documents', documentId);
  },
  
  // Sync status
  checkSyncStatus: async () => {
    const db = await openDB(DB_NAME, DB_VERSION);
    const docs = await db.getAll('documents');
    return {
      totalDocuments: docs.length,
      lastSync: Math.min(...docs.map(d => d.lastSync)),
      needsSync: docs.some(d => Date.now() - d.lastSync > 24 * 60 * 60 * 1000)
    };
  }
};
```

#### C. Offline Document Viewer

**Features:**
- View all licenses and certifications without internet
- High-resolution document images cached locally
- QR codes for quick Coast Guard scanning
- Vessel documentation accessible offline
- Training certificates available offline
- GPS coordinates stored locally (see section 3)

**Offline Dashboard UI:**
```
┌─────────────────────────────────────────────────────┐
│ 📱 OFFLINE MODE ACTIVE                               │
│ Last Sync: 2 hours ago                              │
│ [Sync Now When Online]                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 🛟 USCG LICENSE                                      │
│ ┌───────────────────────────────────────────┐      │
│ │ [High-res document image]                  │      │
│ │ Master 100 Ton                             │      │
│ │ #123456                                    │      │
│ │ Expires: Jan 15, 2026                      │      │
│ │                                            │      │
│ │ [QR Code]                                  │      │
│ └───────────────────────────────────────────┘      │
│ [View Full Size] [Share with CG]                    │
│                                                      │
│ 🆔 TWIC CARD                                         │
│ ┌───────────────────────────────────────────┐      │
│ │ [Card image front/back]                    │      │
│ │ Valid through: Dec 2027                    │      │
│ └───────────────────────────────────────────┘      │
│                                                      │
│ 🏥 MEDICAL CERTIFICATE                               │
│ 📜 VESSEL DOCUMENTATION                              │
│ ⚓ INSURANCE CERTIFICATE                             │
│                                                      │
│ [Emergency Contact Info]                            │
│ [Vessel Safety Equipment List]                      │
└─────────────────────────────────────────────────────┘
```

#### D. Coast Guard Quick Access Mode

**Special "CG Inspection Mode":**
```javascript
// Activated by button press or voice command
const coastGuardMode = {
  enable: () => {
    // 1. Lock screen to prevent accidental navigation
    // 2. Display all required documents in order
    // 3. Enable quick swipe between documents
    // 4. Boost screen brightness
    // 5. Keep screen awake
    // 6. Log access in audit trail
    
    displayDocuments([
      'USCG_LICENSE',
      'TWIC_CARD',
      'MEDICAL_CERTIFICATE',
      'VESSEL_DOCUMENTATION',
      'INSURANCE_CERTIFICATE',
      'FISHING_LICENSE'
    ]);
    
    logCoastGuardAccess({
      timestamp: Date.now(),
      location: navigator.geolocation.getCurrentPosition(),
      documentsViewed: [],
      duration: startTimer()
    });
  },
  
  // Voice-activated for hands-free operation
  voiceCommands: {
    'show license': () => displayDocument('USCG_LICENSE'),
    'show TWIC': () => displayDocument('TWIC_CARD'),
    'show medical': () => displayDocument('MEDICAL_CERTIFICATE'),
    'show insurance': () => displayDocument('INSURANCE_CERTIFICATE'),
    'show vessel docs': () => displayDocument('VESSEL_DOCUMENTATION')
  }
};
```

#### E. Sync Management

**Background Sync:**
```javascript
// Register background sync
navigator.serviceWorker.ready.then((registration) => {
  registration.sync.register('sync-documents');
});

// Sync handler
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-documents') {
    event.waitUntil(syncAllDocuments());
  }
});

async function syncAllDocuments() {
  const documentsToSync = await getUnsyncedDocuments();
  
  for (const doc of documentsToSync) {
    try {
      const latest = await fetchLatestVersion(doc.id);
      await updateLocalCopy(latest);
    } catch (error) {
      // Queue for retry
      await queueForRetry(doc.id);
    }
  }
}
```

**Sync Indicators:**
- Green dot: All documents synced (< 1 hour ago)
- Yellow dot: Sync needed (1-24 hours ago)
- Red dot: Sync required (> 24 hours ago)
- Automatic sync when online
- Manual sync button available
- Download all documents for extended offline periods

---

## 3. GPS COORDINATE PINNING ✅

### Overview
Captains need to save and manage GPS coordinates for fishing spots, incident locations, safety zones, and navigation waypoints.

### Features

#### A. Coordinate Pin Types
```javascript
const pinTypes = {
  FISHING_SPOT: {
    icon: '🎣',
    color: '#4CAF50',
    fields: ['depth', 'species', 'seasonalInfo', 'tide', 'bottom_type']
  },
  INCIDENT: {
    icon: '⚠️',
    color: '#FF5252',
    fields: ['incident_type', 'coast_guard_notified', 'report_number', 'casualties']
  },
  HAZARD: {
    icon: '⚡',
    color: '#FFC107',
    fields: ['hazard_type', 'severity', 'reported_to_uscg', 'valid_until']
  },
  WAYPOINT: {
    icon: '📍',
    color: '#2196F3',
    fields: ['waypoint_name', 'route_name', 'notes']
  },
  MARINA: {
    icon: '⚓',
    color: '#9C27B0',
    fields: ['marina_name', 'fuel_available', 'amenities', 'contact']
  },
  REEF: {
    icon: '🪸',
    color: '#00BCD4',
    fields: ['reef_name', 'depth_range', 'visibility', 'dive_site']
  },
  WRECK: {
    icon: '🚢',
    color: '#607D8B',
    fields: ['wreck_name', 'depth', 'dive_info', 'historical_notes']
  }
};
```

#### B. GPS Pin Management Interface

```javascript
// Create new pin
const createGPSPin = {
  // Auto-capture current location
  captureCurrentLocation: async () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          });
        },
        reject,
        { enableHighAccuracy: true }
      );
    });
  },
  
  // Manual entry
  manualEntry: (lat, lon) => {
    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      entryMethod: 'manual',
      timestamp: Date.now()
    };
  },
  
  // Import from chart plotter
  importFromDevice: async (deviceType) => {
    // Support for Garmin, Lowrance, Simrad, etc.
  }
};

// Save pin with metadata
const saveGPSPin = async (pinData) => {
  const pin = {
    id: generateUUID(),
    captain_id: currentCaptain.id,
    type: pinData.type,
    coordinates: {
      latitude: pinData.latitude,
      longitude: pinData.longitude,
      altitude: pinData.altitude
    },
    
    // Location details
    name: pinData.name,
    description: pinData.description,
    category: pinData.category,
    tags: pinData.tags,
    
    // Fishing-specific data
    depth: pinData.depth,
    species: pinData.species,
    bottom_type: pinData.bottom_type,
    structure: pinData.structure,
    seasonal_notes: pinData.seasonal_notes,
    best_tide: pinData.best_tide,
    best_time: pinData.best_time,
    
    // Safety data
    hazards: pinData.hazards,
    current_strength: pinData.current_strength,
    wind_exposure: pinData.wind_exposure,
    
    // Success tracking
    trips_to_location: 0,
    last_visited: null,
    success_rate: null,
    fish_caught: [],
    
    // Privacy
    private: pinData.private, // Don't share with other captains
    share_with_crew: pinData.share_with_crew,
    
    // Media
    photos: pinData.photos,
    videos: pinData.videos,
    
    // Offline availability
    available_offline: true,
    last_sync: Date.now(),
    
    created_at: Date.now(),
    updated_at: Date.now()
  };
  
  // Save to local storage (offline)
  await saveToIndexedDB('gps_pins', pin);
  
  // Sync to server when online
  if (navigator.onLine) {
    await syncToServer(pin);
  } else {
    await queueForSync(pin);
  }
  
  return pin;
};
```

#### C. Offline GPS Functionality

**Requirements:**
- All GPS pins must work completely offline
- No internet required for viewing, creating, or editing pins
- Background sync when connection available
- Export pins to external devices (chart plotters)

**Implementation:**
```javascript
// Offline GPS manager
const offlineGPS = {
  // Store all pins locally
  storage: {
    getAllPins: async () => {
      const db = await openDB('CaptainGPSDB', 1);
      return await db.getAll('pins');
    },
    
    savePinOffline: async (pin) => {
      const db = await openDB('CaptainGPSDB', 1);
      await db.put('pins', pin);
      
      // Mark for sync
      await db.put('sync_queue', {
        id: pin.id,
        action: 'create',
        data: pin,
        timestamp: Date.now()
      });
    },
    
    updatePinOffline: async (pinId, updates) => {
      const db = await openDB('CaptainGPSDB', 1);
      const pin = await db.get('pins', pinId);
      const updated = { ...pin, ...updates, updated_at: Date.now() };
      await db.put('pins', updated);
      
      await db.put('sync_queue', {
        id: pinId,
        action: 'update',
        data: updates,
        timestamp: Date.now()
      });
    },
    
    deletePinOffline: async (pinId) => {
      const db = await openDB('CaptainGPSDB', 1);
      await db.delete('pins', pinId);
      
      await db.put('sync_queue', {
        id: pinId,
        action: 'delete',
        timestamp: Date.now()
      });
    }
  },
  
  // Background position tracking
  startTracking: () => {
    navigator.geolocation.watchPosition(
      (position) => {
        // Store breadcrumb trail for trip replay
        storeBreadcrumb({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          timestamp: position.timestamp,
          speed: position.coords.speed,
          heading: position.coords.heading
        });
      },
      null,
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }
};
```

#### D. GPS Pin Map Interface

```
┌─────────────────────────────────────────────────────┐
│ 🗺️  GPS COORDINATES & FISHING SPOTS                 │
├─────────────────────────────────────────────────────┤
│ [View: Map] [List] [Grid]    🔍 Search    [+ New]   │
│                                                      │
│ ┌───────────────────────────────────────────┐      │
│ │                   MAP VIEW                 │      │
│ │                                            │      │
│ │        🎣 Grouper Spot #1                  │      │
│ │                                            │      │
│ │  ⚓                     🪸                  │      │
│ │                                            │      │
│ │              📍          🎣                │      │
│ │                                            │      │
│ │  🎣                            ⚠️          │      │
│ │                                            │      │
│ │        Your Location: 📱                   │      │
│ │        30.3965° N, 87.2169° W             │      │
│ └───────────────────────────────────────────┘      │
│                                                      │
│ RECENT PINS:                                        │
│ 🎣 Secret Grouper Hole                              │
│    30.1234° N, 87.5678° W • 85ft depth             │
│    Last visited: 3 days ago • 12 fish caught        │
│    [Navigate] [Edit] [Share]                        │
│                                                      │
│ ⚠️ Submerged Debris - HAZARD                        │
│    30.2345° N, 87.6789° W                          │
│    Reported to USCG: Yes (Case #2025-1234)         │
│    [View Details] [Update Status]                   │
│                                                      │
│ 🪸 Artificial Reef Site                             │
│    30.3456° N, 87.7890° W • 45-60ft                │
│    Species: Snapper, Grouper, Amberjack             │
│    [Navigate] [Log Catch]                           │
└─────────────────────────────────────────────────────┘

FILTERS: [🎣 Fishing] [⚠️ Hazards] [⚓ Marinas] [🪸 Reefs]
OFFLINE MODE: ✅ All pins available offline
```

#### E. Coast Guard Incident Reporting

**Special feature for safety/incident pins:**
```javascript
const incidentReporting = {
  createIncidentPin: async (incidentData) => {
    const pin = await createGPSPin({
      type: 'INCIDENT',
      ...incidentData,
      coordinates: await captureCurrentLocation(),
      
      // Incident details
      incident_type: incidentData.type, // collision, grounding, injury, etc.
      severity: incidentData.severity, // minor, serious, critical
      casualties: incidentData.casualties,
      vessel_damage: incidentData.vessel_damage,
      
      // Coast Guard
      coast_guard_notified: true,
      cg_case_number: incidentData.cg_case_number,
      cg_unit_responded: incidentData.cg_unit,
      
      // Required report fields
      weather_conditions: incidentData.weather,
      sea_state: incidentData.sea_state,
      visibility: incidentData.visibility,
      
      // Automatic data
      timestamp: Date.now(),
      vessel_id: currentVessel.id,
      crew_on_board: getCurrentCrew(),
      passengers_on_board: getPassengerCount()
    });
    
    // Auto-generate Coast Guard report
    await generateUSCGReport(pin);
    
    // Store offline for later submission
    await saveForOfflineAccess(pin);
    
    return pin;
  },
  
  generateUSCGReport: async (incidentPin) => {
    // Generate CG-2692 (Report of Marine Casualty)
    // All data available offline
  }
};
```

#### F. Database Schema for GPS Pins

```sql
-- GPS pins table
CREATE TABLE gps_pins (
  id UUID PRIMARY KEY,
  captain_id UUID REFERENCES captains(id),
  
  -- Location
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude DECIMAL(8, 2),
  accuracy DECIMAL(8, 2),
  
  -- Classification
  pin_type VARCHAR(50) NOT NULL, -- fishing_spot, incident, hazard, waypoint, etc.
  name VARCHAR(200),
  description TEXT,
  category VARCHAR(100),
  tags TEXT[],
  
  -- Fishing data
  depth INTEGER, -- feet
  species TEXT[],
  bottom_type VARCHAR(50), -- rock, sand, mud, reef, etc.
  structure VARCHAR(50), -- wreck, reef, ledge, etc.
  seasonal_notes TEXT,
  best_tide VARCHAR(20), -- incoming, outgoing, slack, high, low
  best_time VARCHAR(50), -- dawn, dusk, night, etc.
  
  -- Safety data
  hazards TEXT[],
  hazard_severity VARCHAR(20),
  current_strength VARCHAR(20),
  wind_exposure VARCHAR(20),
  uscg_notified BOOLEAN DEFAULT FALSE,
  uscg_case_number VARCHAR(100),
  
  -- Usage tracking
  trips_to_location INTEGER DEFAULT 0,
  last_visited TIMESTAMP,
  total_fish_caught INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2),
  
  -- Privacy
  is_private BOOLEAN DEFAULT TRUE,
  share_with_crew BOOLEAN DEFAULT FALSE,
  shared_with_captains UUID[], -- array of captain IDs
  
  -- Media
  photos TEXT[], -- URLs to photos
  videos TEXT[], -- URLs to videos
  
  -- Offline sync
  available_offline BOOLEAN DEFAULT TRUE,
  last_synced TIMESTAMP,
  sync_status VARCHAR(20) DEFAULT 'synced',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- soft delete
);

-- Fishing logs tied to pins
CREATE TABLE fishing_logs (
  id UUID PRIMARY KEY,
  pin_id UUID REFERENCES gps_pins(id),
  captain_id UUID REFERENCES captains(id),
  trip_date DATE NOT NULL,
  
  -- Catch data
  species VARCHAR(100),
  quantity INTEGER,
  size_range VARCHAR(50),
  kept INTEGER,
  released INTEGER,
  
  -- Conditions
  weather VARCHAR(100),
  sea_state VARCHAR(50),
  water_temp INTEGER,
  tide VARCHAR(20),
  
  notes TEXT,
  photos TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Offline sync queue
CREATE TABLE gps_sync_queue (
  id UUID PRIMARY KEY,
  pin_id UUID REFERENCES gps_pins(id),
  action VARCHAR(20), -- create, update, delete
  data JSONB,
  retry_count INTEGER DEFAULT 0,
  last_attempt TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. LANGUAGE CAPABILITIES ✅

### Overview
Track and display languages spoken by captains for better customer matching and international charter operations.

### Features

#### A. Language Proficiency System

```javascript
const languageSystem = {
  // Supported languages
  languages: {
    'en': { name: 'English', native: 'English', flag: '🇺🇸' },
    'es': { name: 'Spanish', native: 'Español', flag: '🇪🇸' },
    'fr': { name: 'French', native: 'Français', flag: '🇫🇷' },
    'de': { name: 'German', native: 'Deutsch', flag: '🇩🇪' },
    'it': { name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
    'pt': { name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
    'ru': { name: 'Russian', native: 'Русский', flag: '🇷🇺' },
    'zh': { name: 'Chinese', native: '中文', flag: '🇨🇳' },
    'ja': { name: 'Japanese', native: '日本語', flag: '🇯🇵' },
    'ko': { name: 'Korean', native: '한국어', flag: '🇰🇷' },
    'ar': { name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
    'hi': { name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' }
  },
  
  // Proficiency levels (CEFR standard)
  proficiencyLevels: {
    'NATIVE': {
      label: 'Native',
      description: 'Native or bilingual proficiency',
      icon: '⭐⭐⭐⭐⭐'
    },
    'FLUENT': {
      label: 'Fluent',
      description: 'Full professional proficiency',
      icon: '⭐⭐⭐⭐'
    },
    'PROFESSIONAL': {
      label: 'Professional',
      description: 'Professional working proficiency',
      icon: '⭐⭐⭐'
    },
    'INTERMEDIATE': {
      label: 'Intermediate',
      description: 'Limited working proficiency',
      icon: '⭐⭐'
    },
    'BASIC': {
      label: 'Basic',
      description: 'Elementary proficiency',
      icon: '⭐'
    }
  }
};
```

#### B. Captain Language Profile

```javascript
// Add language to captain profile
const addLanguage = async (captainId, languageData) => {
  return {
    captain_id: captainId,
    language_code: languageData.code, // ISO 639-1 code
    proficiency_level: languageData.proficiency, // NATIVE, FLUENT, etc.
    
    // Skills breakdown
    speaking: languageData.speaking, // 1-5 scale
    listening: languageData.listening,
    reading: languageData.reading,
    writing: languageData.writing,
    
    // Certifications
    certifications: languageData.certifications, // TOEFL, DELE, etc.
    
    // Usage context
    use_for_business: languageData.use_for_business,
    years_of_experience: languageData.years,
    
    // Verification
    verified: false, // Admin or test verification
    verified_date: null,
    verified_by: null,
    
    // Display
    display_on_profile: true,
    primary_language: languageData.is_primary || false,
    
    created_at: Date.now(),
    updated_at: Date.now()
  };
};
```

#### C. Language Display on Captain Profile

```
┌─────────────────────────────────────────────────────┐
│ Captain John Smith                                   │
│ ⭐⭐⭐⭐⭐ 4.9 (247 reviews)                           │
├─────────────────────────────────────────────────────┤
│ 🗣️ LANGUAGES SPOKEN:                                 │
│                                                      │
│ 🇺🇸 English          ⭐⭐⭐⭐⭐ Native                │
│ 🇪🇸 Spanish (Español) ⭐⭐⭐⭐ Fluent                 │
│ 🇫🇷 French (Français) ⭐⭐⭐ Professional              │
│ 🇩🇪 German (Deutsch)  ⭐⭐ Intermediate               │
│                                                      │
│ ✅ Verified language proficiency                     │
│                                                      │
│ 💬 Can conduct full charter operations in English    │
│    and Spanish, including safety briefings, fishing  │
│    instruction, and emergency communications.        │
└─────────────────────────────────────────────────────┘
```

#### D. Language Search & Filtering

**Customer-facing features:**
- Filter captains by language proficiency
- Search for multilingual captains
- Match customers with language-compatible captains
- Display languages prominently in search results

```javascript
// Search filter
const searchCaptainsByLanguage = {
  filters: {
    languages: ['en', 'es'], // Must speak English OR Spanish
    minimum_proficiency: 'PROFESSIONAL',
    verified_only: true
  },
  
  // Results show language compatibility score
  results: [
    {
      captain_id: 'uuid',
      name: 'John Smith',
      languages: [
        { code: 'en', proficiency: 'NATIVE', verified: true },
        { code: 'es', proficiency: 'FLUENT', verified: true }
      ],
      language_match_score: 100, // Perfect match
      can_communicate_in: ['en', 'es']
    }
  ]
};
```

#### E. Multilingual Safety Briefings

**Critical feature for international customers:**
```javascript
const safetyBriefings = {
  // Pre-recorded safety briefings in multiple languages
  languages: ['en', 'es', 'fr', 'de', 'pt', 'zh', 'ja'],
  
  // Captain can play appropriate language version
  playBriefing: (languageCode) => {
    return {
      video_url: `/safety-briefings/${languageCode}/standard.mp4`,
      pdf_url: `/safety-briefings/${languageCode}/standard.pdf`,
      duration: '5 minutes',
      topics: [
        'Life jacket demonstration',
        'Emergency procedures',
        'Radio communication',
        'Man overboard protocol',
        'Fire safety',
        'First aid kit location'
      ]
    };
  },
  
  // Printed materials available offline
  printedMaterials: {
    available_offline: true,
    formats: ['pdf', 'printable'],
    update_frequency: 'annual'
  }
};
```

#### F. Language Verification System

**Ensure accurate language claims:**
```javascript
const languageVerification = {
  methods: {
    // 1. Self-assessment with CEFR guidelines
    selfAssessment: {
      questions: 25,
      areas: ['speaking', 'listening', 'reading', 'writing'],
      time: '15 minutes'
    },
    
    // 2. Video interview with native speaker
    videoInterview: {
      conducted_by: 'certified_interviewer',
      duration: '10 minutes',
      topics: ['maritime_safety', 'customer_service', 'technical_terms'],
      recorded: true
    },
    
    // 3. Official certification upload
    certificationUpload: {
      accepted: ['TOEFL', 'IELTS', 'DELE', 'DELF', 'TestDaF', 'JLPT'],
      verification: 'manual_review',
      validity_period: '2 years'
    },
    
    // 4. Customer feedback
    customerReviews: {
      language_communication_rating: true,
      verified_bookings_only: true,
      minimum_reviews: 5
    }
  },
  
  // Verified badge on profile
  displayVerification: {
    badge: '✅ Language Verified',
    tooltip: 'Proficiency confirmed through testing and customer feedback',
    expires: '2 years'
  }
};
```

#### G. Database Schema for Languages

```sql
-- Captain languages table
CREATE TABLE captain_languages (
  id UUID PRIMARY KEY,
  captain_id UUID REFERENCES captains(id),
  
  -- Language details
  language_code VARCHAR(5) NOT NULL, -- ISO 639-1
  proficiency_level VARCHAR(20) NOT NULL, -- NATIVE, FLUENT, PROFESSIONAL, INTERMEDIATE, BASIC
  
  -- Skills breakdown (1-5 scale)
  speaking_level INTEGER CHECK (speaking_level >= 1 AND speaking_level <= 5),
  listening_level INTEGER CHECK (listening_level >= 1 AND listening_level <= 5),
  reading_level INTEGER CHECK (reading_level >= 1 AND reading_level <= 5),
  writing_level INTEGER CHECK (writing_level >= 1 AND writing_level <= 5),
  
  -- Experience
  years_of_experience INTEGER,
  use_for_business BOOLEAN DEFAULT TRUE,
  
  -- Certifications
  certification_type VARCHAR(50), -- TOEFL, IELTS, etc.
  certification_score VARCHAR(20),
  certification_date DATE,
  certification_document_url TEXT,
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_date TIMESTAMP,
  verified_by UUID, -- admin or interviewer ID
  verification_method VARCHAR(50), -- self_assessment, interview, certification, customer_feedback
  verification_expires DATE,
  
  -- Display
  display_on_profile BOOLEAN DEFAULT TRUE,
  primary_language BOOLEAN DEFAULT FALSE,
  
  -- Customer feedback
  customer_rating_avg DECIMAL(3, 2), -- Average language communication rating
  customer_rating_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(captain_id, language_code)
);

-- Language verification records
CREATE TABLE language_verification_records (
  id UUID PRIMARY KEY,
  captain_language_id UUID REFERENCES captain_languages(id),
  
  verification_type VARCHAR(50),
  verified_by UUID,
  verification_date TIMESTAMP,
  
  -- Interview details
  interview_recording_url TEXT,
  interviewer_notes TEXT,
  interview_score INTEGER,
  
  -- Test details
  test_name VARCHAR(100),
  test_score VARCHAR(50),
  test_date DATE,
  
  result VARCHAR(20), -- passed, failed, pending
  expires_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Multilingual content
CREATE TABLE multilingual_content (
  id UUID PRIMARY KEY,
  content_type VARCHAR(50), -- safety_briefing, terms, policy, etc.
  language_code VARCHAR(5),
  
  title TEXT,
  content TEXT,
  video_url TEXT,
  pdf_url TEXT,
  audio_url TEXT,
  
  available_offline BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMP,
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 5. IMPLEMENTATION PRIORITY

### Phase 1: Critical Features (Month 1)
1. ✅ **Offline document viewing** - Coast Guard compliance requirement
2. ✅ **Basic GPS pin creation** - Save fishing spots offline
3. ✅ **Document renewal reminders** - Prevent expired licenses

### Phase 2: Enhanced Features (Month 2)
4. ✅ **Document purchase/renewal system** - Full transaction flow
5. ✅ **Advanced GPS features** - Categories, filters, sharing
6. ✅ **Language profile system** - Add and display languages

### Phase 3: Advanced Features (Month 3)
7. ✅ **Document deletion/archiving** - Complete lifecycle management
8. ✅ **GPS incident reporting** - Coast Guard integration
9. ✅ **Language verification** - Ensure accurate proficiency claims
10. ✅ **Background sync** - Seamless online/offline transitions

---

## 6. MOBILE APP CONSIDERATIONS

### Native Features Required
- **GPS**: High-accuracy positioning for pin creation
- **Camera**: Document scanning and photo capture
- **Storage**: Large offline document cache
- **Background Sync**: Automatic updates when online
- **Push Notifications**: Renewal reminders, sync status
- **Biometric Auth**: Secure document access
- **Offline Maps**: Navigation without internet
- **Voice Commands**: Hands-free operation during charters

### Platform Support
- iOS 15+ (iPhone, iPad)
- Android 11+ (phones, tablets)
- Progressive Web App (PWA) for web browsers
- Responsive design for all screen sizes

---

## 7. COMPLIANCE & SECURITY

### Coast Guard Requirements
- All documents must be producible within 2 minutes
- Documents must be legible and authentic
- Electronic documents acceptable per 46 CFR 401.105
- Backup copies recommended
- Audit trail for all document access

### Data Security
- AES-256 encryption for stored documents
- TLS 1.3 for data transmission
- Biometric authentication recommended
- Automatic logout after inactivity
- Document access logging
- GDPR/CCPA compliance for personal data

### Privacy
- GPS pins marked private by default
- No sharing without explicit consent
- Customer language preferences kept confidential
- Document access restricted to captain and authorities
- Right to delete all personal data

---

## 8. SUCCESS METRICS

### Document Management
- 100% of active captains have current licenses uploaded
- Average renewal processed 30+ days before expiration
- 95% document availability during Coast Guard inspections
- <5% expired document rate

### Offline Functionality  
- 99.9% offline availability for core features
- <30 second document load time offline
- 100% of GPS pins accessible offline
- <24 hour sync lag for updated documents

### GPS System
- Average 50+ pins per active captain
- 90% of fishing trips logged with coordinates
- <10 meter GPS accuracy for pins
- 95% captain satisfaction with GPS features

### Language System
- 80% of captains list 2+ languages
- 100% of verified languages accurate
- 30% increase in international bookings
- 95% customer satisfaction with language communication

---

## CONCLUSION

These four critical features transform the captain management system from a basic training platform into a comprehensive operational tool:

1. **Document Management** - Ensures regulatory compliance and business continuity
2. **Offline Mode** - Meets federal requirements for Coast Guard inspections
3. **GPS Coordinates** - Protects valuable fishing spot knowledge and enhances safety
4. **Languages** - Opens international markets and improves customer experience

All features designed with offline-first architecture to ensure reliability in real-world maritime conditions where internet connectivity is often unavailable.
