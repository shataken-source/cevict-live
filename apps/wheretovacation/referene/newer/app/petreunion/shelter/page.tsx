'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Shelter {
  id: string;
  shelter_name: string;
  email: string;
  city?: string;
  state?: string;
  zipcode?: string;
  shelter_url?: string;
  shelter_type?: string;
}

export default function ShelterDashboard() {
  const router = useRouter();
  const [shelter, setShelter] = useState<Shelter | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [activeTab, setActiveTab] = useState<'login' | 'intake' | 'search' | 'matches' | 'scrape'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Intake form state
  const [intakeForm, setIntakeForm] = useState({
    pet_name: '',
    pet_type: 'dog' as 'dog' | 'cat',
    breed: '',
    color: '',
    size: 'medium',
    date_found: new Date().toISOString().split('T')[0],
    location_city: '',
    location_state: 'AL',
    location_detail: '',
    markings: '',
    description: '',
    microchip: '',
    collar: '',
    photo_url: '',
    found_by_name: '',
    found_by_phone: '',
    found_by_email: '',
    intake_notes: ''
  });

  // Search form state
  const [searchForm, setSearchForm] = useState({
    pet_type: '' as '' | 'dog' | 'cat',
    breed: '',
    color: '',
    size: '',
    location_city: '',
    location_state: 'AL',
    markings: '',
    description_keywords: '',
    date_lost_from: '',
    date_lost_to: '',
    include_age_progression: true
  });

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeResults, setScrapeResults] = useState<any>(null);

  // Check if already logged in
  useEffect(() => {
    const savedShelter = localStorage.getItem('shelter_session');
    if (savedShelter) {
      try {
        const shelterData = JSON.parse(savedShelter);
        setShelter(shelterData);
        setLoggedIn(true);
        setActiveTab('intake');
      } catch (e) {
        // Invalid session
      }
    }
  }, []);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/petreunion/shelter/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (data.success) {
        setShelter(data.shelter);
        setLoggedIn(true);
        localStorage.setItem('shelter_session', JSON.stringify(data.shelter));
        setActiveTab('intake');
        setMessage({ type: 'success', text: 'Login successful!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Login failed' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle scrape shelter page
  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/petreunion/shelter/scrape-shelter-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shelterId: shelter?.id,
          url: scrapeUrl || shelter?.shelter_url,
          shelterType: shelter?.shelter_type || 'adoptapet'
        })
      });

      const data = await response.json();

      if (data.success) {
        setScrapeResults(data);
        setMessage({ 
          type: 'success', 
          text: `Scraped ${data.petsFound} pets, saved ${data.petsSaved} to database` 
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Scraping failed' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle intake submission
  const handleIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/petreunion/shelter/add-found-pet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intakeForm)
      });

      const data = await response.json();

      if (data.success) {
        if (data.duplicate) {
          setMessage({ type: 'error', text: `Similar pet already exists. Please verify: ${data.existingPet.pet_name}` });
        } else {
          setMessage({ type: 'success', text: 'Pet added successfully! Automatic matching search initiated.' });
          // Reset form
          setIntakeForm({
            pet_name: '',
            pet_type: 'dog',
            breed: '',
            color: '',
            size: 'medium',
            date_found: new Date().toISOString().split('T')[0],
            location_city: '',
            location_state: 'AL',
            location_detail: '',
            markings: '',
            description: '',
            microchip: '',
            collar: '',
            photo_url: '',
            found_by_name: '',
            found_by_phone: '',
            found_by_email: '',
            intake_notes: ''
          });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add pet' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  // Handle search (using shelter's zipcode as starting point)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const keywords = searchForm.description_keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      // Use zipcode-based search if shelter has zipcode
      const searchEndpoint = shelter?.zipcode 
        ? '/api/petreunion/shelter/search-from-zipcode'
        : '/api/petreunion/shelter/search-lost-pet';

      const searchBody = shelter?.zipcode
        ? {
            shelterId: shelter.id,
            zipcode: shelter.zipcode,
            searchCriteria: {
              ...searchForm,
              description_keywords: keywords.length > 0 ? keywords : undefined
            }
          }
        : {
            ...searchForm,
            description_keywords: keywords.length > 0 ? keywords : undefined
          };

      const response = await fetch(searchEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody)
      });

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.matches || []);
        setMessage({ 
          type: 'success', 
          text: `Found ${data.count} potential matches${shelter?.zipcode ? ` near ${shelter.city}, ${shelter.state} (zipcode: ${shelter.zipcode})` : ''}` 
        });
        setActiveTab('matches');
      } else {
        setMessage({ type: 'error', text: data.error || 'Search failed' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Shelter Office Software - PetReunion</h1>

        {/* Login Screen */}
        {!loggedIn && (
          <div className="bg-white p-6 rounded-lg shadow max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Shelter Login</h2>
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        )}

        {loggedIn && (
          <>
            {/* Shelter Info Banner */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h2 className="font-semibold">{shelter?.shelter_name}</h2>
              <p className="text-sm text-gray-600">
                {shelter?.city && shelter?.state && `${shelter.city}, ${shelter.state}`}
                {shelter?.zipcode && ` • Zipcode: ${shelter.zipcode}`}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b">
              <button
                onClick={() => setActiveTab('intake')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'intake'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Add Found Pet
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'search'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Search Lost Pet
              </button>
              <button
                onClick={() => setActiveTab('scrape')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'scrape'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Scrape Shelter Page
              </button>
              <button
                onClick={() => setActiveTab('matches')}
                className={`px-4 py-2 font-medium ${
                  activeTab === 'matches'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Search Results ({searchResults.length})
              </button>
            </div>
          </>
        )}

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Intake Form */}
        {activeTab === 'intake' && (
          <form onSubmit={handleIntake} className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Add Found Pet (Intake)</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pet Name (if known)</label>
                <input
                  type="text"
                  value={intakeForm.pet_name}
                  onChange={(e) => setIntakeForm({ ...intakeForm, pet_name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type *</label>
                <select
                  value={intakeForm.pet_type}
                  onChange={(e) => setIntakeForm({ ...intakeForm, pet_type: e.target.value as 'dog' | 'cat' })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Breed *</label>
                <input
                  type="text"
                  value={intakeForm.breed}
                  onChange={(e) => setIntakeForm({ ...intakeForm, breed: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Color *</label>
                <input
                  type="text"
                  value={intakeForm.color}
                  onChange={(e) => setIntakeForm({ ...intakeForm, color: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Size</label>
                <select
                  value={intakeForm.size}
                  onChange={(e) => setIntakeForm({ ...intakeForm, size: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Date Found *</label>
                <input
                  type="date"
                  value={intakeForm.date_found}
                  onChange={(e) => setIntakeForm({ ...intakeForm, date_found: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">City *</label>
                <input
                  type="text"
                  value={intakeForm.location_city}
                  onChange={(e) => setIntakeForm({ ...intakeForm, location_city: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">State *</label>
                <input
                  type="text"
                  value={intakeForm.location_state}
                  onChange={(e) => setIntakeForm({ ...intakeForm, location_state: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Where Found (specific location)</label>
                <input
                  type="text"
                  value={intakeForm.location_detail}
                  onChange={(e) => setIntakeForm({ ...intakeForm, location_detail: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Near Main Street and 5th Ave"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Markings/Distinctive Features</label>
                <textarea
                  value={intakeForm.markings}
                  onChange={(e) => setIntakeForm({ ...intakeForm, markings: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={intakeForm.description}
                  onChange={(e) => setIntakeForm({ ...intakeForm, description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Microchip #</label>
                <input
                  type="text"
                  value={intakeForm.microchip}
                  onChange={(e) => setIntakeForm({ ...intakeForm, microchip: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Collar/Tags</label>
                <input
                  type="text"
                  value={intakeForm.collar}
                  onChange={(e) => setIntakeForm({ ...intakeForm, collar: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Photo URL</label>
                <input
                  type="url"
                  value={intakeForm.photo_url}
                  onChange={(e) => setIntakeForm({ ...intakeForm, photo_url: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://..."
                />
              </div>

              <div className="col-span-2 border-t pt-4">
                <h3 className="font-semibold mb-2">Found By (Person who brought in)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={intakeForm.found_by_name}
                      onChange={(e) => setIntakeForm({ ...intakeForm, found_by_name: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      value={intakeForm.found_by_phone}
                      onChange={(e) => setIntakeForm({ ...intakeForm, found_by_phone: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={intakeForm.found_by_email}
                      onChange={(e) => setIntakeForm({ ...intakeForm, found_by_email: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Intake Notes (Internal)</label>
                <textarea
                  value={intakeForm.intake_notes}
                  onChange={(e) => setIntakeForm({ ...intakeForm, intake_notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  placeholder="Internal notes for shelter staff..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Pet to Database'}
            </button>
          </form>
        )}

        {/* Search Form */}
        {activeTab === 'search' && (
          <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Search for Lost Pet</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={searchForm.pet_type}
                  onChange={(e) => setSearchForm({ ...searchForm, pet_type: e.target.value as '' | 'dog' | 'cat' })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Any</option>
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Breed</label>
                <input
                  type="text"
                  value={searchForm.breed}
                  onChange={(e) => setSearchForm({ ...searchForm, breed: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <input
                  type="text"
                  value={searchForm.color}
                  onChange={(e) => setSearchForm({ ...searchForm, color: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Size</label>
                <select
                  value={searchForm.size}
                  onChange={(e) => setSearchForm({ ...searchForm, size: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Any</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  type="text"
                  value={searchForm.location_city}
                  onChange={(e) => setSearchForm({ ...searchForm, location_city: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  type="text"
                  value={searchForm.location_state}
                  onChange={(e) => setSearchForm({ ...searchForm, location_state: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Markings/Distinctive Features</label>
                <input
                  type="text"
                  value={searchForm.markings}
                  onChange={(e) => setSearchForm({ ...searchForm, markings: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Description Keywords (comma-separated)</label>
                <input
                  type="text"
                  value={searchForm.description_keywords}
                  onChange={(e) => setSearchForm({ ...searchForm, description_keywords: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., friendly, white spot, floppy ears"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Lost From (Date)</label>
                <input
                  type="date"
                  value={searchForm.date_lost_from}
                  onChange={(e) => setSearchForm({ ...searchForm, date_lost_from: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Lost To (Date)</label>
                <input
                  type="date"
                  value={searchForm.date_lost_to}
                  onChange={(e) => setSearchForm({ ...searchForm, date_lost_to: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={searchForm.include_age_progression}
                    onChange={(e) => setSearchForm({ ...searchForm, include_age_progression: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Include age progression (for pets lost 30+ days)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search Database'}
            </button>
          </form>
        )}

        {/* Search Results */}
        {activeTab === 'matches' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Search Results ({searchResults.length})</h2>
            
            {searchResults.length === 0 ? (
              <p className="text-gray-500">No matches found. Try adjusting your search criteria.</p>
            ) : (
              <div className="space-y-4">
                {searchResults.map((pet) => (
                  <div key={pet.id} className="border rounded p-4 hover:bg-gray-50">
                    <div className="flex gap-4">
                      {pet.photo_url && (
                        <img
                          src={pet.photo_url}
                          alt={pet.pet_name}
                          className="w-32 h-32 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{pet.pet_name || 'Unknown'}</h3>
                        <p className="text-sm text-gray-600">
                          {pet.pet_type} • {pet.breed} • {pet.color} • {pet.size}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Lost: {new Date(pet.date_lost).toLocaleDateString()} • 
                          Location: {pet.location_city}, {pet.location_state}
                          {pet.days_lost !== undefined && ` • ${pet.days_lost} days lost`}
                        </p>
                        {pet.markings && (
                          <p className="text-sm mt-1"><strong>Markings:</strong> {pet.markings}</p>
                        )}
                        {pet.description && (
                          <p className="text-sm mt-1 text-gray-700">{pet.description}</p>
                        )}
                        {pet.microchip && (
                          <p className="text-sm mt-1"><strong>Microchip:</strong> {pet.microchip}</p>
                        )}
                        {pet.matchScore !== undefined && (
                          <div className="mt-2">
                            <span className="text-sm font-semibold">Match Score: {pet.matchScore}/100</span>
                            {pet.matchReasons && (
                              <ul className="text-xs text-gray-600 mt-1">
                                {pet.matchReasons.map((reason: string, i: number) => (
                                  <li key={i}>• {reason}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scrape Shelter Page */}
        {loggedIn && activeTab === 'scrape' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Scrape Shelter Page</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter the URL of your shelter's pet listing page. The scraper will automatically detect the pet container pattern and extract all pets.
            </p>
            
            <form onSubmit={handleScrape}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Shelter Page URL</label>
                <input
                  type="url"
                  value={scrapeUrl || shelter?.shelter_url || ''}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="https://www.adoptapet.com/shelter/..."
                  required
                />
                {shelter?.shelter_url && (
                  <p className="text-xs text-gray-500 mt-1">
                    Saved URL: {shelter.shelter_url}
                  </p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Scraping...' : 'Scrape Page'}
              </button>
            </form>

            {scrapeResults && (
              <div className="mt-6 p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">Scrape Results</h3>
                <p>Pets Found: {scrapeResults.petsFound}</p>
                <p>Pets Saved: {scrapeResults.petsSaved}</p>
                <p className="text-sm text-gray-600">Duration: {Math.round(scrapeResults.duration / 1000)}s</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

