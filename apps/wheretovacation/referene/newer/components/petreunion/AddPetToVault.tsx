'use client';

import React, { useState } from 'react';

/**
 * ADD PET TO VAULT FORM
 * 
 * Comprehensive form for registering a pet in the ReunionReady vault.
 * Collects all information needed for instant lost pet activation.
 */

interface AddPetToVaultProps {
  userId: string;
  onSuccess: (pet: any) => void;
  onCancel: () => void;
}

export default function AddPetToVault({ userId, onSuccess, onCancel }: AddPetToVaultProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    // Basic Info
    petName: '',
    petType: 'dog',
    breed: '',
    color: '',
    size: 'medium',
    weightLbs: '',
    ageYears: '',
    gender: 'unknown',

    // Identification
    microchipId: '',
    microchipCompany: '',

    // Medical
    medicalConditions: '',
    medications: '',
    specialNeeds: '',
    vetName: '',
    vetPhone: '',

    // Behavior
    temperament: 'friendly',
    approachInstructions: '',

    // Photo
    primaryPhotoUrl: '',

    // Location
    homeAddress: '',
    homeCity: '',
    homeState: '',
    homeZip: '',

    // Contact
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.petName || !formData.ownerName) {
      setError('Pet name and owner name are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/petreunion/reunion-ready/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          petName: formData.petName,
          petType: formData.petType,
          breed: formData.breed || undefined,
          color: formData.color || undefined,
          size: formData.size,
          weightLbs: formData.weightLbs ? parseFloat(formData.weightLbs) : undefined,
          ageYears: formData.ageYears ? parseInt(formData.ageYears) : undefined,
          gender: formData.gender,
          microchipId: formData.microchipId || undefined,
          microchipCompany: formData.microchipCompany || undefined,
          medicalConditions: formData.medicalConditions ? formData.medicalConditions.split(',').map(s => s.trim()) : undefined,
          medications: formData.medications ? formData.medications.split(',').map(s => s.trim()) : undefined,
          specialNeeds: formData.specialNeeds || undefined,
          temperament: formData.temperament,
          approachInstructions: formData.approachInstructions || undefined,
          primaryPhotoUrl: formData.primaryPhotoUrl || undefined,
          homeAddress: formData.homeAddress || undefined,
          homeCity: formData.homeCity || undefined,
          homeState: formData.homeState || undefined,
          homeZip: formData.homeZip || undefined,
          ownerName: formData.ownerName,
          ownerEmail: formData.ownerEmail || undefined,
          ownerPhone: formData.ownerPhone || undefined,
          emergencyContactName: formData.emergencyContactName || undefined,
          emergencyContactPhone: formData.emergencyContactPhone || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.pet);
      } else {
        setError(data.error || 'Failed to add pet');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add pet');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0d1117',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem'
  };

  const labelStyle = {
    display: 'block',
    color: '#9ca3af',
    fontSize: '0.875rem',
    marginBottom: '6px'
  };

  return (
    <div style={{
      backgroundColor: '#161b22',
      borderRadius: '16px',
      border: '1px solid #374151',
      maxWidth: '600px',
      margin: '0 auto',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #374151',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ color: 'white', margin: 0 }}>🐾 Add Pet to Vault</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
            Step {step} of 4
          </p>
        </div>
        <button
          onClick={onCancel}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            color: '#9ca3af',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.5rem'
          }}
        >
          ×
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ height: '4px', backgroundColor: '#0d1117' }}>
        <div style={{
          height: '100%',
          width: `${(step / 4) * 100}%`,
          backgroundColor: '#00ff41',
          transition: 'width 0.3s'
        }} />
      </div>

      {/* Form Content */}
      <div style={{ padding: '24px' }}>
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#ef4444'
          }}>
            {error}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div>
            <h3 style={{ color: 'white', marginBottom: '20px' }}>Basic Information</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Pet Name *</label>
              <input
                type="text"
                value={formData.petName}
                onChange={(e) => updateField('petName', e.target.value)}
                placeholder="e.g., Max, Bella"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Pet Type *</label>
                <select
                  value={formData.petType}
                  onChange={(e) => updateField('petType', e.target.value)}
                  style={inputStyle}
                >
                  <option value="dog">🐕 Dog</option>
                  <option value="cat">🐈 Cat</option>
                  <option value="bird">🐦 Bird</option>
                  <option value="rabbit">🐰 Rabbit</option>
                  <option value="other">🐾 Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Breed</label>
                <input
                  type="text"
                  value={formData.breed}
                  onChange={(e) => updateField('breed', e.target.value)}
                  placeholder="e.g., Golden Retriever"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Color</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => updateField('color', e.target.value)}
                  placeholder="e.g., Golden"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Size</label>
                <select
                  value={formData.size}
                  onChange={(e) => updateField('size', e.target.value)}
                  style={inputStyle}
                >
                  <option value="small">Small (&lt;20 lbs)</option>
                  <option value="medium">Medium (20-60 lbs)</option>
                  <option value="large">Large (&gt;60 lbs)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                  style={inputStyle}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Weight (lbs)</label>
                <input
                  type="number"
                  value={formData.weightLbs}
                  onChange={(e) => updateField('weightLbs', e.target.value)}
                  placeholder="e.g., 45"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Age (years)</label>
                <input
                  type="number"
                  value={formData.ageYears}
                  onChange={(e) => updateField('ageYears', e.target.value)}
                  placeholder="e.g., 3"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Medical & ID */}
        {step === 2 && (
          <div>
            <h3 style={{ color: 'white', marginBottom: '20px' }}>Medical & Identification</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Microchip ID</label>
                <input
                  type="text"
                  value={formData.microchipId}
                  onChange={(e) => updateField('microchipId', e.target.value)}
                  placeholder="15-digit number"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Microchip Company</label>
                <input
                  type="text"
                  value={formData.microchipCompany}
                  onChange={(e) => updateField('microchipCompany', e.target.value)}
                  placeholder="e.g., HomeAgain"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Medical Conditions (comma-separated)</label>
              <input
                type="text"
                value={formData.medicalConditions}
                onChange={(e) => updateField('medicalConditions', e.target.value)}
                placeholder="e.g., diabetes, arthritis"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Medications (comma-separated)</label>
              <input
                type="text"
                value={formData.medications}
                onChange={(e) => updateField('medications', e.target.value)}
                placeholder="e.g., insulin, pain medication"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Special Needs</label>
              <textarea
                value={formData.specialNeeds}
                onChange={(e) => updateField('specialNeeds', e.target.value)}
                placeholder="Any special care requirements..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Vet Name</label>
                <input
                  type="text"
                  value={formData.vetName}
                  onChange={(e) => updateField('vetName', e.target.value)}
                  placeholder="Veterinarian name"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Vet Phone</label>
                <input
                  type="tel"
                  value={formData.vetPhone}
                  onChange={(e) => updateField('vetPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Behavior & Photo */}
        {step === 3 && (
          <div>
            <h3 style={{ color: 'white', marginBottom: '20px' }}>Behavior & Photo</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Temperament</label>
              <select
                value={formData.temperament}
                onChange={(e) => updateField('temperament', e.target.value)}
                style={inputStyle}
              >
                <option value="friendly">😊 Friendly - Approaches strangers</option>
                <option value="shy">😰 Shy - May hide or run away</option>
                <option value="anxious">😟 Anxious - Nervous around new people</option>
                <option value="aggressive">⚠️ Aggressive - May bite/scratch</option>
                <option value="unpredictable">❓ Unpredictable</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Approach Instructions</label>
              <textarea
                value={formData.approachInstructions}
                onChange={(e) => updateField('approachInstructions', e.target.value)}
                placeholder="How should someone approach your pet if found? e.g., 'Call his name softly. Offer treats. Don't make sudden movements.'"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Primary Photo URL</label>
              <input
                type="url"
                value={formData.primaryPhotoUrl}
                onChange={(e) => updateField('primaryPhotoUrl', e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
              <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '4px' }}>
                Tip: Use a clear, recent photo showing your pet&apos;s face and any distinctive markings
              </p>
            </div>

            {formData.primaryPhotoUrl && (
              <div style={{ marginBottom: '16px' }}>
                <img
                  src={formData.primaryPhotoUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 4: Contact & Location */}
        {step === 4 && (
          <div>
            <h3 style={{ color: 'white', marginBottom: '20px' }}>Contact & Location</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Owner Name *</label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => updateField('ownerName', e.target.value)}
                placeholder="Your full name"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => updateField('ownerEmail', e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  type="tel"
                  value={formData.ownerPhone}
                  onChange={(e) => updateField('ownerPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Emergency Contact Name</label>
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => updateField('emergencyContactName', e.target.value)}
                  placeholder="Backup contact"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Emergency Contact Phone</label>
                <input
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => updateField('emergencyContactPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Home Address</label>
              <input
                type="text"
                value={formData.homeAddress}
                onChange={(e) => updateField('homeAddress', e.target.value)}
                placeholder="Street address"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>City</label>
                <input
                  type="text"
                  value={formData.homeCity}
                  onChange={(e) => updateField('homeCity', e.target.value)}
                  placeholder="City"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <input
                  type="text"
                  value={formData.homeState}
                  onChange={(e) => updateField('homeState', e.target.value)}
                  placeholder="TX"
                  maxLength={2}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>ZIP</label>
                <input
                  type="text"
                  value={formData.homeZip}
                  onChange={(e) => updateField('homeZip', e.target.value)}
                  placeholder="75001"
                  maxLength={10}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid #374151',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            color: step === 1 ? '#4b5563' : '#9ca3af',
            border: '1px solid #374151',
            borderRadius: '8px',
            cursor: step === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          ← Back
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#00ff41',
              color: 'black',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '12px 32px',
              backgroundColor: loading ? '#374151' : '#00ff41',
              color: loading ? '#9ca3af' : 'black',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            {loading ? '⏳ Saving...' : '✅ Add to Vault'}
          </button>
        )}
      </div>
    </div>
  );
}

