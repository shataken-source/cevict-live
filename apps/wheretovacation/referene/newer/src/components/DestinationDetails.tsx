import { useState } from 'react';
import { X, MapPin, Calendar, DollarSign, Star, Mail, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Destination } from '../data/mockDestinations';
import WeatherWidget from './WeatherWidget';

interface DestinationDetailsProps {
  destination: Destination;
  onClose: () => void;
  onBook: () => void;
  onActivityClick?: (activity: string) => void;
}

export function DestinationDetails({ destination, onClose, onBook, onActivityClick }: DestinationDetailsProps) {
  const [showContact, setShowContact] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Message sent to ${destination.name}! They will contact you at ${formData.email}`);
    setShowContact(false);
    setFormData({ name: '', email: '', message: '' });
  };

  const handleActivityClick = (activity: string) => {
    if (onActivityClick) {
      onActivityClick(activity);
      onClose();
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-5xl w-full my-8">
        <div className="relative h-64">
          <img src={destination.image} alt={destination.name} className="w-full h-full object-cover rounded-t-xl" />
          <button onClick={onClose} className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold mb-2">{destination.name}</h2>
              <div className="flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-2" />
                {destination.country}, {destination.region}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center mb-1">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mr-1" />
                <span className="text-xl font-bold">{destination.rating}</span>
              </div>
              <p className="text-sm text-gray-600">{destination.reviews} reviews</p>
            </div>
          </div>

          <p className="text-gray-700 mb-6">{destination.description}</p>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-3 text-blue-600" />
                <div>
                  <p className="font-semibold">Best Time</p>
                  <p className="text-sm text-gray-600">{destination.bestTime}</p>
                </div>
              </div>
              <div className="flex items-center">
                <DollarSign className="w-5 h-5 mr-3 text-green-600" />
                <div>
                  <p className="font-semibold">Avg Cost</p>
                  <p className="text-sm text-gray-600">${destination.avgCost}/person</p>
                </div>
              </div>
              <div>
                <p className="font-semibold mb-2">Activities (Click to filter)</p>
                <div className="flex flex-wrap gap-2">
                  {destination.activities.map(activity => (
                    <Badge 
                      key={activity} 
                      className="cursor-pointer hover:bg-purple-600 hover:text-white transition-colors"
                      onClick={() => handleActivityClick(activity)}
                    >
                      {activity}
                    </Badge>
                  ))}
                </div>
              </div>

            </div>

            <div>
              <WeatherWidget 
                latitude={destination.latitude} 
                longitude={destination.longitude} 
                location={destination.name} 
              />
            </div>
          </div>

          {!showContact ? (
            <div className="flex gap-3">
              <Button onClick={onBook} size="lg" className="flex-1">Book Now</Button>
              <Button onClick={() => setShowContact(true)} size="lg" variant="outline" className="flex-1">
                <Mail className="w-4 h-4 mr-2" />
                Contact
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3">Send Inquiry</h3>
              {destination.contactEmail && (
                <p className="text-sm text-gray-600 mb-3">
                  Email: <a href={`mailto:${destination.contactEmail}`} className="text-blue-600 hover:underline">
                    {destination.contactEmail}
                  </a>
                </p>
              )}
              <form onSubmit={handleContactSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <textarea
                  placeholder="Your message..."
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="flex-1">
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                  <Button type="button" onClick={() => setShowContact(false)} size="sm" variant="outline">
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
