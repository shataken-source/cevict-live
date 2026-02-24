'use client';

import React from 'react';
import { MapPin, Phone, Clock, Navigation, Anchor } from 'lucide-react';

interface LocationInfoProps {
  variant?: 'header' | 'footer' | 'full';
}

const locations = [
  {
    name: "Orange Beach Marina",
    address: "26389 Canal Rd, Orange Beach, AL 36561",
    coordinates: "30.2744° N, 87.5719° W",
    phone: "(251) 555-0123",
    hours: "Daily 5:00 AM - 8:00 PM",
    isPrimary: true
  },
  {
    name: "Gulf Shores Public Launch",
    address: "24500 Gulf Shores Pkwy, Gulf Shores, AL 36542",
    coordinates: "30.2671° N, 87.6164° W",
    phone: "(251) 555-0123",
    hours: "Daily 6:00 AM - 7:00 PM",
    isPrimary: false
  },
  {
    name: "Fort Morgan Marina",
    address: "1575 AL-180 W, Gulf Shores, AL 36542",
    coordinates: "30.2298° N, 88.0260° W",
    phone: "(251) 555-0123",
    hours: "Daily 6:00 AM - 6:00 PM",
    isPrimary: false
  }
];

export default function LocationInfo({ variant = 'full' }: LocationInfoProps) {
  const primaryLocation = locations.find(loc => loc.isPrimary);
  const secondaryLocations = locations.filter(loc => !loc.isPrimary);

  if (variant === 'header') {
    return (
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin className="w-4 h-4" />
          <span className="font-medium">{primaryLocation?.name}</span>
        </div>
        <a href={`tel:${primaryLocation?.phone}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
          <Phone className="w-4 h-4" />
          <span>{primaryLocation?.phone}</span>
        </a>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Pickup Locations
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <strong>Primary:</strong> {primaryLocation?.name}
            </div>
            <div className="ml-4">{primaryLocation?.address}</div>
            {secondaryLocations.map((location, index) => (
              <div key={index}>
                <strong>Also available:</strong> {location.name}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Hours
          </h3>
          <p className="text-sm text-gray-600">
            {primaryLocation?.hours} (All locations)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6">
        <div className="flex items-center gap-3">
          <Anchor className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Our Pickup Locations</h1>
            <p className="text-blue-100">Convenient launch points across the Alabama Gulf Coast</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Primary Location */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <h2 className="text-xl font-bold text-gray-800">Primary Pickup Location</h2>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {primaryLocation?.name}
                </h3>
                <div className="space-y-2 text-gray-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-1 text-green-600" />
                    <span>{primaryLocation?.address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Navigation className="w-4 h-4 mt-1 text-green-600" />
                    <span>{primaryLocation?.coordinates}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 mt-1 text-green-600" />
                    <a href={`tel:${primaryLocation?.phone}`} className="text-blue-600 hover:text-blue-800">
                      {primaryLocation?.phone}
                    </a>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-1 text-green-600" />
                    <span>{primaryLocation?.hours}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MapPin className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Interactive Map</p>
                    <p className="text-xs">Orange Beach Marina</p>
                  </div>
                </div>
                <button className="w-full mt-3 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
                  Get Directions
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Locations */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Additional Pickup Locations</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {secondaryLocations.map((location, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {location.name}
                </h3>
                <div className="space-y-2 text-gray-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-1 text-blue-600" />
                    <span>{location.address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Navigation className="w-4 h-4 mt-1 text-blue-600" />
                    <span>{location.coordinates}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 mt-1 text-blue-600" />
                    <a href={`tel:${location.phone}`} className="text-blue-600 hover:text-blue-800">
                      {location.phone}
                    </a>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-1 text-blue-600" />
                    <span>{location.hours}</span>
                  </div>
                </div>
                <button className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  Get Directions
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Important Information */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-yellow-800 mb-3">Important Pickup Information</h3>
          <div className="space-y-3 text-yellow-700">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2" />
              <div>
                <strong>Arrival Time:</strong> Please arrive 15 minutes before your scheduled departure time.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2" />
              <div>
                <strong>Parking:</strong> Free parking is available at all locations. Look for the Gulf Coast Charters signs.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2" />
              <div>
                <strong>Weather:</strong> Pickup locations may change based on weather conditions. We'll notify you of any changes.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2" />
              <div>
                <strong>Special Requests:</strong> Need a different pickup location? Call us to arrange custom pickup.
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8 text-center bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-bold text-blue-800 mb-3">Questions About Pickup?</h3>
          <p className="text-blue-700 mb-4">
            Our team is here to help you get to the right place on time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${primaryLocation?.phone}`}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Call Us
            </a>
            <a
              href="mailto:captain@gulfcoastcharters.com"
              className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
