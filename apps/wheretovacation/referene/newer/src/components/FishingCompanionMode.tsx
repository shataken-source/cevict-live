'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  MapPin, 
  Navigation, 
  Wind, 
  Waves, 
  Thermometer,
  Clock,
  MessageCircle,
  Camera,
  Fish,
  Anchor,
  Radio,
  Package,
  Droplets,
  Zap,
  AlertTriangle,
  CheckCircle,
  Send,
  Plus,
  Sun,
  Cloud,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FishingCompanionMode, { CompanionSession, Catch, CompanionMessage } from '@/lib/fishingCompanionMode';

interface FishingCompanionModeProps {
  charterId: string;
  userId: string;
}

export default function FishingCompanionModeComponent({ charterId, userId }: FishingCompanionModeProps) {
  const [session, setSession] = useState<CompanionSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [messageInput, setMessageInput] = useState('');
  const [quickCatchData, setQuickCatchData] = useState({ species: '', weight: '' });
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [location, setLocation] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const companionRef = useRef<FishingCompanionMode | null>(null);

  useEffect(() => {
    initializeCompanion();
  }, [charterId, userId]);

  useEffect(() => {
    // Scroll to bottom of messages
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session?.messages]);

  const initializeCompanion = async () => {
    setIsLoading(true);
    try {
      const companion = new FishingCompanionMode();
      companionRef.current = companion;

      // Listen for events
      companion.on('session_started', (sessionData) => {
        setSession(sessionData);
      });

      companion.on('catch_logged', (catchData) => {
        // Show success notification
        showNotification('Catch logged successfully!', 'success');
      });

      companion.on('message_received', (message) => {
        // Show notification for captain messages
        if (message.senderType === 'captain') {
          showNotification('New message from captain', 'info');
        }
      });

      companion.on('location_updated', (locationData) => {
        setLocation(locationData);
      });

      companion.on('weather_alert', (alerts) => {
        showNotification('Weather alert: ' + alerts[0].message, 'warning');
      });

      // Start session
      const sessionData = await companion.startCompanionSession(charterId, userId);
      setSession(sessionData);

    } catch (error) {
      console.error('Error initializing companion:', error);
      showNotification('Failed to start companion mode', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickCatch = async () => {
    if (!quickCatchData.species || !quickCatchData.weight) {
      showNotification('Please enter species and weight', 'error');
      return;
    }

    try {
      const weight = parseFloat(quickCatchData.weight);
      if (isNaN(weight) || weight <= 0) {
        showNotification('Please enter a valid weight', 'error');
        return;
      }

      await companionRef.current?.logQuickCatch(
        quickCatchData.species,
        weight
      );

      // Reset form
      setQuickCatchData({ species: '', weight: '' });
      setActiveTab('catches');

    } catch (error) {
      console.error('Error logging catch:', error);
      showNotification('Failed to log catch', 'error');
    }
  };

  const handleSendMessage = async (type: 'text' | 'supply_request' = 'text', requestType?: 'ice' | 'bait' | 'fuel' | 'restroom' | 'medical') => {
    if (!messageInput.trim()) return;

    try {
      await companionRef.current?.sendMessageToCaptain(
        messageInput,
        type,
        requestType
      );

      setMessageInput('');

    } catch (error) {
      console.error('Error sending message:', error);
      showNotification('Failed to send message', 'error');
    }
  };

  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Convert to base64 or upload to cloud storage
      const photoUrl = await processPhoto(file);
      
      // Log catch with photo
      if (quickCatchData.species && quickCatchData.weight) {
        const weight = parseFloat(quickCatchData.weight);
        await companionRef.current?.logQuickCatch(
          quickCatchData.species,
          weight,
          photoUrl
        );
      }

    } catch (error) {
      console.error('Error processing photo:', error);
      showNotification('Failed to process photo', 'error');
    }
  };

  const processPhoto = async (file: File): Promise<string> => {
    // Mock photo processing - in real app, upload to cloud storage
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // This would integrate with your notification system
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  const getSupplyButtons = () => [
    { icon: Droplets, label: 'Ice', type: 'ice' as const },
    { icon: Package, label: 'Bait', type: 'bait' as const },
    { icon: Zap, label: 'Fuel', type: 'fuel' as const },
    { icon: Heart, label: 'Medical', type: 'medical' as const },
    { icon: Radio, label: 'Restroom', type: 'restroom' as const }
  ];

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
        return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'cloudy':
        return <Cloud className="w-8 h-8 text-gray-500" />;
      case 'stormy':
        return <Zap className="w-8 h-8 text-purple-500" />;
      default:
        return <Cloud className="w-8 h-8 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <div className="text-center">
          <Anchor className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-medium text-gray-900">Starting Companion Mode...</p>
          <p className="text-sm text-gray-600 mt-2">Getting ready for your fishing adventure!</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-blue-50">
        <Card className="p-6 max-w-md w-full">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Start Companion</h3>
            <p className="text-gray-600 mb-4">Please check your connection and try again.</p>
            <Button onClick={initializeCompanion}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Anchor className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-bold">Fishing Companion</h1>
              <p className="text-sm opacity-90">Trip in Progress</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium">{location?.name || 'Getting location...'}</p>
              <p className="text-xs opacity-75">
                {session.status === 'active' ? 'Fishing' : session.status}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="dashboard" className="text-sm">Dashboard</TabsTrigger>
            <TabsTrigger value="catches" className="text-sm">Catch Log</TabsTrigger>
            <TabsTrigger value="messages" className="text-sm relative">
              Messages
              {session.messages.filter(m => !m.read && m.senderType === 'captain').length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">1</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="weather" className="text-sm">Weather</TabsTrigger>
            <TabsTrigger value="gear" className="text-sm">Gear</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Quick Catch */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Fish className="w-5 h-5 mr-2 text-blue-600" />
                  Quick Catch Log
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
                    <Input
                      value={quickCatchData.species}
                      onChange={(e) => setQuickCatchData(prev => ({ ...prev, species: e.target.value }))}
                      placeholder="e.g., Red Snapper"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (lbs)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={quickCatchData.weight}
                      onChange={(e) => setQuickCatchData(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="e.g., 15.5"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleQuickCatch} className="flex-1">
                      <Fish className="w-4 h-4 mr-2" />
                      Log Catch
                    </Button>
                    <Button variant="outline" onClick={handlePhotoCapture}>
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Trip Stats */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Navigation className="w-5 h-5 mr-2 text-blue-600" />
                  Trip Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Time on Water</span>
                    <span className="font-medium">2h 15m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Catches</span>
                    <span className="font-medium">{session.catches.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Distance</span>
                    <span className="font-medium">12.5 nm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Messages</span>
                    <span className="font-medium">{session.messages.length}</span>
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Zap className="w-5 h-5 mr-2 text-blue-600" />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {getSupplyButtons().map((button) => (
                    <Button
                      key={button.type}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMessageInput(`Need ${button.label.toLowerCase()}`);
                        handleSendMessage('supply_request', button.type);
                      }}
                      className="flex items-center justify-center"
                    >
                      <button.icon className="w-4 h-4 mr-1" />
                      {button.label}
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="destructive" 
                  className="w-full mt-3"
                  onClick={() => showNotification('Emergency contact alerted', 'warning')}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Emergency
                </Button>
              </Card>
            </div>
          </TabsContent>

          {/* Catches Tab */}
          <TabsContent value="catches">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Today's Catches</h3>
              {session.catches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Fish className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No catches logged yet. Start fishing!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {session.catches.map((catch_) => (
                    <div key={catch_.id} className="flex items-center p-4 bg-white border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{catch_.species}</span>
                          <Badge variant="secondary">{catch_.weight}lb</Badge>
                          {catch_.verified && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(catch_.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {catch_.location.name}
                          </span>
                        </div>
                      </div>
                      {catch_.photo && (
                        <img 
                          src={catch_.photo} 
                          alt="Catch" 
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Captain Communication</h3>
              
              {/* Messages */}
              <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
                {session.messages.length === 0 ? (
                  <div className="text-center text-gray-500">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {session.messages.map((message) => (
                      <div 
                        key={message.id}
                        className={`flex ${message.senderType === 'client' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs px-4 py-2 rounded-lg ${
                          message.senderType === 'client' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white border'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-75 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex space-x-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                />
                <Button onClick={() => handleSendMessage()}>
                  Send
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Weather Tab */}
          <TabsContent value="weather">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Current Conditions</h3>
                <div className="text-center">
                  {getWeatherIcon('Partly Cloudy')}
                  <p className="text-2xl font-bold mt-2">75°F</p>
                  <p className="text-gray-600">Partly Cloudy</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="text-center">
                    <Wind className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-sm text-gray-600">Wind</p>
                    <p className="font-semibold">10 mph</p>
                  </div>
                  <div className="text-center">
                    <Waves className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-sm text-gray-600">Waves</p>
                    <p className="font-semibold">1-2 ft</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Marine Forecast</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-800">Good Conditions</p>
                      <p className="text-sm text-green-600">Expected to hold through afternoon</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium text-yellow-800">Wind Increase</p>
                      <p className="text-sm text-yellow-600">15 mph expected after 3 PM</p>
                    </div>
                    <Wind className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Gear Tab */}
          <TabsContent value="gear">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Gear Checklist</h3>
              <div className="space-y-2">
                {session.gearChecklist.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => {
                          // Toggle item checked state
                          item.checked = !item.checked;
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.category}</p>
                      </div>
                    </div>
                    {item.required && (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        Required
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
      />
    </div>
  );
}
