'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * FIELD OFFICER DASHBOARD
 * 
 * Mobile-optimized, high-contrast UI for Animal Control and Law Enforcement
 * 
 * Features:
 * - Quick photo capture
 * - GPS location auto-detect
 * - Deep Scan against PetReunion database
 * - Instant Match Alerts (>85% confidence = owner contact revealed)
 * - Return to Owner (RTO) documentation
 * 
 * Design Principles:
 * - High contrast for outdoor visibility
 * - Large touch targets for gloved hands
 * - No distracting social features
 * - Data-focused professional interface
 */

interface OfficerStats {
  totalScans: number;
  totalMatches: number;
  totalRtos: number;
  activeEncounters?: number;
  matchRate?: number;
}

interface PetMatch {
  petId: number;
  petName: string;
  petType: string;
  breed?: string;
  color?: string;
  confidence: number;
  lastSeenLocation?: string;
  daysLost?: number;
  photoUrl?: string;
}

interface OwnerContact {
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  homeAddress?: string;
  petMedicalNotes?: string;
  approachInstructions?: string;
}

interface ScanResult {
  success: boolean;
  scanId: number;
  processingTimeMs: number;
  matchesFound: number;
  matches: PetMatch[];
  highConfidenceMatch: boolean;
  ownerContact?: OwnerContact;
  message: string;
  encounterId?: number;
}

interface Encounter {
  id: number;
  petType: string;
  petBreed?: string;
  petColor?: string;
  matchedPetId?: number;
  matchConfidence?: number;
  outcome?: string;
  status: string;
  createdAt: string;
}

interface FieldOfficerDashboardProps {
  userId: string;
  officerName?: string;
  departmentName?: string;
  isVerified?: boolean;
}

export default function FieldOfficerDashboard({ 
  userId, 
  officerName,
  departmentName,
  isVerified = false
}: FieldOfficerDashboardProps) {
  // State
  const [view, setView] = useState<'scan' | 'result' | 'history'>('scan');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [stats, setStats] = useState<OfficerStats | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lon: number; address?: string } | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Get GPS location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (err) => {
          console.warn('GPS error:', err.message);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Load stats and encounters
  useEffect(() => {
    if (isVerified) {
      loadEncounters();
    }
  }, [isVerified, userId]);

  const loadEncounters = async () => {
    try {
      const response = await fetch(`/api/petreunion/officer/encounters?userId=${userId}&limit=10`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setEncounters(data.encounters || []);
      }
    } catch (err) {
      console.error('Failed to load encounters:', err);
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setUseCamera(true);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera');
    }
  };

  const captureFromCamera = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedPhoto(file);
          setPhotoPreview(URL.createObjectURL(blob));
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  }, []);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setUseCamera(false);
  };

  // File upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // DEEP SCAN
  const performDeepScan = async () => {
    if (!capturedPhoto || !location) {
      setError('Photo and GPS location required');
      return;
    }

    setIsScanning(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('photo', capturedPhoto);
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lon.toString());
      if (location.address) {
        formData.append('address', location.address);
      }

      const response = await fetch('/api/petreunion/officer/scan', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Scan failed');
      }

      setScanResult(data);
      setView('result');

    } catch (err: any) {
      setError(err.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  // Record RTO
  const recordRTO = async () => {
    if (!scanResult?.encounterId) return;

    try {
      const response = await fetch('/api/petreunion/officer/rto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          encounterId: scanResult.encounterId,
          ownerIdVerified: true,
          ownerSignatureCaptured: true
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('✓ RTO Recorded Successfully!');
        resetScan();
        loadEncounters();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Reset
  const resetScan = () => {
    setCapturedPhoto(null);
    setPhotoPreview(null);
    setScanResult(null);
    setView('scan');
    setError('');
  };

  // Not verified screen
  if (!isVerified) {
    return (
      <div style={styles.container}>
        <div style={styles.pendingCard}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ color: '#fbbf24', marginBottom: '0.5rem' }}>ACCOUNT PENDING</h2>
          <p style={{ color: '#9ca3af' }}>
            Your officer account is awaiting verification.
            <br />
            This usually takes 1-2 business days.
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '1rem' }}>
            Department: {departmentName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.badge}>⭐</span>
          <div>
            <div style={styles.departmentName}>{departmentName || 'FIELD OFFICER'}</div>
            <div style={styles.officerName}>{officerName || 'Officer'}</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={{ ...styles.statusDot, backgroundColor: location ? '#22c55e' : '#ef4444' }} />
          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
            {location ? 'GPS OK' : 'NO GPS'}
          </span>
        </div>
      </header>

      {/* Stats Bar */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <div style={styles.statValue}>{stats?.totalScans || 0}</div>
          <div style={styles.statLabel}>SCANS</div>
        </div>
        <div style={styles.statItem}>
          <div style={styles.statValue}>{stats?.totalMatches || 0}</div>
          <div style={styles.statLabel}>MATCHES</div>
        </div>
        <div style={styles.statItem}>
          <div style={{ ...styles.statValue, color: '#22c55e' }}>{stats?.totalRtos || 0}</div>
          <div style={styles.statLabel}>RTOs</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        <button 
          style={{ ...styles.navButton, ...(view === 'scan' ? styles.navButtonActive : {}) }}
          onClick={() => setView('scan')}
        >
          📷 SCAN
        </button>
        <button 
          style={{ ...styles.navButton, ...(view === 'history' ? styles.navButtonActive : {}) }}
          onClick={() => { setView('history'); loadEncounters(); }}
        >
          📋 HISTORY
        </button>
      </nav>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          ⚠️ {error}
          <button onClick={() => setError('')} style={styles.errorClose}>×</button>
        </div>
      )}

      {/* SCAN VIEW */}
      {view === 'scan' && (
        <div style={styles.content}>
          {/* Camera/Photo Section */}
          <div style={styles.cameraSection}>
            {useCamera ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  style={styles.videoPreview}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={styles.cameraControls}>
                  <button style={styles.captureButton} onClick={captureFromCamera}>
                    📸 CAPTURE
                  </button>
                  <button style={styles.cancelButton} onClick={stopCamera}>
                    CANCEL
                  </button>
                </div>
              </>
            ) : photoPreview ? (
              <>
                <img src={photoPreview} alt="Captured" style={styles.photoPreview} />
                <button style={styles.retakeButton} onClick={resetScan}>
                  ↺ RETAKE
                </button>
              </>
            ) : (
              <div style={styles.photoPlaceholder}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📷</div>
                <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>
                  Take photo of found pet
                </p>
                <div style={styles.photoButtons}>
                  <button style={styles.primaryButton} onClick={startCamera}>
                    📸 USE CAMERA
                  </button>
                  <button 
                    style={styles.secondaryButton} 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📁 UPLOAD
                  </button>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>

          {/* Location Display */}
          <div style={styles.locationBar}>
            <span style={styles.locationIcon}>📍</span>
            <span style={{ color: location ? '#22c55e' : '#ef4444' }}>
              {location 
                ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}`
                : 'Acquiring GPS...'
              }
            </span>
          </div>

          {/* Deep Scan Button */}
          {capturedPhoto && (
            <button 
              style={styles.deepScanButton}
              onClick={performDeepScan}
              disabled={isScanning || !location}
            >
              {isScanning ? (
                <>
                  <span style={styles.spinner}>⏳</span>
                  SCANNING DATABASE...
                </>
              ) : (
                <>
                  🔍 DEEP SCAN
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* RESULT VIEW */}
      {view === 'result' && scanResult && (
        <div style={styles.content}>
          {/* High Confidence Match Alert */}
          {scanResult.highConfidenceMatch && scanResult.ownerContact && (
            <div style={styles.matchAlert}>
              <div style={styles.matchAlertHeader}>
                <span style={{ fontSize: '2rem' }}>🎯</span>
                <div>
                  <div style={styles.matchAlertTitle}>HIGH CONFIDENCE MATCH</div>
                  <div style={styles.matchConfidence}>
                    {scanResult.matches[0]?.confidence}% CONFIDENCE
                  </div>
                </div>
              </div>

              {/* Owner Contact - THE KEY INFO */}
              <div style={styles.ownerContactBox}>
                <div style={styles.ownerContactHeader}>OWNER CONTACT</div>
                
                <div style={styles.contactRow}>
                  <span style={styles.contactLabel}>Name:</span>
                  <span style={styles.contactValue}>{scanResult.ownerContact.ownerName}</span>
                </div>
                
                {scanResult.ownerContact.ownerPhone && (
                  <a href={`tel:${scanResult.ownerContact.ownerPhone}`} style={styles.phoneButton}>
                    📞 CALL: {scanResult.ownerContact.ownerPhone}
                  </a>
                )}
                
                {scanResult.ownerContact.emergencyContactPhone && (
                  <a href={`tel:${scanResult.ownerContact.emergencyContactPhone}`} style={styles.emergencyButton}>
                    🆘 EMERGENCY: {scanResult.ownerContact.emergencyContactPhone}
                    <span style={styles.emergencyName}>
                      ({scanResult.ownerContact.emergencyContactName})
                    </span>
                  </a>
                )}

                {scanResult.ownerContact.homeAddress && (
                  <div style={styles.addressRow}>
                    <span style={styles.contactLabel}>Home:</span>
                    <span style={styles.contactValue}>{scanResult.ownerContact.homeAddress}</span>
                  </div>
                )}

                {scanResult.ownerContact.approachInstructions && (
                  <div style={styles.instructionsBox}>
                    <span style={styles.instructionsLabel}>⚠️ APPROACH INSTRUCTIONS:</span>
                    <span style={styles.instructionsText}>
                      {scanResult.ownerContact.approachInstructions}
                    </span>
                  </div>
                )}

                {scanResult.ownerContact.petMedicalNotes && (
                  <div style={styles.medicalBox}>
                    <span style={styles.medicalLabel}>🏥 MEDICAL NOTES:</span>
                    <span style={styles.medicalText}>{scanResult.ownerContact.petMedicalNotes}</span>
                  </div>
                )}
              </div>

              {/* RTO Button */}
              <button style={styles.rtoButton} onClick={recordRTO}>
                ✓ RECORD RETURN TO OWNER
              </button>
            </div>
          )}

          {/* No High Confidence Match */}
          {!scanResult.highConfidenceMatch && (
            <div style={styles.noMatchBox}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {scanResult.matchesFound > 0 
                  ? `${scanResult.matchesFound} POSSIBLE MATCH${scanResult.matchesFound > 1 ? 'ES' : ''}`
                  : 'NO MATCHES FOUND'
                }
              </div>
              <p style={{ color: '#9ca3af' }}>{scanResult.message}</p>
            </div>
          )}

          {/* All Matches List */}
          {scanResult.matches.length > 0 && (
            <div style={styles.matchesList}>
              <div style={styles.matchesHeader}>ALL MATCHES</div>
              {scanResult.matches.map((match, i) => (
                <div key={i} style={styles.matchCard}>
                  {match.photoUrl && (
                    <img src={match.photoUrl} alt={match.petName} style={styles.matchPhoto} />
                  )}
                  <div style={styles.matchInfo}>
                    <div style={styles.matchName}>{match.petName}</div>
                    <div style={styles.matchDetails}>
                      {match.petType} • {match.breed} • {match.color}
                    </div>
                    {match.lastSeenLocation && (
                      <div style={styles.matchLocation}>
                        📍 {match.lastSeenLocation} • {match.daysLost} days
                      </div>
                    )}
                  </div>
                  <div style={{
                    ...styles.matchScore,
                    backgroundColor: match.confidence >= 85 ? '#22c55e' : 
                                    match.confidence >= 60 ? '#fbbf24' : '#6b7280'
                  }}>
                    {match.confidence}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button style={styles.newScanButton} onClick={resetScan}>
              📷 NEW SCAN
            </button>
          </div>
        </div>
      )}

      {/* HISTORY VIEW */}
      {view === 'history' && (
        <div style={styles.content}>
          <div style={styles.historyHeader}>RECENT ENCOUNTERS</div>
          
          {encounters.length === 0 ? (
            <div style={styles.emptyHistory}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
              <p style={{ color: '#6b7280' }}>No encounters yet</p>
            </div>
          ) : (
            <div style={styles.encountersList}>
              {encounters.map((enc) => (
                <div key={enc.id} style={styles.encounterCard}>
                  <div style={styles.encounterHeader}>
                    <span style={styles.encounterType}>{enc.petType?.toUpperCase()}</span>
                    <span style={{
                      ...styles.encounterStatus,
                      backgroundColor: enc.outcome === 'rto' ? '#22c55e' : 
                                      enc.outcome === 'shelter' ? '#3b82f6' :
                                      enc.status === 'active' ? '#fbbf24' : '#6b7280'
                    }}>
                      {enc.outcome?.toUpperCase() || enc.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={styles.encounterDetails}>
                    {enc.petBreed} • {enc.petColor}
                    {enc.matchConfidence && (
                      <span style={{ color: '#22c55e', marginLeft: '0.5rem' }}>
                        {enc.matchConfidence}% match
                      </span>
                    )}
                  </div>
                  <div style={styles.encounterTime}>
                    {new Date(enc.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HIGH-CONTRAST STYLES FOR OUTDOOR USE
// ═══════════════════════════════════════════════════════════════════════════

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#000',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#111',
    borderBottom: '2px solid #333',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  badge: {
    fontSize: '1.5rem',
  },
  departmentName: {
    fontSize: '0.75rem',
    color: '#fbbf24',
    fontWeight: 'bold',
    letterSpacing: '0.1em',
  },
  officerName: {
    fontSize: '1rem',
    color: '#fff',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  statsBar: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '1rem',
    backgroundColor: '#0a0a0a',
    borderBottom: '1px solid #222',
  },
  statItem: {
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: '0.625rem',
    color: '#6b7280',
    letterSpacing: '0.1em',
  },
  nav: {
    display: 'flex',
    backgroundColor: '#111',
    borderBottom: '2px solid #333',
  },
  navButton: {
    flex: 1,
    padding: '1rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    cursor: 'pointer',
  },
  navButtonActive: {
    color: '#fff',
    borderBottom: '3px solid #fbbf24',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: '#7f1d1d',
    color: '#fecaca',
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: '#fecaca',
    fontSize: '1.5rem',
    cursor: 'pointer',
  },
  content: {
    padding: '1rem',
  },
  cameraSection: {
    backgroundColor: '#111',
    borderRadius: '12px',
    overflow: 'hidden',
    marginBottom: '1rem',
  },
  videoPreview: {
    width: '100%',
    maxHeight: '400px',
    objectFit: 'cover' as const,
  },
  photoPreview: {
    width: '100%',
    maxHeight: '400px',
    objectFit: 'cover' as const,
  },
  photoPlaceholder: {
    padding: '3rem 2rem',
    textAlign: 'center' as const,
  },
  photoButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
  },
  primaryButton: {
    padding: '1rem 2rem',
    backgroundColor: '#fbbf24',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '1rem 2rem',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cameraControls: {
    display: 'flex',
    gap: '1rem',
    padding: '1rem',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  captureButton: {
    padding: '1rem 2rem',
    backgroundColor: '#22c55e',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '1rem 2rem',
    backgroundColor: '#666',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  retakeButton: {
    display: 'block',
    width: '100%',
    padding: '1rem',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  locationBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#111',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  locationIcon: {
    fontSize: '1.25rem',
  },
  deepScanButton: {
    width: '100%',
    padding: '1.5rem',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.25rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  matchAlert: {
    backgroundColor: '#14532d',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1rem',
    border: '3px solid #22c55e',
  },
  matchAlertHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  matchAlertTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#22c55e',
  },
  matchConfidence: {
    fontSize: '0.875rem',
    color: '#86efac',
  },
  ownerContactBox: {
    backgroundColor: '#000',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  ownerContactHeader: {
    fontSize: '0.75rem',
    color: '#fbbf24',
    fontWeight: 'bold',
    letterSpacing: '0.1em',
    marginBottom: '1rem',
  },
  contactRow: {
    display: 'flex',
    marginBottom: '0.75rem',
  },
  contactLabel: {
    width: '60px',
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  contactValue: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  phoneButton: {
    display: 'block',
    width: '100%',
    padding: '1rem',
    backgroundColor: '#22c55e',
    color: '#000',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '1.125rem',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    marginBottom: '0.75rem',
  },
  emergencyButton: {
    display: 'block',
    width: '100%',
    padding: '1rem',
    backgroundColor: '#dc2626',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    marginBottom: '0.75rem',
  },
  emergencyName: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 'normal',
    opacity: 0.8,
  },
  addressRow: {
    padding: '0.75rem 0',
    borderTop: '1px solid #333',
  },
  instructionsBox: {
    padding: '0.75rem',
    backgroundColor: '#1c1917',
    borderRadius: '6px',
    marginTop: '0.75rem',
    border: '1px solid #fbbf24',
  },
  instructionsLabel: {
    display: 'block',
    color: '#fbbf24',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    marginBottom: '0.25rem',
  },
  instructionsText: {
    color: '#fff',
    fontSize: '0.875rem',
  },
  medicalBox: {
    padding: '0.75rem',
    backgroundColor: '#1e1b4b',
    borderRadius: '6px',
    marginTop: '0.5rem',
    border: '1px solid #818cf8',
  },
  medicalLabel: {
    display: 'block',
    color: '#818cf8',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    marginBottom: '0.25rem',
  },
  medicalText: {
    color: '#fff',
    fontSize: '0.875rem',
  },
  rtoButton: {
    width: '100%',
    padding: '1.25rem',
    backgroundColor: '#22c55e',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.125rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  noMatchBox: {
    textAlign: 'center' as const,
    padding: '3rem 2rem',
    backgroundColor: '#111',
    borderRadius: '12px',
    marginBottom: '1rem',
  },
  matchesList: {
    marginBottom: '1rem',
  },
  matchesHeader: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: 'bold',
    letterSpacing: '0.1em',
    marginBottom: '0.75rem',
  },
  matchCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#111',
    borderRadius: '8px',
    marginBottom: '0.5rem',
  },
  matchPhoto: {
    width: '60px',
    height: '60px',
    objectFit: 'cover' as const,
    borderRadius: '8px',
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '0.25rem',
  },
  matchDetails: {
    fontSize: '0.875rem',
    color: '#9ca3af',
  },
  matchLocation: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  matchScore: {
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '0.875rem',
    color: '#000',
  },
  actionButtons: {
    display: 'flex',
    gap: '1rem',
  },
  newScanButton: {
    flex: 1,
    padding: '1rem',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  historyHeader: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: 'bold',
    letterSpacing: '0.1em',
    marginBottom: '1rem',
  },
  emptyHistory: {
    textAlign: 'center' as const,
    padding: '3rem',
  },
  encountersList: {
  },
  encounterCard: {
    padding: '1rem',
    backgroundColor: '#111',
    borderRadius: '8px',
    marginBottom: '0.5rem',
  },
  encounterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  encounterType: {
    fontWeight: 'bold',
    color: '#fff',
  },
  encounterStatus: {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.625rem',
    fontWeight: 'bold',
    color: '#000',
  },
  encounterDetails: {
    fontSize: '0.875rem',
    color: '#9ca3af',
  },
  encounterTime: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.5rem',
  },
  pendingCard: {
    textAlign: 'center' as const,
    padding: '3rem 2rem',
    marginTop: '20vh',
  },
};

