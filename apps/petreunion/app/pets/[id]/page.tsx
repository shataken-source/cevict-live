'use client';

import { useEffect, useState } from 'react';
import { fetchJson } from '@/lib/fetcher';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PrintFlyer from '@/components/PrintFlyer';
import SocialPostButton from '@/components/SocialPostButton';
import { ArrowLeft, MapPin, Calendar, Phone, Mail, Share2 } from 'lucide-react';
import ShareButton from '@/components/ShareButton';

interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string;
  gender: string;
  color?: string;
  status: 'lost' | 'found' | 'reunited';
  location: string;
  description: string;
  photoUrl: string | null;
  dateLost: string;
  createdAt: string;
  contact?: string;
  email?: string;
  phone?: string;
}

export default function PetDetailPage() {
  const params = useParams();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchPet(params.id as string);
    }
  }, [params.id]);

  const fetchPet = async (id: string) => {
    try {
      setLoading(true);
      // Use live petreunion API backed by lost_pets
      const data = await fetchJson(`/api/petreunion/pet/${id}`);

      // Back-compat: some deployments return { pet: {...} } without success:true
      const src = data?.pet;
      const ok = (!!src && typeof src === 'object') || (data?.success && !!data?.pet);

      if (ok && src) {
        // Clean pet name
        let cleanName = src.name || src.pet_name || 'Unknown';
        cleanName = cleanName.replace(/_[FIT][BG]?T?_\d+.*$/, '').trim();
        cleanName = cleanName.replace(/_\d+_\d+.*$/, '').trim();
        
        setPet({
          id: src.id,
          name: cleanName,
          type: src.type || src.pet_type || '',
          breed: src.breed || '',
          gender: src.gender || 'unknown',
          color: src.color,
          status: src.status,
          location: [src.location_city, src.location_state].filter(Boolean).join(', '),
          description: src.description || '',
          photoUrl: src.photoUrl || src.photo_url || src.image_url || null,
          dateLost: src.date_lost || src.date_found || src.created_at,
          createdAt: src.created_at,
          contact: src.owner_name || src.finder_name || '',
          email: src.owner_email || src.finder_email || '',
          phone: src.owner_phone || src.finder_phone || '',
        });
      } else {
        throw new Error('Pet not found');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pet details');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const shareUrl = () => window.location.href;
  const shareText = (pet: Pet) =>
    `${pet.status === 'found' ? 'Found' : 'Lost'} ${pet.type}: ${pet.name} in ${pet.location}. Please help!`;

  const handleShareNative = async () => {
    if (!pet) return;
    const shareData = {
      title: `${pet.status === 'found' ? 'Found' : 'Lost'} Pet: ${pet.name}`,
      text: shareText(pet),
      url: shareUrl(),
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareUrl());
      alert('Link copied to clipboard!');
    }
  };

  const handleShareFacebook = () => {
    if (!pet) return;
    const url = encodeURIComponent(shareUrl());
    const text = encodeURIComponent(shareText(pet));
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareX = () => {
    if (!pet) return;
    const url = encodeURIComponent(shareUrl());
    const text = encodeURIComponent(shareText(pet));
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-5">🐾</div>
          <div className="text-slate-600">Loading pet details...</div>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-10">
          <div className="text-5xl mb-5">😢</div>
          <h1 className="text-2xl font-bold mb-3 text-slate-900">Pet Not Found</h1>
          <p className="text-slate-600 mb-6">{error || 'This pet listing may have been removed or reunited.'}</p>
          <Link href="/" className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="hero-gradient text-white py-5">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
            <ArrowLeft size={20} />
            Back to Search
          </Link>
          <Link href="/" className="text-2xl font-bold text-white hover:opacity-80 transition-opacity">
            PetReunion
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="glass-card rounded-2xl overflow-hidden shadow-xl">
          {/* Pet Photo */}
          <div className="relative w-full h-96">
            {pet.photoUrl ? (
              <img
                src={pet.photoUrl}
                alt={pet.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const placeholder = e.currentTarget.parentElement?.querySelector('.placeholder') as HTMLElement;
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`placeholder absolute inset-0 flex items-center justify-center text-white text-9xl hero-gradient ${pet.photoUrl ? 'hidden' : ''}`}
            >
              {pet.type.toLowerCase().includes('cat') ? '🐱' : '🐕'}
            </div>
            
            {/* Status Badge */}
            <div className={`absolute top-5 left-5 px-4 py-2 rounded-full text-white font-bold text-sm uppercase ${
              pet.status === 'found' ? 'bg-green-500' : pet.status === 'reunited' ? 'bg-purple-500' : 'bg-red-500'
            }`}>
              {pet.status}
            </div>
          </div>

          {/* Pet Details */}
          <div className="p-8 md:p-10">
            <div className="flex justify-between items-start flex-wrap gap-5 mb-8">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  {pet.name}
                </h1>
                <p className="text-lg text-slate-600 mb-4">
                  {pet.breed} • {pet.gender} • {pet.type}
                </p>
                {pet.color && (
                  <p className="text-base text-slate-500">
                    Color: {pet.color}
                  </p>
                )}
              </div>
              
              {/* Action Buttons */}
              <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
                {/* Contact Button */}
                <button
                  onClick={() => {
                    if (pet.phone) {
                      window.location.href = `tel:${pet.phone}`;
                    } else if (pet.email) {
                      window.location.href = `mailto:${pet.email}`;
                    } else {
                      alert('Contact information not available. Please check back later.');
                    }
                  }}
                  style={{
                    display:"flex",
                    alignItems:"center",
                    gap:"8px",
                    padding:"12px 24px",
                    background:"#667eea",
                    color:"white",
                    border:"none",
                    borderRadius:"8px",
                    fontSize:"16px",
                    fontWeight:"600",
                    cursor:"pointer"
                  }}
                >
                  <Phone size={18} />
                  Contact
                </button>
                
                {/* Print Flyer Button */}
                <PrintFlyer pet={{
                  name: pet.name,
                  type: pet.type,
                  breed: pet.breed,
                  color: pet.color,
                  location: pet.location,
                  description: pet.description,
                  photoUrl: pet.photoUrl,
                  dateLost: pet.dateLost,
                  contact: pet.phone || pet.email
                }} />

                {/* Post to Social Media */}
                <SocialPostButton petId={pet.id} />
                
                {/* Share Buttons */}
                <ShareButton
                  petId={pet.id}
                  petName={pet.name}
                  petType={pet.type}
                  location={pet.location}
                  photoUrl={pet.photoUrl || undefined}
                />
              </div>
            </div>

            {/* Location & Date */}
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",
              gap:"24px",
              marginTop:"32px",
              padding:"24px",
              background:"#f8f9fa",
              borderRadius:"12px"
            }}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{
                  width:"48px",
                  height:"48px",
                  borderRadius:"50%",
                  background:"#667eea20",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center"
                }}>
                  <MapPin size={24} color="#667eea" />
                </div>
                <div>
                  <div style={{fontSize:"12px",color:"#999",textTransform:"uppercase",fontWeight:"600"}}>
                    Last Seen
                  </div>
                  <div style={{fontSize:"16px",color:"#333",fontWeight:"500"}}>
                    {pet.location}
                  </div>
                </div>
              </div>
              
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{
                  width:"48px",
                  height:"48px",
                  borderRadius:"50%",
                  background:"#667eea20",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center"
                }}>
                  <Calendar size={24} color="#667eea" />
                </div>
                <div>
                  <div style={{fontSize:"12px",color:"#999",textTransform:"uppercase",fontWeight:"600"}}>
                    Reported
                  </div>
                  <div style={{fontSize:"16px",color:"#333",fontWeight:"500"}}>
                    {getTimeAgo(pet.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {pet.description && (
              <div style={{marginTop:"32px"}}>
                <h3 style={{fontSize:"20px",fontWeight:"bold",color:"#333",marginBottom:"12px"}}>
                  Description
                </h3>
                <p style={{
                  fontSize:"16px",
                  color:"#666",
                  lineHeight:"1.8",
                  whiteSpace:"pre-wrap"
                }}>
                  {pet.description}
                </p>
              </div>
            )}

            {/* Help Banner */}
            <div style={{
              marginTop:"40px",
              padding:"24px",
              background:"linear-gradient(135deg, #fef3c7, #fde68a)",
              borderRadius:"12px",
              border:"2px solid #f59e0b"
            }}>
              <h3 style={{fontSize:"18px",fontWeight:"bold",color:"#92400e",marginBottom:"8px"}}>
                🙏 How You Can Help
              </h3>
              <ul style={{margin:0,paddingLeft:"20px",color:"#92400e"}}>
                <li>Share this listing on social media</li>
                <li>Print and post flyers in the area</li>
                <li>Check local shelters and vet offices</li>
                <li>Alert neighbors and community groups</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background:"#1f2937",
        color:"white",
        padding:"40px 20px",
        textAlign:"center"
      }}>
        <p style={{color:"#9ca3af"}}>
          © 2025 PetReunion. Helping reunite pets with their families.
        </p>
      </footer>
    </div>
  );
}

