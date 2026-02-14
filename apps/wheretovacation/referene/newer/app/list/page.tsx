"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function ListPropertyPage() {
  const [formData, setFormData] = useState({
    propertyName: '',
    propertyType: '',
    location: '',
    bedrooms: '',
    bathrooms: '',
    maxGuests: '',
    pricePerNight: '',
    description: '',
    amenities: '',
    activities: [] as string[],
    images: [] as File[],
    contactName: '',
    contactEmail: '',
    contactPhone: ''
  });

  const propertyTypes = [
    'Beach House', 'Mountain Cabin', 'City Apartment', 'Lake House', 
    'Ski Chalet', 'Villa', 'Condo', 'Cottage', 'Studio', 'Luxury Home'
  ];

  const activityOptions = [
    '🏄 Surfing & Watersports', '🎣 Fishing Adventures', '🏔️ Mountain & Hiking',
    '🏖️ Beach & Relaxation', '🎿 Winter Sports', '🏛️ Cultural & Heritage'
  ];

  const amenities = [
    'WiFi', 'Kitchen', 'Parking', 'Pool', 'Hot Tub', 'Air Conditioning',
    'Heating', 'Washer/Dryer', 'TV', 'BBQ Grill', 'Fireplace', 'Gym'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleActivityToggle = (activity: string) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter(a => a !== activity)
        : [...prev.activities, activity]
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...Array.from(e.target.files || [])]
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would normally submit to an API
    alert('Property listing submitted successfully! We will review and publish your property within 24 hours.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            List Your Vacation Property
          </h1>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            Share your amazing vacation rental with activity-seeking travelers worldwide.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Property Basics */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Property Information</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white font-medium mb-2">Property Name *</label>
                <input
                  type="text"
                  name="propertyName"
                  value={formData.propertyName}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:border-cyan-400 focus:outline-none"
                  placeholder="Sunset Beach Villa"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Property Type *</label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="">Select property type</option>
                  {propertyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Location *</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:border-cyan-400 focus:outline-none"
                  placeholder="Miami Beach, Florida"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Price per Night ($) *</label>
                <input
                  type="number"
                  name="pricePerNight"
                  value={formData.pricePerNight}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:border-cyan-400 focus:outline-none"
                  placeholder="250"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Bedrooms *</label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:border-cyan-400 focus:outline-none"
                  placeholder="3"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Bathrooms *</label>
                <input
                  type="number"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.5"
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:border-cyan-400 focus:outline-none"
                  placeholder="2"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Maximum Guests *</label>
                <input
                  type="number"
                  name="maxGuests"
                  value={formData.maxGuests}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:border-cyan-400 focus:outline-none"
                  placeholder="8"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-white font-medium mb-2">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:border-cyan-400 focus:outline-none"
                placeholder="Describe your property and what makes it special for activity-based vacationers..."
              />
            </div>
          </div>

          {/* Activities */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Nearby Activities</h2>
            <p className="text-blue-200 mb-4">Select all activities available near your property</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              {activityOptions.map(activity => (
                <label key={activity} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.activities.includes(activity)}
                    onChange={() => handleActivityToggle(activity)}
                    className="w-5 h-5 text-cyan-500 bg-white/10 border-white/20 rounded focus:ring-cyan-400"
                  />
                  <span className="text-white">{activity}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Amenities</h2>
            <p className="text-blue-200 mb-4">Select all amenities your property offers</p>
            
            <div className="grid md:grid-cols-3 gap-4">
              {amenities.map(amenity => (
                <label key={amenity} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-cyan-500 bg-white/10 border-white/20 rounded focus:ring-cyan-400"
                  />
                  <span className="text-white">{amenity}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Property Photos</h2>
            <p className="text-blue-200 mb-4">Upload high-quality photos of your property (minimum 5 photos)</p>
            
            <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="text-4xl mb-4">📷</div>
                <p className="text-white font-medium mb-2">Click to upload photos</p>
                <p className="text-blue-300 text-sm">or drag and drop</p>
                <p className="text-blue-400 text-sm mt-2">PNG, JPG, GIF up to 10MB</p>
              </label>
            </div>
            
            {formData.images.length > 0 && (
              <div className="mt-4">
                <p className="text-white font-medium mb-2">Selected Photos: {formData.images.length}</p>
                <div className="flex flex-wrap gap-2">
                  {formData.images.map((file, index) => (
                    <span key={index} className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm">
                      {file.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white font-medium mb-2">Your Name *</label>
                <input
                  type="text"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:border-cyan-400 focus:outline-none"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Email Address *</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  required
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:border-cyan-400 focus:outline-none"
                  placeholder="john@example.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-white font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:border-cyan-400 focus:outline-none"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              className="px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-200 shadow-lg text-lg"
            >
              🏠 Submit Property Listing
            </button>
          </div>
        </form>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-all"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
