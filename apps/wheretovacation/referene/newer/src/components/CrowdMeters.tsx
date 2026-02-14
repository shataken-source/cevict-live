'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  MapPin, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Camera,
  Thermometer,
  Cloud,
  AlertTriangle,
  CheckCircle,
  Star,
  Award,
  BarChart3,
  Map,
  Navigation,
  Eye,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CrowdMeters, { CrowdReport, Venue, CrowdAnalytics } from '@/lib/crowdMeters';

interface CrowdMetersProps {
  userTrustLevel: string;
  userName: string;
  userId: string;
  userBadge?: string;
}

export default function CrowdMetersComponent({ 
  userTrustLevel, 
  userName, 
  userId, 
  userBadge 
}: CrowdMetersProps) {
  const [crowdMeters, setCrowdMeters] = useState<CrowdMeters | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [currentReports, setCurrentReports] = useState<Map<string, CrowdReport>>(new Map());
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'analytics'>('list');
  const [isReporting, setIsReporting] = useState(false);
  const [reportData, setReportData] = useState({
    currentCapacity: '',
    notes: ''
  });
  const [analytics, setAnalytics] = useState<Map<string, CrowdAnalytics>>(new Map());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeCrowdMeters();
  }, []);

  const initializeCrowdMeters = async () => {
    try {
      const metersInstance = new CrowdMeters({
        enablePredictions: true,
        enableHeatMaps: true,
        minTrustLevelToReport: 'new',
        reportExpirationHours: 2,
        maxReportsPerVenue: 50,
        weightByTrustLevel: true,
        enablePhotoVerification: true
      });

      setCrowdMeters(metersInstance);

      // Listen for events
      metersInstance.on('crowd_reported', (report: CrowdReport) => {
        setCurrentReports(prev => new Map(prev.set(report.venueId, report)));
      });

      metersInstance.on('venue_updated', (data: any) => {
        // Refresh venue data
        loadCurrentCrowdLevels();
      });

      // Load venues and current reports
      const venueList = metersInstance.getVenues();
      setVenues(venueList);
      
      await loadCurrentCrowdLevels();

    } catch (error) {
      console.error('Error initializing crowd meters:', error);
    }
  };

  const loadCurrentCrowdLevels = async () => {
    if (!crowdMeters) return;

    try {
      const reports = new Map<string, CrowdReport>();
      
      for (const venue of venues) {
        const report = await crowdMeters.getCurrentCrowdLevel(venue.id);
        if (report) {
          reports.set(venue.id, report);
        }
      }
      
      setCurrentReports(reports);

    } catch (error) {
      console.error('Error loading crowd levels:', error);
    }
  };

  const handleReportCrowd = async () => {
    if (!selectedVenue || !reportData.currentCapacity) return;

    try {
      setIsReporting(true);
      
      await crowdMeters?.reportCrowdLevel({
        venueId: selectedVenue.id,
        currentCapacity: parseInt(reportData.currentCapacity),
        notes: reportData.notes
      }, {
        id: userId,
        name: userName,
        trustLevel: userTrustLevel,
        badge: userBadge
      });

      // Reset form
      setReportData({ currentCapacity: '', notes: '' });
      setIsReporting(false);

    } catch (error) {
      console.error('Error reporting crowd:', error);
      setIsReporting(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Handle photo upload
      console.log('Photo uploaded:', files[0]);
    }
  };

  const getCrowdLevelColor = (level: string) => {
    switch (level) {
      case 'empty': return 'bg-green-500';
      case 'quiet': return 'bg-blue-500';
      case 'moderate': return 'bg-yellow-500';
      case 'busy': return 'bg-orange-500';
      case 'crowded': return 'bg-red-500';
      case 'full': return 'bg-red-700';
      default: return 'bg-gray-500';
    }
  };

  const getCrowdLevelIcon = (level: string) => {
    switch (level) {
      case 'empty': return <Users className="w-4 h-4" />;
      case 'quiet': return <Users className="w-4 h-4" />;
      case 'moderate': return <Users className="w-4 h-4" />;
      case 'busy': return <TrendingUp className="w-4 h-4" />;
      case 'crowded': return <TrendingUp className="w-4 h-4" />;
      case 'full': return <AlertTriangle className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getTrustLevelBadge = (level: string) => {
    switch (level) {
      case 'elite':
        return <Badge className="bg-purple-100 text-purple-800"><Award className="w-3 h-3 mr-1" />Elite</Badge>;
      case 'veteran':
        return <Badge className="bg-yellow-100 text-yellow-800"><Star className="w-3 h-3 mr-1" />Veteran</Badge>;
      case 'verified':
        return <Badge variant="outline"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      default:
        return null;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const loadAnalytics = async (venueId: string) => {
    if (!crowdMeters) return;

    try {
      const venueAnalytics = await crowdMeters.getCrowdAnalytics(venueId);
      if (venueAnalytics) {
        setAnalytics(prev => new Map(prev.set(venueId, venueAnalytics)));
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  // List View
  if (viewMode === 'list') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Live Crowd Meters</h1>
                  <p className="text-sm text-gray-600">Real-time venue capacity from the community</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getTrustLevelBadge(userTrustLevel)}
                  <span className="text-sm text-gray-600">{userName}</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    List
                  </Button>
                  <Button
                    variant={viewMode === 'map' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('map')}
                  >
                    <Map className="w-4 h-4 mr-2" />
                    Map
                  </Button>
                  <Button
                    variant={viewMode === 'analytics' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('analytics')}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Venue List */}
            <div className="lg:col-span-2 space-y-4">
              {venues.map((venue) => {
                const report = currentReports.get(venue.id);
                
                return (
                  <Card key={venue.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{venue.name}</h3>
                          <Badge variant="outline">{venue.type}</Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                          <MapPin className="w-4 h-4" />
                          <span>{venue.location.address}</span>
                        </div>

                        {report ? (
                          <div className="space-y-3">
                            {/* Current Crowd Level */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${getCrowdLevelColor(report.crowdLevel)}`} />
                                <span className="font-medium capitalize">{report.crowdLevel}</span>
                                <span className="text-sm text-gray-600">
                                  ({report.currentCapacity}/{report.maxCapacity})
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>{formatTimeAgo(report.reportedAt)}</span>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                              <Progress value={report.percentage} className="h-2" />
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>{Math.round(report.percentage)}% full</span>
                                {report.reports > 1 && (
                                  <span>{report.reports} reports</span>
                                )}
                              </div>
                            </div>

                            {/* Reporter Info */}
                            <div className="flex items-center space-x-2 pt-3 border-t">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {report.reporterName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-gray-600">{report.reporterName}</span>
                              {getTrustLevelBadge(report.reporterTrustLevel)}
                              {report.verified && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>

                            {report.notes && (
                              <div className="pt-2 border-t">
                                <p className="text-sm text-gray-600 italic">"{report.notes}"</p>
                              </div>
                            )}

                            {report.photos && report.photos.length > 0 && (
                              <div className="flex space-x-2 pt-2">
                                {report.photos.slice(0, 3).map((photo, index) => (
                                  <img 
                                    key={index}
                                    src={photo} 
                                    alt="Crowd photo" 
                                    className="w-16 h-16 object-cover rounded-lg"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            <Eye className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No recent crowd reports</p>
                            <p className="text-xs">Be the first to share current conditions!</p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVenue(venue);
                            setIsReporting(true);
                          }}
                        >
                          Report
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadAnalytics(venue.id)}
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* How it Works */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  How It Works
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5" />
                    <div>
                      <p className="font-medium">Community-Powered</p>
                      <p className="text-gray-600">Real people report current conditions</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-1.5" />
                    <div>
                      <p className="font-medium">Trust Weighted</p>
                      <p className="text-gray-600">Reports from trusted users count more</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-1.5" />
                    <div>
                      <p className="font-medium">Auto-Expires</p>
                      <p className="text-gray-600">Reports expire after 2 hours for freshness</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Your Trust Level */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Your Trust Level</h3>
                <div className="space-y-3">
                  {getTrustLevelBadge(userTrustLevel)}
                  <p className="text-sm text-gray-600">
                    Your reports help the community make better decisions about where to go.
                  </p>
                  <div className="text-xs text-gray-500">
                    <p>• New users can report immediately</p>
                    <p>• Verified reports get weighted higher</p>
                    <p>• Veteran users can verify others' reports</p>
                  </div>
                </div>
              </Card>

              {/* Legend */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Crowd Levels</h3>
                <div className="space-y-2">
                  {[
                    { level: 'Empty', color: 'bg-green-500', desc: 'Plenty of space' },
                    { level: 'Quiet', color: 'bg-blue-500', desc: 'Some people around' },
                    { level: 'Moderate', color: 'bg-yellow-500', desc: 'Getting busy' },
                    { level: 'Busy', color: 'bg-orange-500', desc: 'Expect waits' },
                    { level: 'Crowded', color: 'bg-red-500', desc: 'Very busy' },
                    { level: 'Full', color: 'bg-red-700', desc: 'At capacity' }
                  ].map((item) => (
                    <div key={item.level} className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${item.color}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.level}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Report Modal */}
        {isReporting && selectedVenue && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">
                Report Crowd Level - {selectedVenue.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Number of People
                  </label>
                  <Input
                    type="number"
                    placeholder={`Max capacity: ${selectedVenue.maxCapacity}`}
                    value={reportData.currentCapacity}
                    onChange={(e) => setReportData(prev => ({ ...prev, currentCapacity: e.target.value }))}
                    max={selectedVenue.maxCapacity}
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <Textarea
                    placeholder="Any additional details about the crowd..."
                    value={reportData.notes}
                    onChange={(e) => setReportData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photo (optional)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Add Photo
                  </Button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsReporting(false);
                    setSelectedVenue(null);
                    setReportData({ currentCapacity: '', notes: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReportCrowd}
                  disabled={!reportData.currentCapacity || isReporting}
                >
                  {isReporting ? 'Reporting...' : 'Submit Report'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Map View
  if (viewMode === 'map') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Map className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Crowd Map</h1>
              </div>
              
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => setViewMode('list')}>
                  <Users className="w-4 h-4 mr-2" />
                  List
                </Button>
                <Button variant="outline" size="sm" onClick={() => setViewMode('analytics')}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="h-screen">
          {/* Map implementation would go here */}
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Map className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Interactive map coming soon</p>
              <p className="text-sm text-gray-500">Showing real-time crowd levels across all venues</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Analytics View
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Crowd Analytics</h1>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => setViewMode('list')}>
                <Users className="w-4 h-4 mr-2" />
                List
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewMode('map')}>
                <Map className="w-4 h-4 mr-2" />
                Map
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {venues.map((venue) => {
            const venueAnalytics = analytics.get(venue.id);
            
            return (
              <Card key={venue.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{venue.name}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadAnalytics(venue.id)}
                  >
                    Refresh
                  </Button>
                </div>

                {venueAnalytics ? (
                  <div className="space-y-4">
                    {/* Average Crowd Level */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Average Crowd Level</span>
                        <span>{Math.round(venueAnalytics.averageCrowdLevel)}%</span>
                      </div>
                      <Progress value={venueAnalytics.averageCrowdLevel} />
                    </div>

                    {/* Peak Times */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Peak Times</h4>
                      <div className="grid grid-cols-6 gap-1">
                        {Array.from({ length: 24 }, (_, i) => {
                          const peakData = venueAnalytics.peakTimes.find(p => p.hour === i);
                          const level = peakData ? peakData.level : 20;
                          const intensity = level / 100;
                          
                          return (
                            <div
                              key={i}
                              className="h-8 rounded flex items-center justify-center text-xs"
                              style={{
                                backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                                color: intensity > 0.5 ? 'white' : 'black'
                              }}
                              title={`${i}:00 - ${level}%`}
                            >
                              {i}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Weekly Trend */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">Weekly Trend</h4>
                      <div className="space-y-2">
                        {venueAnalytics.weeklyTrend.map((day) => (
                          <div key={day.day} className="flex items-center justify-between">
                            <span className="text-sm">{day.day}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24">
                                <Progress value={day.averageLevel} className="h-2" />
                              </div>
                              <span className="text-sm w-12 text-right">
                                {Math.round(day.averageLevel)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reliability */}
                    <div className="pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Data Reliability</span>
                        <span>{venueAnalytics.reliability}%</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Total Reports</span>
                        <span>{venueAnalytics.reportCount}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No analytics data available</p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
