'use client';

import React, { useState, useEffect } from 'react';

/**
 * PET VAULT COMPONENT
 * 
 * ReunionReady premium feature UI
 * - Displays all vault pets
 * - Shows subscription status
 * - One-click "MISSING: ACTIVATE ALERT" button
 * - Manage pet details
 */

interface VaultPet {
  id: number;
  pet_name: string;
  pet_type: string;
  breed?: string;
  color?: string;
  primary_photo_url?: string;
  is_reunion_ready: boolean;
  subscription_status: string;
  subscription_expires_at?: string;
  is_currently_lost: boolean;
  subscriptionActive?: boolean;
  created_at: string;
}

interface PetVaultProps {
  userId: string;
  onAddPet?: () => void;
  onEditPet?: (petId: number) => void;
}

export default function PetVault({ userId, onAddPet, onEditPet }: PetVaultProps) {
  const [pets, setPets] = useState<VaultPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingPet, setActivatingPet] = useState<number | null>(null);
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchVaultPets();
  }, [userId]);

  const fetchVaultPets = async () => {
    try {
      const response = await fetch(`/api/petreunion/reunion-ready/vault?userId=${userId}`);
      const data = await response.json();
      setPets(data.pets || []);
    } catch (error) {
      console.error('Failed to fetch vault pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (petId: number) => {
    try {
      const response = await fetch('/api/petreunion/reunion-ready/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultPetId: petId,
          userId,
          successUrl: `${window.location.origin}/dashboard/vault?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/vault?cancelled=true`
        })
      });

      const data = await response.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || 'Failed to start checkout');
      }
    } catch (error: any) {
      setActionResult({ type: 'error', message: error.message });
    }
  };

  const handleActivateAlert = async (petId: number) => {
    if (!confirm('🚨 Are you sure you want to mark this pet as LOST?\n\nThis will:\n• Create a public lost pet listing\n• Notify nearby camera watch volunteers\n• Generate QR posters\n• Start AI search')) {
      return;
    }

    setActivatingPet(petId);
    setActionResult(null);

    try {
      const response = await fetch('/api/petreunion/reunion-ready/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultPetId: petId })
      });

      const data = await response.json();

      if (data.success) {
        setActionResult({ 
          type: 'success', 
          message: data.message 
        });
        fetchVaultPets(); // Refresh
      } else {
        setActionResult({ type: 'error', message: data.error });
      }
    } catch (error: any) {
      setActionResult({ type: 'error', message: error.message });
    } finally {
      setActivatingPet(null);
    }
  };

  const handleDeactivateAlert = async (petId: number, resolution: string) => {
    try {
      const response = await fetch('/api/petreunion/reunion-ready/activate', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vaultPetId: petId,
          resolution
        })
      });

      const data = await response.json();

      if (data.success) {
        setActionResult({ type: 'success', message: data.message });
        fetchVaultPets();
      } else {
        setActionResult({ type: 'error', message: data.error });
      }
    } catch (error: any) {
      setActionResult({ type: 'error', message: error.message });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: '#9ca3af'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔐</div>
        <p>Loading your Pet Vault...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '4px' }}>
            🔐 Pet Vault
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            {pets.length} pet{pets.length !== 1 ? 's' : ''} • {pets.filter(p => p.subscriptionActive).length} with ReunionReady
          </p>
        </div>
        <button
          onClick={onAddPet}
          style={{
            padding: '12px 24px',
            backgroundColor: '#00ff41',
            color: 'black',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ➕ Add Pet
        </button>
      </div>

      {/* Action Result */}
      {actionResult && (
        <div style={{
          padding: '16px',
          marginBottom: '24px',
          borderRadius: '8px',
          backgroundColor: actionResult.type === 'success' 
            ? 'rgba(0, 255, 65, 0.1)' 
            : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${actionResult.type === 'success' ? 'rgba(0, 255, 65, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          <p style={{ 
            color: actionResult.type === 'success' ? '#00ff41' : '#ef4444',
            margin: 0
          }}>
            {actionResult.message}
          </p>
        </div>
      )}

      {/* Empty State */}
      {pets.length === 0 && (
        <div style={{
          backgroundColor: '#161b22',
          borderRadius: '16px',
          border: '1px dashed #374151',
          padding: '48px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🐾</div>
          <h3 style={{ color: 'white', marginBottom: '8px' }}>Your Pet Vault is Empty</h3>
          <p style={{ color: '#9ca3af', marginBottom: '24px' }}>
            Add your pets now so you&apos;re prepared if they ever go missing.
          </p>
          <button
            onClick={onAddPet}
            style={{
              padding: '12px 32px',
              backgroundColor: '#00ff41',
              color: 'black',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Add Your First Pet
          </button>
        </div>
      )}

      {/* Pet Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '24px'
      }}>
        {pets.map(pet => (
          <div
            key={pet.id}
            style={{
              backgroundColor: '#161b22',
              borderRadius: '16px',
              border: pet.is_currently_lost 
                ? '2px solid #ef4444' 
                : pet.subscriptionActive 
                  ? '1px solid rgba(0, 255, 65, 0.3)' 
                  : '1px solid #374151',
              overflow: 'hidden'
            }}
          >
            {/* Pet Image & Status */}
            <div style={{ position: 'relative' }}>
              {pet.primary_photo_url ? (
                <img
                  src={pet.primary_photo_url}
                  alt={pet.pet_name}
                  style={{
                    width: '100%',
                    height: '180px',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '180px',
                  backgroundColor: '#0d1117',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '4rem'
                }}>
                  {pet.pet_type === 'dog' ? '🐕' : pet.pet_type === 'cat' ? '🐈' : '🐾'}
                </div>
              )}

              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                padding: '6px 12px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                backgroundColor: pet.is_currently_lost 
                  ? '#ef4444'
                  : pet.subscriptionActive 
                    ? '#00ff41' 
                    : '#374151',
                color: pet.is_currently_lost || !pet.subscriptionActive ? 'white' : 'black'
              }}>
                {pet.is_currently_lost 
                  ? '🚨 LOST'
                  : pet.subscriptionActive 
                    ? '✓ PROTECTED' 
                    : 'NOT PROTECTED'}
              </div>
            </div>

            {/* Pet Info */}
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ color: 'white', fontWeight: 'bold', fontSize: '1.25rem', margin: 0 }}>
                    {pet.pet_name}
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: 0 }}>
                    {pet.breed || pet.pet_type} • {pet.color}
                  </p>
                </div>
                <button
                  onClick={() => onEditPet?.(pet.id)}
                  style={{
                    padding: '8px',
                    backgroundColor: 'transparent',
                    color: '#9ca3af',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  ✏️
                </button>
              </div>

              {/* Subscription Info */}
              {pet.subscriptionActive && pet.subscription_expires_at && (
                <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '16px' }}>
                  ReunionReady expires: {formatDate(pet.subscription_expires_at)}
                </p>
              )}

              {/* Action Buttons */}
              {pet.is_currently_lost ? (
                <div>
                  <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '12px' }}>
                    🚨 This pet is currently marked as LOST
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleDeactivateAlert(pet.id, 'found_safe')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: '#00ff41',
                        color: 'black',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      🎉 Found Safe!
                    </button>
                    <button
                      onClick={() => handleDeactivateAlert(pet.id, 'false_alarm')}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: 'transparent',
                        color: '#9ca3af',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : pet.subscriptionActive ? (
                <button
                  onClick={() => handleActivateAlert(pet.id)}
                  disabled={activatingPet === pet.id}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: activatingPet === pet.id ? '#374151' : '#ef4444',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: activatingPet === pet.id ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {activatingPet === pet.id ? (
                    <>⏳ Activating...</>
                  ) : (
                    <>🚨 MISSING: ACTIVATE ALERT</>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(pet.id)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#00ff41',
                    color: 'black',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  🔐 Upgrade to ReunionReady - $9.99/year
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ReunionReady Benefits */}
      <div style={{
        marginTop: '48px',
        backgroundColor: 'rgba(0, 255, 65, 0.05)',
        border: '1px solid rgba(0, 255, 65, 0.2)',
        borderRadius: '16px',
        padding: '24px'
      }}>
        <h3 style={{ color: '#00ff41', marginBottom: '16px' }}>
          ✨ What&apos;s Included with ReunionReady?
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {[
            { icon: '⚡', title: 'One-Click Activation', desc: 'Instantly mark as lost with stored data' },
            { icon: '📱', title: 'QR Poster Generation', desc: 'Print-ready posters with QR codes' },
            { icon: '📹', title: 'Camera Watch Alerts', desc: 'Notify neighbors within 1 mile' },
            { icon: '🤖', title: 'AI Image Matching', desc: 'Auto-detect your pet in footage' },
            { icon: '🗺️', title: 'Live Search Map', desc: 'Real-time sighting pins' },
            { icon: '💾', title: 'Secure Data Vault', desc: 'Medical, microchip & contact info' }
          ].map((benefit, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>{benefit.icon}</span>
              <div>
                <p style={{ color: 'white', fontWeight: '500', marginBottom: '2px' }}>{benefit.title}</p>
                <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: 0 }}>{benefit.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

