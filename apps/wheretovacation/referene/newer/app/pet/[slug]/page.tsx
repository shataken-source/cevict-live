'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

/**
 * PUBLIC PET STATUS PAGE
 * 
 * This is the landing page when someone scans a QR code on a lost pet poster.
 * Features:
 * - Real-time pet status (Lost/Found/Reunited)
 * - Pet photo and details
 * - Report Sighting button
 * - Recent sightings map
 * - Share buttons
 */

interface PetData {
  id: number;
  pet_name: string;
  pet_type: string;
  breed: string;
  color: string;
  size: string;
  photo_url: string | null;
  date_lost: string;
  location_city: string;
  location_state: string;
  location_detail: string;
  description: string;
  markings: string;
  reward_amount: number | null;
  status: string;
  public_url_slug: string;
  sighting_count: number;
  last_sighting_at: string | null;
}

interface StatusDisplay {
  label: string;
  color: string;
  icon: string;
  message: string;
}

interface Sighting {
  id: number;
  sighting_location: string;
  sighting_city: string;
  sighting_state: string;
  sighting_date: string;
  is_verified: boolean;
}

export default function PublicPetPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [pet, setPet] = useState<PetData | null>(null);
  const [status, setStatus] = useState<StatusDisplay | null>(null);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [daysLost, setDaysLost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Sighting form state
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [sightingForm, setSightingForm] = useState({
    location: '',
    city: '',
    state: '',
    description: '',
    reporterName: '',
    reporterPhone: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  useEffect(() => {
    if (slug) {
      fetchPetData();
    }
  }, [slug]);
  
  async function fetchPetData() {
    try {
      const response = await fetch(`/api/petreunion/public-pet?slug=${slug}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setPet(data.pet);
        setStatus(data.status);
        setSightings(data.sightings || []);
        setDaysLost(data.daysLost);
      }
    } catch (err) {
      setError('Failed to load pet information');
    } finally {
      setLoading(false);
    }
  }
  
  async function handleSubmitSighting(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/petreunion/report-sighting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId: pet?.id,
          location: sightingForm.location,
          city: sightingForm.city,
          state: sightingForm.state,
          description: sightingForm.description,
          reporterName: sightingForm.reporterName,
          reporterPhone: sightingForm.reporterPhone,
          sightingDate: new Date().toISOString()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSubmitSuccess(true);
        setShowSightingForm(false);
        // Refresh pet data to show new sighting count
        fetchPetData();
      } else {
        alert(data.error || 'Failed to submit sighting');
      }
    } catch (err) {
      alert('Failed to submit sighting');
    } finally {
      setSubmitting(false);
    }
  }
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🐕</div>
          <p>Loading pet information...</p>
        </div>
      </div>
    );
  }
  
  if (error || !pet) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>😢</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Pet Not Found</h1>
          <p style={{ color: '#9ca3af' }}>{error || 'This pet listing may have been removed.'}</p>
        </div>
      </div>
    );
  }
  
  const statusColors: Record<string, string> = {
    red: '#DC2626',
    green: '#059669',
    blue: '#3B82F6'
  };
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f3f4f6',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Status Banner */}
      <div style={{
        background: statusColors[status?.color || 'red'],
        color: 'white',
        padding: '16px',
        textAlign: 'center'
      }}>
        <span style={{ fontSize: '1.5rem', marginRight: '8px' }}>{status?.icon}</span>
        <strong>{status?.label}</strong>
        <span style={{ marginLeft: '8px' }}>{status?.message}</span>
      </div>
      
      {/* Main Content */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
        {/* Pet Photo */}
        {pet.photo_url && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '24px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <img 
              src={pet.photo_url} 
              alt={pet.pet_name || 'Lost Pet'}
              style={{ 
                width: '100%', 
                height: '300px', 
                objectFit: 'cover'
              }}
            />
          </div>
        )}
        
        {/* Pet Details Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: '#1f2937'
          }}>
            {pet.pet_name || `Lost ${pet.pet_type}`}
          </h1>
          
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            {pet.breed} • {pet.color} • {pet.size || 'Unknown size'}
          </p>
          
          {/* Last Seen */}
          <div style={{
            background: '#FEF3C7',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#92400E', marginBottom: '4px' }}>
              📍 Last Seen
            </div>
            <div style={{ color: '#78350F' }}>
              {pet.location_detail && <div>{pet.location_detail}</div>}
              <div>{pet.location_city}, {pet.location_state}</div>
              <div style={{ fontSize: '0.875rem', color: '#A16207', marginTop: '4px' }}>
                {new Date(pet.date_lost).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
          
          {/* Description */}
          {pet.description && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>
                Description
              </div>
              <p style={{ color: '#6b7280' }}>{pet.description}</p>
            </div>
          )}
          
          {/* Markings */}
          {pet.markings && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#374151' }}>
                Identifying Marks
              </div>
              <p style={{ color: '#6b7280' }}>{pet.markings}</p>
            </div>
          )}
          
          {/* Reward */}
          {pet.reward_amount && pet.status === 'lost' && (
            <div style={{
              background: '#ECFDF5',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                💰 ${pet.reward_amount} REWARD
              </div>
              <div style={{ fontSize: '0.875rem', color: '#047857' }}>
                For safe return
              </div>
            </div>
          )}
        </div>
        
        {/* Sighting Stats */}
        {pet.sighting_count > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>
              👀 {pet.sighting_count} Sighting{pet.sighting_count !== 1 ? 's' : ''} Reported
            </h2>
            
            {sightings.map((sighting, i) => (
              <div 
                key={sighting.id}
                style={{
                  padding: '12px',
                  background: i % 2 === 0 ? '#f9fafb' : 'white',
                  borderRadius: '8px',
                  marginBottom: '8px'
                }}
              >
                <div style={{ fontWeight: '500' }}>
                  📍 {sighting.sighting_location || sighting.sighting_city}
                  {sighting.is_verified && <span style={{ color: '#059669', marginLeft: '8px' }}>✓ Verified</span>}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {new Date(sighting.sighting_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Report Sighting Button */}
        {pet.status === 'lost' && !showSightingForm && !submitSuccess && (
          <button
            onClick={() => setShowSightingForm(true)}
            style={{
              width: '100%',
              padding: '20px',
              background: '#DC2626',
              color: 'white',
              fontSize: '1.25rem',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              marginBottom: '24px'
            }}
          >
            🚨 Report a Sighting
          </button>
        )}
        
        {/* Success Message */}
        {submitSuccess && (
          <div style={{
            background: '#ECFDF5',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🙏</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#059669' }}>
              Thank You!
            </h3>
            <p style={{ color: '#047857' }}>
              Your sighting report has been submitted. The owner has been notified!
            </p>
          </div>
        )}
        
        {/* Sighting Form */}
        {showSightingForm && (
          <form 
            onSubmit={handleSubmitSighting}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>
              Report a Sighting
            </h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
                Where did you see {pet.pet_name || 'this pet'}? *
              </label>
              <input
                type="text"
                required
                placeholder="Street address or landmark"
                value={sightingForm.location}
                onChange={e => setSightingForm({...sightingForm, location: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db'
                }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="City"
                value={sightingForm.city}
                onChange={e => setSightingForm({...sightingForm, city: e.target.value})}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db'
                }}
              />
              <input
                type="text"
                placeholder="State"
                value={sightingForm.state}
                onChange={e => setSightingForm({...sightingForm, state: e.target.value})}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '4px' }}>
                Additional Details
              </label>
              <textarea
                placeholder="Describe what you saw, direction pet was heading, etc."
                value={sightingForm.description}
                onChange={e => setSightingForm({...sightingForm, description: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  minHeight: '80px'
                }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Your Name (optional)"
                value={sightingForm.reporterName}
                onChange={e => setSightingForm({...sightingForm, reporterName: e.target.value})}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db'
                }}
              />
              <input
                type="tel"
                placeholder="Your Phone (optional)"
                value={sightingForm.reporterPhone}
                onChange={e => setSightingForm({...sightingForm, reporterPhone: e.target.value})}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowSightingForm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 2,
                  padding: '12px',
                  background: submitting ? '#9ca3af' : '#DC2626',
                  color: 'white',
                  fontWeight: 'bold',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Sighting'}
              </button>
            </div>
          </form>
        )}
        
        {/* Share Buttons */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>
            🤝 Help Spread the Word
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => {
                const url = window.location.href;
                const text = `Help find ${pet.pet_name || 'this lost pet'}! Last seen in ${pet.location_city}, ${pet.location_state}.`;
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, '_blank');
              }}
              style={{
                padding: '12px',
                background: '#1877F2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Share on Facebook
            </button>
            <button
              onClick={() => {
                const url = window.location.href;
                const text = `🐕 Help find ${pet.pet_name || 'this lost pet'}! Last seen in ${pet.location_city}, ${pet.location_state}. `;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
              }}
              style={{
                padding: '12px',
                background: '#1DA1F2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Share on Twitter
            </button>
          </div>
          
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copied to clipboard!');
            }}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '12px',
              background: '#e5e7eb',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            📋 Copy Link
          </button>
        </div>
        
        {/* Footer */}
        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
          <p>Powered by <strong>PetReunion</strong></p>
          <p>AI-Powered Lost Pet Recovery</p>
        </div>
      </div>
    </div>
  );
}

