/**
 * User Settings Page
 * 
 * Route: /settings
 * Displays user settings and preferences
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Label } from '../src/components/ui/label';
import { Switch } from '../src/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import { 
  User, Mail, Phone, MapPin, Bell, Shield, 
  CreditCard, Globe, Moon, Sun 
} from 'lucide-react';
import { supabase } from '../src/lib/supabase';
import { toast } from 'sonner';
import PhoneVerification from '../src/components/PhoneVerification';
import SMSPreferences from '../src/components/SMSPreferences';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: false,
    darkMode: false,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          router.push('/admin/login?redirect=/settings');
          return;
        }

        setUser(session.user);

        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profileError && profileData) {
          setProfile(profileData);
          setFormData({
            name: profileData.full_name || '',
            email: session.user.email || '',
            phone: profileData.phone || '',
            location: profileData.location || '',
          });
        } else {
          setFormData({
            name: session.user.user_metadata?.full_name || '',
            email: session.user.email || '',
            phone: '',
            location: '',
          });
        }

        // Load preferences (could be from a separate table)
        // For now, using defaults

      } catch (error: any) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [router]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.name,
          phone: formData.phone,
          location: formData.location,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        throw profileError;
      }

      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout session={null}>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Enter your location"
                  />
                </div>

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive email updates about your bookings</p>
                  </div>
                  <Switch
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked: boolean) => 
                      setPreferences({ ...preferences, emailNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-gray-500">Receive promotional emails and offers</p>
                  </div>
                  <Switch
                    checked={preferences.marketingEmails}
                    onCheckedChange={(checked: boolean) => 
                      setPreferences({ ...preferences, marketingEmails: checked })
                    }
                  />
                </div>

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </CardContent>
            </Card>

            {/* Phone Verification & SMS Reminders */}
            {user && (
              <>
                <PhoneVerification
                  userId={user.id}
                  currentPhone={profile?.phone_number || formData.phone}
                  phoneVerified={profile?.phone_verified || false}
                  smsOptIn={profile?.sms_opt_in || false}
                  onVerified={async () => {
                    // Reload profile after verification
                    const { data: profileData } = await supabase
                      .from('profiles')
                      .select('*')
                      .eq('id', user.id)
                      .single();
                    if (profileData) {
                      setProfile(profileData);
                      setFormData({
                        ...formData,
                        phone: profileData.phone_number || '',
                      });
                    }
                  }}
                  onOptInChange={async () => {
                    // Reload profile after opt-in change
                    const { data: profileData } = await supabase
                      .from('profiles')
                      .select('*')
                      .eq('id', user.id)
                      .single();
                    if (profileData) {
                      setProfile(profileData);
                    }
                  }}
                />
                <SMSPreferences userId={user.id} />
              </>
            )}
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Change Password</Label>
                  <p className="text-sm text-gray-500 mb-2">Update your account password</p>
                  <Button variant="outline">Change Password</Button>
                </div>

                <div className="pt-4 border-t">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500 mb-2">Add an extra layer of security</p>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-gray-500">Switch to dark theme</p>
                  </div>
                  <Switch
                    checked={preferences.darkMode}
                    onCheckedChange={(checked: boolean) => 
                      setPreferences({ ...preferences, darkMode: checked })
                    }
                  />
                </div>

                <div className="pt-4 border-t">
                  <Label>Language</Label>
                  <p className="text-sm text-gray-500 mb-2">Select your preferred language</p>
                  <select className="w-full px-3 py-2 border rounded-md">
                    <option>English</option>
                    <option>Spanish</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
