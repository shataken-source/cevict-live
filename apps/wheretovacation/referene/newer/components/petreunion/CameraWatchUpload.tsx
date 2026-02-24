'use client';

import React, { useState, useCallback, useRef } from 'react';

/**
 * CAMERA WATCH UPLOAD COMPONENT
 * 
 * Privacy-first drag & drop upload for security camera footage.
 * 
 * Features:
 * - Drag & drop support for images and videos
 * - Privacy controls (anonymous by default)
 * - Optional timestamp and location
 * - Real-time upload progress
 * - AI analysis status
 */

interface CameraWatchUploadProps {
  petId: number;
  petName: string;
  onUploadComplete?: (result: UploadResult) => void;
}

interface UploadResult {
  success: boolean;
  uploadId?: number;
  storageUrl?: string;
  message?: string;
  error?: string;
}

export default function CameraWatchUpload({ petId, petName, onUploadComplete }: CameraWatchUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  
  // Privacy settings
  const [anonymous, setAnonymous] = useState(true);
  const [shareContact, setShareContact] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  // Optional metadata
  const [captureTime, setCaptureTime] = useState('');
  const [captureLocation, setCaptureLocation] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please select an image or video file');
      return;
    }

    // Validate file size
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File too large. Maximum size: ${file.type.startsWith('video/') ? '50MB' : '10MB'}`);
      return;
    }

    setSelectedFile(file);
    setResult(null);

    // Create preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      // For video, create video thumbnail or just show icon
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('petId', petId.toString());
    formData.append('anonymous', anonymous.toString());
    formData.append('consentToContact', shareContact.toString());
    
    if (shareContact) {
      if (contactEmail) formData.append('contactEmail', contactEmail);
      if (contactPhone) formData.append('contactPhone', contactPhone);
    }
    
    if (captureTime) {
      formData.append('captureTimestamp', new Date(captureTime).toISOString());
    }
    
    if (captureLocation) {
      formData.append('captureLocation', JSON.stringify({ text: captureLocation }));
    }

    try {
      // Simulate progress (since fetch doesn't have progress for uploads)
      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(p + 10, 90));
      }, 200);

      const response = await fetch('/api/petreunion/camera-watch/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          uploadId: data.uploadId,
          storageUrl: data.storageUrl,
          message: data.message
        });
        onUploadComplete?.(data);
      } else {
        setResult({
          success: false,
          error: data.error || 'Upload failed'
        });
      }

    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Upload failed'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setUploadProgress(0);
  };

  return (
    <div style={{
      backgroundColor: '#161b22',
      borderRadius: '16px',
      border: '1px solid #374151',
      padding: '24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h3 style={{ 
        fontSize: '1.25rem', 
        fontWeight: 'bold', 
        marginBottom: '8px',
        color: 'white'
      }}>
        📹 Upload Camera Footage
      </h3>
      <p style={{ color: '#9ca3af', marginBottom: '24px', fontSize: '0.875rem' }}>
        Help find <strong>{petName}</strong> by uploading footage from your security cameras.
      </p>

      {/* Privacy Notice */}
      <div style={{
        backgroundColor: 'rgba(0, 255, 65, 0.1)',
        border: '1px solid rgba(0, 255, 65, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ color: '#00ff41' }}>🔒</span>
          <strong style={{ color: '#00ff41' }}>Privacy First</strong>
        </div>
        <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>
          Your identity is anonymous by default. Only share contact info if you choose to.
        </p>
      </div>

      {/* Drop Zone */}
      {!selectedFile && !result?.success && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? '#00ff41' : '#374151'}`,
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragOver ? 'rgba(0, 255, 65, 0.05)' : 'transparent',
            transition: 'all 0.3s'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📁</div>
          <p style={{ color: '#d1d5db', marginBottom: '8px' }}>
            Drag & drop your camera footage here
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            or click to browse
          </p>
          <p style={{ color: '#4b5563', fontSize: '0.75rem', marginTop: '12px' }}>
            Supports: Images (JPG, PNG) up to 10MB • Videos (MP4, MOV) up to 50MB
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        style={{ display: 'none' }}
      />

      {/* Selected File Preview */}
      {selectedFile && !result?.success && (
        <div>
          <div style={{
            backgroundColor: '#0d1117',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {preview ? (
                <img 
                  src={preview} 
                  alt="Preview"
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                />
              ) : (
                <div style={{
                  width: '100px',
                  height: '100px',
                  backgroundColor: '#1f2937',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  🎬
                </div>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ color: 'white', fontWeight: '500', marginBottom: '4px' }}>
                  {selectedFile.name}
                </p>
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  {selectedFile.type.startsWith('video/') ? '🎬 Video' : '📷 Image'} • 
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          </div>

          {/* Optional Metadata */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#d1d5db', marginBottom: '12px', fontSize: '0.875rem', fontWeight: '500' }}>
              Optional Details (helps our AI)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ color: '#9ca3af', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>
                  When was this captured?
                </label>
                <input
                  type="datetime-local"
                  value={captureTime}
                  onChange={(e) => setCaptureTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#0d1117',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: 'white'
                  }}
                />
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>
                  Camera location
                </label>
                <input
                  type="text"
                  value={captureLocation}
                  onChange={(e) => setCaptureLocation(e.target.value)}
                  placeholder="e.g., Front yard, 123 Main St"
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#0d1117',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: 'white'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div style={{
            backgroundColor: '#0d1117',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h4 style={{ color: '#d1d5db', marginBottom: '12px', fontSize: '0.875rem', fontWeight: '500' }}>
              🔒 Privacy Settings
            </h4>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#00ff41' }}
              />
              <span style={{ color: '#d1d5db' }}>Keep me anonymous</span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={shareContact}
                onChange={(e) => setShareContact(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#00ff41' }}
              />
              <span style={{ color: '#d1d5db' }}>Share my contact if there&apos;s a match</span>
            </label>

            {shareContact && (
              <div style={{ marginLeft: '26px', marginTop: '12px', display: 'grid', gap: '8px' }}>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Email (optional)"
                  style={{
                    padding: '8px',
                    backgroundColor: '#161b22',
                    border: '1px solid #374151',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '0.875rem'
                  }}
                />
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  style={{
                    padding: '8px',
                    backgroundColor: '#161b22',
                    border: '1px solid #374151',
                    borderRadius: '4px',
                    color: 'white',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                height: '8px',
                backgroundColor: '#1f2937',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '8px'
              }}>
                <div style={{
                  height: '100%',
                  width: `${uploadProgress}%`,
                  backgroundColor: '#00ff41',
                  transition: 'width 0.3s'
                }} />
              </div>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center' }}>
                {uploadProgress < 100 ? 'Uploading...' : 'Processing...'} {uploadProgress}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: uploading ? '#374151' : '#00ff41',
              color: uploading ? '#9ca3af' : 'black',
              fontWeight: 'bold',
              fontSize: '1rem',
              border: 'none',
              borderRadius: '8px',
              cursor: uploading ? 'wait' : 'pointer'
            }}
          >
            {uploading ? '⏳ Uploading...' : '📤 Upload & Analyze with AI'}
          </button>
        </div>
      )}

      {/* Success Result */}
      {result?.success && (
        <div style={{
          backgroundColor: 'rgba(0, 255, 65, 0.1)',
          border: '1px solid rgba(0, 255, 65, 0.3)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
          <h4 style={{ color: '#00ff41', fontWeight: 'bold', marginBottom: '8px' }}>
            Upload Complete!
          </h4>
          <p style={{ color: '#d1d5db', marginBottom: '16px' }}>
            {result.message}
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '24px' }}>
            Our AI is analyzing your footage. If we find a potential match, we&apos;ll pin it on the map and notify the owner immediately.
          </p>
          <button
            onClick={handleReset}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              color: '#00ff41',
              fontWeight: 'bold',
              border: '2px solid #00ff41',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Upload Another
          </button>
        </div>
      )}

      {/* Error Result */}
      {result && !result.success && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>😔</div>
          <h4 style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '8px' }}>
            Upload Failed
          </h4>
          <p style={{ color: '#d1d5db', marginBottom: '16px' }}>
            {result.error}
          </p>
          <button
            onClick={handleReset}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ef4444',
              color: 'white',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

