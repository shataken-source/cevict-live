'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  Video, 
  Calendar,
  FileText,
  Award,
  Users,
  Camera,
  Play,
  Clock,
  Star,
  ThumbsUp,
  MessageSquare,
  Share2,
  ChevronRight,
  Heart,
  Zap
} from 'lucide-react';

interface SafetyVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  date: string;
  duration: string;
  category: string;
  views: number;
  likes: number;
}

interface SafetyChecklist {
  id: string;
  category: string;
  items: ChecklistItem[];
  lastChecked: string;
  nextDue: string;
  status: 'complete' | 'pending' | 'overdue';
}

interface ChecklistItem {
  id: string;
  item: string;
  completed: boolean;
  notes?: string;
}

interface GearShowcase {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  importance: 'critical' | 'essential' | 'recommended';
  link?: string;
}

export default function SafetyValidation() {
  const [activeTab, setActiveTab] = useState<'videos' | 'checklist' | 'gear'>('videos');
  const [selectedVideo, setSelectedVideo] = useState<SafetyVideo | null>(null);

  const safetyVideos: SafetyVideo[] = [
    {
      id: '1',
      title: 'Behind the Scenes: Safety Check',
      description: 'Watch our crew perform the daily safety check on the Breakwater Supply Marine First Aid Kit and all safety equipment.',
      thumbnail: '/api/placeholder/400/225',
      videoUrl: '/videos/safety-check',
      date: '2024-11-15',
      duration: '3:45',
      category: 'Daily Safety',
      views: 245,
      likes: 18
    },
    {
      id: '2',
      title: 'Life Jacket Inspection & Training',
      description: 'Proper life jacket fitting and inspection procedures for all ages.',
      thumbnail: '/api/placeholder/400/225',
      videoUrl: '/videos/life-jackets',
      date: '2024-11-10',
      duration: '5:12',
      category: 'Equipment',
      views: 189,
      likes: 15
    },
    {
      id: '3',
      title: 'Emergency Procedures Overview',
      description: 'Complete overview of our emergency protocols and communication systems.',
      thumbnail: '/api/placeholder/400/225',
      videoUrl: '/videos/emergency',
      date: '2024-11-08',
      duration: '7:30',
      category: 'Training',
      views: 156,
      likes: 12
    }
  ];

  const safetyChecklists: SafetyChecklist[] = [
    {
      id: '1',
      category: 'Daily Pre-Departure',
      lastChecked: '2024-11-16 06:00 AM',
      nextDue: '2024-11-17 06:00 AM',
      status: 'complete',
      items: [
        { id: '1', item: 'Breakwater Supply First Aid Kit inspection', completed: true, notes: 'All supplies present and dry' },
        { id: '2', item: 'Life jacket count and condition check', completed: true, notes: '12 adult, 6 child jackets - all excellent' },
        { id: '3', item: 'Communication equipment test', completed: true, notes: 'Radio and satellite phone working' },
        { id: '4', item: 'Fire extinguisher inspection', completed: true, notes: 'All extinguishers charged and accessible' },
        { id: '5', item: 'Navigation lights test', completed: true, notes: 'All lights functioning properly' }
      ]
    },
    {
      id: '2',
      category: 'Weekly Maintenance',
      lastChecked: '2024-11-15 02:00 PM',
      nextDue: '2024-11-22 02:00 PM',
      status: 'complete',
      items: [
        { id: '6', item: 'Engine oil and fluid levels', completed: true, notes: 'All levels optimal' },
        { id: '7', item: 'Safety equipment inventory', completed: true, notes: 'Full stock maintained' },
        { id: '8', item: 'First aid kit restock', completed: true, notes: 'Added bandages and antiseptic' },
        { id: '9', item: 'Emergency flares expiration check', completed: true, notes: 'All flares within expiration' }
      ]
    },
    {
      id: '3',
      category: 'Monthly Inspection',
      lastChecked: '2024-11-01 10:00 AM',
      nextDue: '2024-12-01 10:00 AM',
      status: 'pending',
      items: [
        { id: '10', item: 'USCG certification verification', completed: false, notes: 'Scheduled for Dec 1st' },
        { id: '11', item: 'Hull integrity inspection', completed: false, notes: 'Annual inspection due' },
        { id: '12', item: 'Comprehensive safety drill', completed: false, notes: 'Team training scheduled' }
      ]
    }
  ];

  const gearShowcase: GearShowcase[] = [
    {
      id: '1',
      name: 'Breakwater Supply Marine First Aid Kit',
      description: '100% waterproof 2L dry bag keeps medical supplies bone-dry in maritime conditions. Essential for professional charter operations.',
      image: '/api/placeholder/300/200',
      category: 'Medical Safety',
      importance: 'critical',
      link: '/gear/breakwater-first-aid'
    },
    {
      id: '2',
      name: 'Pelican Marine Floating Pouch',
      description: 'IP68 waterproof rating with built-in air cushions. Protects guest electronics and prevents sinking if dropped.',
      image: '/api/placeholder/300/200',
      category: 'Guest Protection',
      importance: 'essential',
      link: '/gear/pelican-pouch'
    },
    {
      id: '3',
      name: 'Professional Life Jackets',
      description: 'USCG-approved life jackets in all sizes, regularly inspected and maintained for maximum safety.',
      image: '/api/placeholder/300/200',
      category: 'Personal Safety',
      importance: 'critical'
    },
    {
      id: '4',
      name: 'Emergency Communication System',
      description: 'Satellite phone and VHF radio with backup power systems for reliable communication in all conditions.',
      image: '/api/placeholder/300/200',
      category: 'Communication',
      importance: 'critical'
    }
  ];

  const handlePlayVideo = (video: SafetyVideo) => {
    setSelectedVideo(video);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'essential':
        return 'bg-orange-100 text-orange-800';
      case 'recommended':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Professional Safety & Gear Validation</h2>
            <p className="text-red-100">Showcasing our commitment to safety and professionalism</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-2 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">USCG Certified</span>
          </div>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-2 rounded-lg">
            <Award className="w-4 h-4" />
            <span className="text-sm">Professional Standards</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'videos'
                ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Video className="w-5 h-5" />
              Safety Videos
            </div>
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'checklist'
                ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" />
              Safety Checklists
            </div>
          </button>
          <button
            onClick={() => setActiveTab('gear')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
              activeTab === 'gear'
                ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-5 h-5" />
              Professional Gear
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Safety Videos Tab */}
        {activeTab === 'videos' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Behind the Scenes Safety Content</h3>
              <p className="text-gray-600">
                Monthly videos showing our commitment to professional safety standards and equipment maintenance.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {safetyVideos.map((video) => (
                <div key={video.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <button
                        onClick={() => handlePlayVideo(video)}
                        className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                      >
                        <Play className="w-6 h-6 text-white ml-1" />
                      </button>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                      {video.duration}
                    </div>
                  </div>

                  <div className="p-4">
                    <h4 className="font-bold text-gray-900 mb-2">{video.title}</h4>
                    <p className="text-sm text-gray-600 mb-3">{video.description}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(video.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{video.views} views</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                        {video.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1 text-gray-600 hover:text-red-600">
                          <ThumbsUp className="w-4 h-4" />
                          <span className="text-sm">{video.likes}</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Safety Checklists Tab */}
        {activeTab === 'checklist' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Safety Inspection Records</h3>
              <p className="text-gray-600">
                Transparent safety checks performed daily, weekly, and monthly to ensure maximum safety.
              </p>
            </div>

            <div className="space-y-4">
              {safetyChecklists.map((checklist) => (
                <div key={checklist.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-gray-900">{checklist.category}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Last: {new Date(checklist.lastChecked).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {new Date(checklist.nextDue).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(checklist.status)}`}>
                      {checklist.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {checklist.items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <CheckCircle 
                          className={`w-5 h-5 mt-0.5 ${item.completed ? 'text-green-600' : 'text-gray-400'}`}
                        />
                        <div className="flex-1">
                          <p className={`text-sm ${item.completed ? 'text-gray-900' : 'text-gray-600'}`}>
                            {item.item}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Professional Gear Tab */}
        {activeTab === 'gear' && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Professional Safety Equipment</h3>
              <p className="text-gray-600">
                High-quality gear that sets us apart from amateur operations and ensures your safety.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {gearShowcase.map((gear) => (
                <div key={gear.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="flex gap-4">
                    <img 
                      src={gear.image} 
                      alt={gear.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-gray-900">{gear.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImportanceBadge(gear.importance)}`}>
                          {gear.importance}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{gear.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                          {gear.category}
                        </span>
                        {gear.link && (
                          <button className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1">
                            Learn More
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h4 className="font-bold text-red-900">Why Professional Safety Matters</h4>
              </div>
              <p className="text-red-800 mb-4">
                While fishing is fun, safety is our highest priority. Our professional equipment and 
                rigorous safety protocols ensure that you can focus on enjoying your adventure with 
                complete peace of mind.
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-red-800">USCG Certified Operations</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-red-800">Professional Equipment Only</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-red-800">Trained & Experienced Crew</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold">{selectedVideo.title}</h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ×
              </button>
            </div>
            <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <Video className="w-16 h-16 mx-auto mb-4" />
                <p>Video player would appear here</p>
                <p className="text-sm text-gray-400">{selectedVideo.description}</p>
              </div>
            </div>
            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <p className="text-gray-600">{selectedVideo.description}</p>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-1 text-gray-600 hover:text-red-600">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{selectedVideo.likes}</span>
                  </button>
                  <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Eye icon import
function Eye({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
