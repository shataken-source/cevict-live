'use client';

import React, { useState, useRef, useCallback } from 'react';

/**
 * BIOMETRIC CAPTURE COMPONENT
 * 
 * Captures and processes nose-print or facial biometric images
 * for pet identification. Used in Pet Vault and Lost Pet forms.
 * 
 * Features:
 * - Camera capture with guide overlay
 * - Image quality assessment
 * - Real-time feedback
 * - Storage to database
 */

interface BiometricCaptureProps {
  petId?: number;
  petSource?: 'lost_pets' | 'pet_vault';
  petType: 'dog' | 'cat' | 'other';
  onCapture?: (biometricData: BiometricData) => void;
  onError?: (error: string) => void;
  showInstructions?: boolean;
  compact?: boolean;
}

interface BiometricData {
  imageUrl: string;
  biometricHash: string;
  confidence: number;
  type: 'nose_print' | 'facial';
}

export default function BiometricCapture({
  petId,
  petSource,
  petType = 'dog',
  onCapture,
  onError,
  showInstructions = true,
  compact = false
}: BiometricCaptureProps) {
  const [captureType, setCaptureType] = useState<'nose_print' | 'facial'>('nose_print');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [result, setResult] = useState<BiometricData | null>(null);
  const [error, setError] = useState('');
  const [qualityIssues, setQualityIssues] = useState<string[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 960 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCapturing(true);
      setError('');
    } catch (err) {
      setError('Could not access camera. Please allow camera permissions.');
      onError?.('Camera access denied');
    }
  };

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  // Capture from camera
  const captureFromCamera = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `biometric-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedFile(file);
          setCapturedImage(URL.createObjectURL(blob));
          stopCamera();
        }
      }, 'image/jpeg', 0.9);
    }
  }, [stopCamera]);

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedFile(file);
      setCapturedImage(URL.createObjectURL(file));
    }
  };

  // Process and store biometrics
  const processAndStore = async () => {
    if (!capturedFile) return;

    setIsProcessing(true);
    setError('');
    setQualityIssues([]);

    try {
      const formData = new FormData();
      formData.append('image', capturedFile);
      formData.append('petType', petType);
      formData.append('imageType', captureType);
      
      if (petId && petSource) {
        formData.append('petId', petId.toString());
        formData.append('petSource', petSource);
      }

      const response = await fetch('/api/petreunion/biometric/store', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.issues) {
          setQualityIssues(data.issues);
        }
        throw new Error(data.error || 'Processing failed');
      }

      const biometricData: BiometricData = {
        imageUrl: data.imageUrl,
        biometricHash: data.biometricHash,
        confidence: data.confidence,
        type: captureType
      };

      setResult(biometricData);
      onCapture?.(biometricData);

    } catch (err: any) {
      setError(err.message);
      onError?.(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset
  const reset = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setResult(null);
    setError('');
    setQualityIssues([]);
    stopCamera();
  };

  // Instructions for each type
  const instructions = {
    nose_print: {
      title: 'Nose-Print Capture',
      icon: '🐕',
      steps: [
        'Get your pet calm and still',
        'Hold the camera 3-4 inches from the nose',
        'Ensure good lighting (no harsh shadows)',
        'Capture straight-on, filling most of the frame'
      ],
      tip: 'The nose-print is like a fingerprint - every dog\'s is unique!'
    },
    facial: {
      title: 'Facial Capture',
      icon: petType === 'cat' ? '🐱' : '🐕',
      steps: [
        'Face your pet toward the camera',
        'Keep distance of 1-2 feet',
        'Make sure both eyes and nose are visible',
        'Avoid strong backlighting'
      ],
      tip: 'Facial markings and eye patterns help identify your pet.'
    }
  };

  const currentInstructions = instructions[captureType];

  return (
    <div style={styles.container}>
      {/* Type Selector */}
      <div style={styles.typeSelector}>
        <button
          onClick={() => setCaptureType('nose_print')}
          style={{
            ...styles.typeButton,
            ...(captureType === 'nose_print' ? styles.typeButtonActive : {})
          }}
        >
          🐽 Nose-Print
        </button>
        <button
          onClick={() => setCaptureType('facial')}
          style={{
            ...styles.typeButton,
            ...(captureType === 'facial' ? styles.typeButtonActive : {})
          }}
        >
          📸 Facial
        </button>
      </div>

      {/* Instructions */}
      {showInstructions && !capturedImage && !isCapturing && (
        <div style={styles.instructionsBox}>
          <div style={styles.instructionsHeader}>
            <span style={{ fontSize: '2rem' }}>{currentInstructions.icon}</span>
            <h3 style={styles.instructionsTitle}>{currentInstructions.title}</h3>
          </div>
          <ul style={styles.instructionsList}>
            {currentInstructions.steps.map((step, i) => (
              <li key={i} style={styles.instructionItem}>
                <span style={styles.stepNumber}>{i + 1}</span>
                {step}
              </li>
            ))}
          </ul>
          <p style={styles.tip}>💡 {currentInstructions.tip}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={styles.errorBox}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Quality Issues */}
      {qualityIssues.length > 0 && (
        <div style={styles.issuesBox}>
          <strong>Image Quality Issues:</strong>
          <ul style={styles.issuesList}>
            {qualityIssues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Camera/Capture Area */}
      <div style={styles.captureArea}>
        {isCapturing ? (
          <>
            <div style={styles.videoContainer}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={styles.video}
              />
              {/* Guide Overlay */}
              <div style={styles.guideOverlay}>
                <div style={{
                  ...styles.guideCircle,
                  ...(captureType === 'nose_print' ? styles.guideCircleSmall : styles.guideCircleLarge)
                }} />
                <p style={styles.guideText}>
                  {captureType === 'nose_print' 
                    ? 'Position nose in the circle' 
                    : 'Position face in the frame'}
                </p>
              </div>
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={styles.cameraControls}>
              <button style={styles.captureButton} onClick={captureFromCamera}>
                📸 CAPTURE
              </button>
              <button style={styles.cancelButton} onClick={stopCamera}>
                ✕ CANCEL
              </button>
            </div>
          </>
        ) : capturedImage ? (
          <>
            <div style={styles.previewContainer}>
              <img src={capturedImage} alt="Captured" style={styles.previewImage} />
              {result && (
                <div style={styles.successBadge}>
                  ✓ CAPTURED
                </div>
              )}
            </div>
            <div style={styles.previewControls}>
              {!result ? (
                <>
                  <button
                    style={styles.processButton}
                    onClick={processAndStore}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '⏳ Processing...' : '🔬 Process Biometrics'}
                  </button>
                  <button style={styles.retakeButton} onClick={reset}>
                    ↺ Retake
                  </button>
                </>
              ) : (
                <>
                  <div style={styles.resultBox}>
                    <p style={styles.resultText}>
                      <strong>Biometric ID:</strong> {result.biometricHash}
                    </p>
                    <p style={styles.resultText}>
                      <strong>Quality Score:</strong> {result.confidence}%
                    </p>
                  </div>
                  <button style={styles.newCaptureButton} onClick={reset}>
                    + Capture Another
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div style={styles.captureOptions}>
            <button style={styles.cameraButton} onClick={startCamera}>
              📷 Use Camera
            </button>
            <span style={styles.orDivider}>or</span>
            <button
              style={styles.uploadButton}
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Upload Photo
            </button>
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

      {/* Info Footer */}
      {!compact && (
        <div style={styles.infoFooter}>
          <p style={styles.infoText}>
            🔒 Biometric data is encrypted and used only for pet identification.
          </p>
        </div>
      )}
    </div>
  );
}

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0',
  },
  typeSelector: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  typeButton: {
    flex: 1,
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  typeButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
  },
  instructionsBox: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    border: '1px solid #e2e8f0',
  },
  instructionsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  instructionsTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    margin: 0,
    color: '#1e293b',
  },
  instructionsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  instructionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0',
    color: '#475569',
    fontSize: '0.875rem',
  },
  stepNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#64748b',
  },
  tip: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    backgroundColor: '#fef3c7',
    borderRadius: '6px',
    fontSize: '0.75rem',
    color: '#92400e',
    margin: '0.75rem 0 0 0',
  },
  errorBox: {
    padding: '0.75rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  issuesBox: {
    padding: '0.75rem',
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
    color: '#92400e',
  },
  issuesList: {
    margin: '0.5rem 0 0 1rem',
    padding: 0,
  },
  captureArea: {
    backgroundColor: '#000',
    borderRadius: '12px',
    overflow: 'hidden',
    minHeight: '300px',
  },
  videoContainer: {
    position: 'relative' as const,
    width: '100%',
  },
  video: {
    width: '100%',
    display: 'block',
  },
  guideOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as const,
  },
  guideCircle: {
    border: '3px dashed rgba(255, 255, 255, 0.6)',
    borderRadius: '50%',
  },
  guideCircleSmall: {
    width: '120px',
    height: '120px',
  },
  guideCircleLarge: {
    width: '200px',
    height: '250px',
    borderRadius: '40%',
  },
  guideText: {
    marginTop: '1rem',
    color: '#fff',
    fontSize: '0.875rem',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
  },
  cameraControls: {
    display: 'flex',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#111',
  },
  captureButton: {
    flex: 2,
    padding: '1rem',
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  cancelButton: {
    flex: 1,
    padding: '1rem',
    backgroundColor: '#666',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  previewContainer: {
    position: 'relative' as const,
  },
  previewImage: {
    width: '100%',
    display: 'block',
  },
  successBadge: {
    position: 'absolute' as const,
    top: '1rem',
    right: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#22c55e',
    color: '#fff',
    borderRadius: '999px',
    fontWeight: 'bold',
    fontSize: '0.75rem',
  },
  previewControls: {
    padding: '1rem',
    backgroundColor: '#111',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  processButton: {
    padding: '1rem',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  retakeButton: {
    padding: '0.75rem',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  resultBox: {
    backgroundColor: '#065f46',
    padding: '1rem',
    borderRadius: '8px',
  },
  resultText: {
    color: '#fff',
    margin: '0.25rem 0',
    fontSize: '0.875rem',
  },
  newCaptureButton: {
    padding: '0.75rem',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  captureOptions: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    gap: '1rem',
  },
  cameraButton: {
    padding: '1rem 2rem',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    minWidth: '200px',
  },
  orDivider: {
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  uploadButton: {
    padding: '1rem 2rem',
    backgroundColor: '#374151',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    minWidth: '200px',
  },
  infoFooter: {
    marginTop: '1rem',
    textAlign: 'center' as const,
  },
  infoText: {
    color: '#64748b',
    fontSize: '0.75rem',
    margin: 0,
  },
};

