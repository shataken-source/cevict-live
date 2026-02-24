import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const FEATURE_FLAGS = {
  pages: [
    { key: 'promotions_page', name: 'Promotions & Leaderboards', description: 'Show promotions page with leaderboards' },
    { key: 'captain_directory', name: 'Captain Directory', description: 'Show captain profiles directory' },
    { key: 'marine_gear_shop', name: 'Marine Gear Shop', description: 'Show affiliate marine products shop' }
  ],
  homepage: [
    { key: 'hero_section', name: 'Hero Section', description: 'Show main hero section' },
    { key: 'featured_charters', name: 'Featured Charters', description: 'Show featured charters section' },
    { key: 'destinations', name: 'Destinations', description: 'Show destinations section' },
    { key: 'testimonials', name: 'Testimonials', description: 'Show customer testimonials' },
    { key: 'blog_section', name: 'Blog Section', description: 'Show blog posts section' }
  ],
  features: [
    { key: 'weather_widget', name: 'Weather Widget', description: 'Show weather information' },
    { key: 'tide_chart', name: 'Tide Chart', description: 'Show tide information' },
    { key: 'fishing_reports', name: 'Fishing Reports', description: 'Show fishing reports' },
    { key: 'booking_system', name: 'Booking System', description: 'Enable booking functionality' }
  ],
  community: [
    { key: 'message_board', name: 'Message Board', description: 'Show community message board' },
    { key: 'photo_contests', name: 'Photo Contests', description: 'Show photo contest features' },
    { key: 'events_calendar', name: 'Events Calendar', description: 'Show community events' }
  ],
  marketing: [
    { key: 'newsletter_signup', name: 'Newsletter Signup', description: 'Show newsletter signup forms' },
    { key: 'referral_program', name: 'Referral Program', description: 'Enable referral rewards' },
    { key: 'loyalty_rewards', name: 'Loyalty Rewards', description: 'Enable loyalty points system' }
  ],
  monetization: [
    { key: 'ads_banners', name: 'Advertisement Banners', description: 'Show ad spots and banners' },
    { key: 'affiliate_links', name: 'Affiliate Links', description: 'Enable affiliate product links' }
  ]
};

export default function FeatureFlagManager() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = () => {
    const saved = localStorage.getItem('feature_flags');
    if (saved) {
      setFlags(JSON.parse(saved));
    } else {
      const defaultFlags: Record<string, boolean> = {};
      Object.values(FEATURE_FLAGS).flat().forEach(f => {
        defaultFlags[f.key] = true;
      });
      setFlags(defaultFlags);
    }
  };

  const toggleFlag = (key: string) => {
    const newFlags = { ...flags, [key]: !flags[key] };
    setFlags(newFlags);
    localStorage.setItem('feature_flags', JSON.stringify(newFlags));
    toast.success(`Feature ${!flags[key] ? 'enabled' : 'disabled'}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feature Flags Manager</CardTitle>
        <p className="text-sm text-gray-600">Control which sections are visible on the website</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pages">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="homepage">Homepage</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="monetization">Revenue</TabsTrigger>
          </TabsList>
          {Object.entries(FEATURE_FLAGS).map(([category, features]) => (
            <TabsContent key={category} value={category} className="space-y-4">
              {features.map(feature => (
                <div key={feature.key} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <Label htmlFor={feature.key} className="font-semibold">{feature.name}</Label>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                  <Switch
                    id={feature.key}
                    checked={flags[feature.key] !== false}
                    onCheckedChange={() => toggleFlag(feature.key)}
                  />
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
