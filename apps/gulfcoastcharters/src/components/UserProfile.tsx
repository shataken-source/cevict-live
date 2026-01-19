import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from './ui/button';
import { X, Heart, Star, Users, Settings } from 'lucide-react';
import ActivityManager from './ActivityManager';
import TravelBuddies from './TravelBuddies';
import ProfileSettings from './ProfileSettings';
import { supabase } from '@/lib/supabase';

interface UserProfileProps {
  onClose: () => void;
}

export default function UserProfile({ onClose }: UserProfileProps) {
  const { user, logout } = useUser();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [userActivities, setUserActivities] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'activities' | 'buddies' | 'settings'>('profile');


  useEffect(() => {
    const savedFavorites = localStorage.getItem(`favorites_${user?.id}`);
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    
    const savedReviews = localStorage.getItem(`reviews_${user?.id}`);
    if (savedReviews) setReviews(JSON.parse(savedReviews));

    const savedActivities = localStorage.getItem(`activities_${user?.id}`);
    if (savedActivities) setUserActivities(JSON.parse(savedActivities));
  }, [user]);

  const handleActivitiesChange = async (activities: string[]) => {
    setUserActivities(activities);
    
    // Sync with backend
    try {
      await supabase.functions.invoke('activity-matcher', {
        body: { 
          action: 'save', 
          userId: user?.id, 
          userEmail: user?.email,
          activities 
        }
      });
    } catch (error) {
      console.error('Error syncing activities:', error);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full p-6 relative max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4">
          <X className="w-5 h-5" />
        </button>
        
        {/* Profile Header with Picture */}
        <div className="flex items-center gap-4 mb-6">
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt={user.name} className="w-20 h-20 rounded-full object-cover border-4 border-blue-100" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{user?.name}</h2>
            <p className="text-gray-600">{user?.email}</p>
            {user?.provider && (
              <p className="text-sm text-blue-600 mt-1">Connected via {user.provider}</p>
            )}
          </div>
        </div>


        {/* Tabs */}
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'profile' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium flex items-center whitespace-nowrap ${activeTab === 'settings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <Settings className="w-4 h-4 mr-1" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === 'activities' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Activities
          </button>
          <button
            onClick={() => setActiveTab('buddies')}
            className={`px-4 py-2 font-medium flex items-center whitespace-nowrap ${activeTab === 'buddies' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            <Users className="w-4 h-4 mr-1" />
            Travel Buddies
          </button>
        </div>


        {activeTab === 'profile' && (
          <>
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-red-500" />
                Favorites ({favorites.length})
              </h3>
              {favorites.length === 0 ? (
                <p className="text-gray-500">No favorites yet</p>
              ) : (
                <div className="space-y-2">
                  {favorites.map((fav, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">{fav}</div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                My Reviews ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <p className="text-gray-500">No reviews yet</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold">{review.title}</p>
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <ProfileSettings />
        )}

        {activeTab === 'activities' && user && (
          <ActivityManager 
            userId={user.id} 
            userEmail={user.email}
            onActivitiesChange={handleActivitiesChange}
          />
        )}

        {activeTab === 'buddies' && user && (
          <TravelBuddies 
            userId={user.id}
            userActivities={userActivities}
          />
        )}

        <Button onClick={handleLogout} variant="destructive" className="w-full mt-6">
          Logout
        </Button>
      </div>
    </div>
  );
}

