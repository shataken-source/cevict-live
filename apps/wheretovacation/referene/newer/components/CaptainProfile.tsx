'use client';

import React from 'react';
import { Award, MapPin, Phone, Mail, Calendar, Shield, Star, Anchor, Waves } from 'lucide-react';

interface CaptainProfileProps {
  captain: {
    name: string;
    title: string;
    experience: string;
    bio: string;
    specialties: string[];
    certifications: Array<{
      name: string;
      issuer: string;
      number: string;
      issued: string;
      expires: string;
    }>;
    stats: {
      trips: number;
      years: number;
      species: number;
      satisfaction: number;
    };
    photo: string;
    contact: {
      phone: string;
      email: string;
    };
  };
}

export default function CaptainProfile({ captain }: CaptainProfileProps) {
  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 px-6 py-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Captain Photo */}
            <div className="relative">
              <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-white shadow-xl">
                <img
                  src={captain.photo}
                  alt={captain.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Licensed
              </div>
            </div>

            {/* Captain Info */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{captain.name}</h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-4">{captain.title}</p>
              <p className="text-lg mb-6 text-blue-50 max-w-2xl">{captain.bio}</p>
              
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                  <Calendar className="w-5 h-5" />
                  <span>{captain.experience}</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                  <MapPin className="w-5 h-5" />
                  <span>Gulf Coast, AL</span>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                  <Star className="w-5 h-5" />
                  <span>{captain.stats.satisfaction}% Satisfaction</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 p-8">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">
          {/* Stats */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Anchor className="w-6 h-6 text-blue-600" />
              Captain's Track Record
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{captain.stats.trips}</div>
                <div className="text-gray-600 text-sm">Successful Trips</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{captain.stats.years}</div>
                <div className="text-gray-600 text-sm">Years Experience</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{captain.stats.species}</div>
                <div className="text-gray-600 text-sm">Species Caught</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{captain.stats.satisfaction}%</div>
                <div className="text-gray-600 text-sm">Client Satisfaction</div>
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Waves className="w-6 h-6 text-blue-600" />
              Fishing Specialties
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {captain.specialties.map((specialty, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    <span className="font-medium text-gray-800">{specialty}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-600" />
              Professional Certifications
            </h2>
            <div className="space-y-4">
              {captain.certifications.map((cert, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-1">{cert.name}</h3>
                      <p className="text-gray-600">Issued by: {cert.issuer}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        License #: {cert.number}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        <div>Issued: {cert.issued}</div>
                        <div>Expires: {cert.expires}</div>
                      </div>
                      <div className="mt-2 inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        <Shield className="w-4 h-4 mr-1" />
                        Active
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* About Section */}
          <div className="bg-blue-50 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Why Fish With Captain {captain.name.split(' ')[1]}?</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                With over {captain.stats.years} years of professional fishing experience on the Gulf Coast, 
                Captain {captain.name.split(' ')[1]} has established himself as one of the most knowledgeable 
                and reliable charter captains in the region.
              </p>
              <p>
                His deep understanding of local waters, seasonal patterns, and fish behavior ensures that 
                every trip has the highest probability of success. Whether you're a seasoned angler or 
                a first-time fisherman, Captain {captain.name.split(' ')[1]} provides patient instruction 
                and expert guidance.
              </p>
              <p>
                Safety is paramount aboard his vessel, which is regularly inspected and equipped with 
                all required safety equipment. His commitment to customer satisfaction is reflected in 
                his impressive {captain.stats.satisfaction}% satisfaction rate and countless repeat clients.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Contact Card */}
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">Book Your Trip</h3>
            <div className="space-y-3">
              <a
                href={`tel:${captain.contact.phone}`}
                className="flex items-center gap-3 hover:bg-white/10 p-2 rounded-lg transition-colors"
              >
                <Phone className="w-5 h-5" />
                <span>{captain.contact.phone}</span>
              </a>
              <a
                href={`mailto:${captain.contact.email}`}
                className="flex items-center gap-3 hover:bg-white/10 p-2 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span>{captain.contact.email}</span>
              </a>
            </div>
            <button className="w-full mt-4 bg-white text-blue-600 font-semibold py-3 rounded-lg hover:bg-gray-100 transition-colors">
              Check Availability
            </button>
          </div>

          {/* Quick Facts */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Facts</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                <span>USCG Licensed Captain</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                <span>Inspected Vessel Annually</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                <span>Fully Insured</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                <span>All Gear Provided</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                <span>Fishing License Included</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                <span>Child-Friendly</span>
              </li>
            </ul>
          </div>

          {/* Testimonials Preview */}
          <div className="bg-yellow-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">What Clients Say</h3>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm italic">
                  "Best charter experience we've ever had! Captain knew exactly where to find the fish."
                </p>
                <p className="text-gray-500 text-xs mt-2">- The Johnson Family</p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm italic">
                  "Patient, knowledgeable, and great with kids. We'll definitely be back!"
                </p>
                <p className="text-gray-500 text-xs mt-2">- Mike R.</p>
              </div>
            </div>
            <button className="w-full mt-4 text-blue-600 font-medium text-sm hover:text-blue-800 transition-colors">
              Read All Reviews →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sample data for the captain
export const sampleCaptainData = {
  name: "Captain Michael Thompson",
  title: "USCG Licensed Charter Captain",
  experience: "15+ Years Gulf Coast Experience",
  bio: "Born and raised on the Gulf Coast, Captain Thompson has been fishing these waters since childhood. His passion for the ocean and dedication to providing exceptional experiences has made him one of the most sought-after charter captains in Alabama.",
  specialties: [
    "Inshore Fishing (Redfish, Speckled Trout, Flounder)",
    "Offshore Fishing (Red Snapper, Grouper, Amberjack)",
    "Light Tackle Fishing",
    "Family-Friendly Trips",
    "Fly Fishing",
    "Deep Sea Fishing"
  ],
  certifications: [
    {
      name: "USCG Master Captain License",
      issuer: "U.S. Coast Guard",
      number: "123456789",
      issued: "2010-03-15",
      expires: "2025-03-15"
    },
    {
      name: "Commercial Fishing License",
      issuer: "Alabama Marine Resources",
      number: "AL-2021-CF-789",
      issued: "2021-01-01",
      expires: "2025-12-31"
    },
    {
      name: "First Aid & CPR Certified",
      issuer: "American Red Cross",
      number: "FA-2023-456789",
      issued: "2023-06-01",
      expires: "2025-06-01"
    }
  ],
  stats: {
    trips: 2500,
    years: 15,
    species: 47,
    satisfaction: 98
  },
  photo: "/captain-photo.jpg",
  contact: {
    phone: "(251) 555-0123",
    email: "captain@gulfcoastcharters.com"
  }
};
