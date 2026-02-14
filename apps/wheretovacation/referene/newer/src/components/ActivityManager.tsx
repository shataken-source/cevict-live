import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { X, Plus, Check } from 'lucide-react';

const AVAILABLE_ACTIVITIES = [
  'Hiking', 'Scuba Diving', 'Snorkeling', 'Surfing', 'Kayaking',
  'Mountain Biking', 'Rock Climbing', 'Skiing', 'Snowboarding',
  'Beach Activities', 'City Tours', 'Food Tours', 'Wine Tasting',
  'Photography', 'Wildlife Safari', 'Camping', 'Fishing',
  'Yoga Retreats', 'Spa & Wellness', 'Shopping', 'Nightlife',
  'Museums', 'Historical Sites', 'Adventure Sports', 'Water Sports'
];

interface ActivityManagerProps {
  userId: string;
  userEmail: string;
  onActivitiesChange?: (activities: string[]) => void;
}

export default function ActivityManager({ userId, userEmail, onActivitiesChange }: ActivityManagerProps) {
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`activities_${userId}`);
    if (saved) setSelectedActivities(JSON.parse(saved));
  }, [userId]);

  const toggleActivity = (activity: string) => {
    const updated = selectedActivities.includes(activity)
      ? selectedActivities.filter(a => a !== activity)
      : [...selectedActivities, activity];
    
    setSelectedActivities(updated);
    localStorage.setItem(`activities_${userId}`, JSON.stringify(updated));
    onActivitiesChange?.(updated);
  };

  const displayedActivities = showAll ? AVAILABLE_ACTIVITIES : AVAILABLE_ACTIVITIES.slice(0, 12);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg mb-2">My Activity Interests</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select activities you enjoy to connect with like-minded travelers
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {displayedActivities.map(activity => {
          const isSelected = selectedActivities.includes(activity);
          return (
            <Badge
              key={activity}
              variant={isSelected ? "default" : "outline"}
              className="cursor-pointer px-3 py-2 text-sm"
              onClick={() => toggleActivity(activity)}
            >
              {isSelected && <Check className="w-3 h-3 mr-1" />}
              {activity}
            </Badge>
          );
        })}
      </div>

      {!showAll && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Show More Activities
        </Button>
      )}

      {selectedActivities.length > 0 && (
        <div className="pt-4 border-t">
          <p className="text-sm font-medium text-gray-700">
            Selected: {selectedActivities.length} activities
          </p>
        </div>
      )}
    </div>
  );
}
