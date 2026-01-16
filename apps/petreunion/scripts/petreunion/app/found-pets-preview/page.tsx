'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Upload, Bell, Heart, X, Menu, User, LogOut, MapPin, Calendar, Phone, Mail, Share2, Filter } from 'lucide-react';

// Mock data
const petsData = [
  {
    id: '1',
    name: 'Max',
    type: 'Dog',
    breed: 'Golden Retriever',
    location: 'Downtown Seattle',
    dateFound: '2025-01-15',
    photoUrl: '/api/placeholder/300/300',
    description: 'Friendly golden retriever found near Pike Place Market',
    status: 'found'
  },
  {
    id: '2',
    name: 'Luna',
    type: 'Cat',
    breed: 'Siamese',
    location: 'Bellevue, WA',
    dateFound: '2025-01-14',
    photoUrl: '/api/placeholder/300/300',
    description: 'Beautiful Siamese cat found in residential area',
    status: 'found'
  },
  {
    id: '3',
    name: 'Buddy',
    type: 'Dog',
    breed: 'Labrador',
    location: 'Redmond, WA',
    dateFound: '2025-01-13',
    photoUrl: '/api/placeholder/300/300',
    description: 'Friendly labrador looking for his family',
    status: 'found'
  }
];

const successStoriesData = [
  {
    id: '1',
    petName: 'Charlie',
    ownerName: 'Sarah Johnson',
    reunitedDate: '2025-01-10',
    story: 'After 2 weeks of searching, Charlie was found thanks to PetReunion!',
    photoUrl: '/api/placeholder/200/200'
  },
  {
    id: '2',
    petName: 'Mittens',
    ownerName: 'Mike Chen',
    reunitedDate: '2025-01-08',
    story: 'The AI matching system helped us find Mittens in just 3 days!',
    photoUrl: '/api/placeholder/200/200'
  }
];

interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string;
  location: string;
  dateFound: string;
  photoUrl: string;
  description: string;
  status: string;
}

export default function FoundPetsPreview() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPetDetailModalOpen, setIsPetDetailModalOpen] = useState(false);
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [pets, setPets] = useState<Pet[]>(petsData);

  // Fetch real pets from database
  useEffect(() => {
    const fetchPets = async () => {
      try {
        const res = await fetch('/api/pets/recent?status=found&limit=20');
        const data = await res.json();
        if (data.success && data.pets) {
          setPets(data.pets.map((pet: any) => ({
            id: pet.id,
            name: pet.pet_name || pet.name || 'Unknown',
            type: pet.type || 'Unknown',
            breed: pet.breed || 'Unknown',
            location: pet.location || 'Unknown',
            dateFound: pet.date_lost || pet.created_at || new Date().toISOString(),
            photoUrl: pet.photo_url || pet.photoUrl || '/api/placeholder/300/300',
            description: pet.description || 'No description available',
            status: pet.status || 'found'
          })));
        }
      } catch (err) {
        console.error('Failed to fetch pets:', err);
        // Keep mock data on error
      }
    };
    fetchPets();
  }, []);

  const filteredPets = pets.filter(pet => {
    const matchesSearch = !searchQuery || 
      pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || pet.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div style={{ fontFamily: 'system-ui', margin: 0, padding: 0 }}>
      {/* Header */}
      <header style={{
        background: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        padding: '16px 20px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link href="/" style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#667eea',
            textDecoration: 'none'
          }}>
            PetReunion
          </Link>
          <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <Link href="/report/lost" style={{ color: '#333', textDecoration: 'none', fontSize: '16px' }}>
              Report Lost
            </Link>
            <Link href="/report/found" style={{ color: '#333', textDecoration: 'none', fontSize: '16px' }}>
              Report Found
            </Link>
            <button
              onClick={() => setIsAlertsModalOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#333',
                fontSize: '16px'
              }}
            >
              <Bell size={20} />
              Alerts
            </button>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Sign In
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '100px 20px 80px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '56px', fontWeight: 'bold', marginBottom: '20px' }}>
            Found Pets
          </h1>
          <p style={{ fontSize: '24px', marginBottom: '40px', opacity: 0.95 }}>
            Help reunite found pets with their families
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsReportModalOpen(true)}
              style={{
                background: 'white',
                color: '#667eea',
                border: 'none',
                padding: '16px 32px',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Report a Found Pet
            </button>
            <button
              onClick={() => setIsAlertsModalOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '2px solid white',
                padding: '16px 32px',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Set Up Alerts
            </button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '80px 20px', background: '#f8f9fa' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '42px', fontWeight: 'bold', textAlign: 'center', marginBottom: '60px', color: '#333' }}>
            How It Works
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '40px'
          }}>
            {[
              { icon: Upload, title: 'Report Found Pet', desc: 'Upload photos and details' },
              { icon: Search, title: 'AI Matching', desc: 'Our AI searches for matches' },
              { icon: Bell, title: 'Get Notified', desc: 'Receive alerts when matched' },
              { icon: Heart, title: 'Reunite', desc: 'Connect and bring pets home' }
            ].map((item, idx) => (
              <div key={idx} style={{
                textAlign: 'center',
                padding: '30px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  color: 'white'
                }}>
                  <item.icon size={30} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
                  {item.title}
                </h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pet Grid */}
      <section style={{ padding: '80px 20px', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
              <h2 style={{ fontSize: '42px', fontWeight: 'bold', color: '#333' }}>
                Found Pets
              </h2>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                  <Search style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#999'
                  }} size={20} />
                  <input
                    type="text"
                    placeholder="Search by name, breed, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      fontSize: '16px'
                    }}
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px',
                    background: 'white'
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="dog">Dogs</option>
                  <option value="cat">Cats</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {filteredPets.map((pet) => (
              <div
                key={pet.id}
                onClick={() => {
                  setSelectedPet(pet);
                  setIsPetDetailModalOpen(true);
                }}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                <div style={{
                  width: '100%',
                  height: '200px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '48px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {pet.photoUrl && pet.photoUrl !== '/api/placeholder/300/300' ? (
                    <img
                      src={pet.photoUrl}
                      alt={pet.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <span>🐾</span>
                  )}
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#10b981',
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>
                    FOUND
                  </div>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    color: '#333'
                  }}>
                    {pet.name}
                  </h3>
                  <div style={{
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '12px'
                  }}>
                    {pet.breed} • {pet.type}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <MapPin size={16} />
                    {pet.location}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#666',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Calendar size={16} />
                    Found {new Date(pet.dateFound).toLocaleDateString()}
                  </div>
                  <p style={{
                    fontSize: '14px',
                    color: '#666',
                    lineHeight: '1.5',
                    marginBottom: '16px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {pet.description}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPet(pet);
                      setIsPetDetailModalOpen(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredPets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
              No found pets matching your search.
            </div>
          )}
        </div>
      </section>

      {/* Success Stories */}
      <section style={{ padding: '80px 20px', background: '#f8f9fa' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '42px', fontWeight: 'bold', textAlign: 'center', marginBottom: '60px', color: '#333' }}>
            Success Stories
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '40px'
          }}>
            {successStoriesData.map((story) => (
              <div key={story.id} style={{
                background: 'white',
                borderRadius: '12px',
                padding: '30px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  margin: '0 auto 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px'
                }}>
                  🐾
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '12px', color: '#333' }}>
                  {story.petName} & {story.ownerName}
                </h3>
                <p style={{ color: '#666', textAlign: 'center', lineHeight: '1.6', marginBottom: '16px' }}>
                  {story.story}
                </p>
                <div style={{ textAlign: 'center', fontSize: '14px', color: '#999' }}>
                  Reunited {new Date(story.reunitedDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resource Center */}
      <section style={{ padding: '80px 20px', background: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '42px', fontWeight: 'bold', textAlign: 'center', marginBottom: '60px', color: '#333' }}>
            Resources
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '30px'
          }}>
            {[
              { title: 'Lost Pet Guide', desc: 'What to do when your pet goes missing' },
              { title: 'Found Pet Guide', desc: 'Steps to help a found pet' },
              { title: 'Shelter Directory', desc: 'Find local animal shelters' },
              { title: 'FAQ', desc: 'Common questions answered' }
            ].map((resource, idx) => (
              <Link
                key={idx}
                href={`/${resource.title.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  padding: '30px',
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: '#333',
                  display: 'block',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.background = '#667eea';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.color = '#333';
                }}
              >
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
                  {resource.title}
                </h3>
                <p style={{ color: 'inherit', opacity: 0.8, lineHeight: '1.6' }}>
                  {resource.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section style={{ padding: '80px 20px', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '20px' }}>
            Stay Updated
          </h2>
          <p style={{ fontSize: '18px', marginBottom: '40px', opacity: 0.95 }}>
            Get alerts about pets in your area and success stories
          </p>
          <div style={{ display: 'flex', gap: '12px', maxWidth: '500px', margin: '0 auto' }}>
            <input
              type="email"
              placeholder="Enter your email"
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px'
              }}
            />
            <button style={{
              padding: '16px 32px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}>
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: '#1f2937',
        color: 'white',
        padding: '60px 20px 30px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '40px',
            marginBottom: '40px'
          }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>PetReunion</h3>
              <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
                AI-powered pet reunion technology
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Quick Links</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Report Lost', 'Report Found', 'Search', 'Alerts'].map((item) => (
                  <li key={item} style={{ marginBottom: '8px' }}>
                    <Link href={`/${item.toLowerCase().replace(/\s+/g, '-')}`} style={{ color: '#9ca3af', textDecoration: 'none' }}>
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Resources</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['FAQ', 'Shelter Directory', 'Tips', 'Contact'].map((item) => (
                  <li key={item} style={{ marginBottom: '8px' }}>
                    <Link href={`/${item.toLowerCase().replace(/\s+/g, '-')}`} style={{ color: '#9ca3af', textDecoration: 'none' }}>
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>Legal</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
                  <li key={item} style={{ marginBottom: '8px' }}>
                    <Link href={`/${item.toLowerCase().replace(/\s+/g, '-')}`} style={{ color: '#9ca3af', textDecoration: 'none' }}>
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{
            borderTop: '1px solid #374151',
            paddingTop: '30px',
            textAlign: 'center',
            color: '#9ca3af'
          }}>
            <p>© 2025 PetReunion. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Report Modal */}
      {isReportModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={() => setIsReportModalOpen(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>Report a Found Pet</h2>
              <button
                onClick={() => setIsReportModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#666'
                }}
              >
                <X />
              </button>
            </div>
            <form>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  Pet Name
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  Type
                </label>
                <select style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}>
                  <option>Dog</option>
                  <option>Cat</option>
                  <option>Other</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  Location Found
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  Upload Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  Description
                </label>
                <textarea
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Submit Report
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  style={{
                    padding: '14px 24px',
                    background: '#f3f4f6',
                    color: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pet Detail Modal */}
      {isPetDetailModalOpen && selectedPet && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={() => setIsPetDetailModalOpen(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '30px' }}>
              <div>
                <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
                  {selectedPet.name}
                </h2>
                <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 'bold', marginBottom: '8px' }}>
                  FOUND
                </div>
              </div>
              <button
                onClick={() => setIsPetDetailModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#666'
                }}
              >
                <X />
              </button>
            </div>
            <div style={{
              width: '100%',
              height: '400px',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: '12px',
              marginBottom: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '80px'
            }}>
              {selectedPet.photoUrl && selectedPet.photoUrl !== '/api/placeholder/300/300' ? (
                <img
                  src={selectedPet.photoUrl}
                  alt={selectedPet.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '12px'
                  }}
                />
              ) : (
                <span>🐾</span>
              )}
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
                Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Breed</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>{selectedPet.breed}</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Type</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>{selectedPet.type}</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Location</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>{selectedPet.location}</div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Date Found</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                    {new Date(selectedPet.dateFound).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
                Description
              </h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                {selectedPet.description}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{
                flex: 1,
                padding: '14px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <Phone size={20} />
                Contact Finder
              </button>
              <button style={{
                padding: '14px 24px',
                background: '#f3f4f6',
                color: '#333',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Share2 size={20} />
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Modal */}
      {isAlertsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={() => setIsAlertsModalOpen(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '500px',
            width: '90%'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>Set Up Alerts</h2>
              <button
                onClick={() => setIsAlertsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#666'
                }}
              >
                <X />
              </button>
            </div>
            <p style={{ color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
              Get notified when pets matching your criteria are found in your area.
            </p>
            <form>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  Email
                </label>
                <input
                  type="email"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  Location
                </label>
                <input
                  type="text"
                  placeholder="City, State or ZIP"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Create Alert
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={() => setIsAuthModalOpen(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '400px',
            width: '90%'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>Sign In</h2>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#666'
                }}
              >
                <X />
              </button>
            </div>
            <form>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  Email
                </label>
                <input
                  type="email"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                  Password
                </label>
                <input
                  type="password"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '16px'
                }}
              >
                Sign In
              </button>
              <div style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
                Don't have an account? <Link href="/auth/signup" style={{ color: '#667eea', textDecoration: 'none' }}>Sign up</Link>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Dashboard Modal */}
      {isUserDashboardOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }}
        onClick={() => setIsUserDashboardOpen(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333' }}>My Dashboard</h2>
              <button
                onClick={() => setIsUserDashboardOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#666'
                }}
              >
                <X />
              </button>
            </div>
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
                My Reports
              </h3>
              <p style={{ color: '#666' }}>No reports yet. <Link href="/report/lost" style={{ color: '#667eea' }}>Create one</Link></p>
            </div>
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#333' }}>
                My Alerts
              </h3>
              <p style={{ color: '#666' }}>No alerts set up. <Link href="/alerts" style={{ color: '#667eea' }}>Create one</Link></p>
            </div>
            <button
              onClick={() => setIsUserDashboardOpen(false)}
              style={{
                width: '100%',
                padding: '14px',
                background: '#f3f4f6',
                color: '#333',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

