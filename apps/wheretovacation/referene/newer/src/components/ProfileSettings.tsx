import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, MapPin, MessageSquare, CheckCircle, Shield, ShieldCheck, Clock, Fingerprint, Trash2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import SMSVerificationModal from './SMSVerificationModal';
import TwoFactorSetup from './TwoFactorSetup';
import PasskeyRegistration from './PasskeyRegistration';


export default function ProfileSettings() {
  const { toast } = useToast();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [checking2FA, setChecking2FA] = useState(true);
  const [authenticators, setAuthenticators] = useState<any[]>([]);
  const [loadingAuthenticators, setLoadingAuthenticators] = useState(false);
  const [showPasskeyRegistration, setShowPasskeyRegistration] = useState(false);
  
  // Session timeout preferences state
  const [sessionPreferences, setSessionPreferences] = useState({
    timeoutDuration: 1800, // 30 minutes default
    warningDuration: 120, // 2 minutes default
    autoExtend: false
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    phoneVerified: false,
    smsOptIn: false
  });


  useEffect(() => {
    check2FAStatus();
    loadSessionPreferences();
    loadAuthenticators();
  }, []);

  // Load registered authenticators
  const loadAuthenticators = async () => {
    if (!user?.id) return;
    
    setLoadingAuthenticators(true);
    try {
      const { data } = await supabase.functions.invoke('webauthn-manager', {
        body: { action: 'list', userId: user.id }
      });
      
      if (data?.success) {
        setAuthenticators(data.authenticators || []);
      }
    } catch (error) {
      console.error('Error loading authenticators:', error);
    } finally {
      setLoadingAuthenticators(false);
    }
  };

  // Delete authenticator
  const deleteAuthenticator = async (authenticatorId: string) => {
    if (!confirm('Remove this passkey? You will need to re-register to use it again.')) return;
    
    try {
      const { data } = await supabase.functions.invoke('webauthn-manager', {
        body: { action: 'delete', credentialId: authenticatorId }
      });
      
      if (data?.success) {
        toast({
          title: 'Passkey Removed',
          description: 'The passkey has been removed from your account'
        });
        loadAuthenticators();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove passkey',
        variant: 'destructive'
      });
    }
  };


  // Load session preferences from localStorage
  const loadSessionPreferences = () => {
    const stored = localStorage.getItem('sessionPreferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSessionPreferences(parsed);
      } catch (error) {
        console.error('Error loading session preferences:', error);
      }
    }
  };

  // Save session preferences to localStorage
  const saveSessionPreferences = async () => {
    try {
      localStorage.setItem('sessionPreferences', JSON.stringify(sessionPreferences));
      
      // Also save to backend via edge function
      await supabase.functions.invoke('session-manager', {
        body: { 
          action: 'save_preferences',
          preferences: sessionPreferences
        }
      });

      toast({
        title: 'Session Settings Saved',
        description: 'Your session timeout preferences have been updated.'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save session preferences',
        variant: 'destructive'
      });
    }
  };


  useEffect(() => {
    check2FAStatus();
  }, []);


  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        phoneVerified: user.phoneVerified || false,
        smsOptIn: user.smsOptIn || false
      });
    }
  }, [user]);

  const check2FAStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data } = await supabase.functions.invoke('two-factor-auth', {
        body: { action: 'status' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      setTwoFactorEnabled(data?.enabled || false);
    } catch (error) {
      console.error('Error checking 2FA status:', error);
    } finally {
      setChecking2FA(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('user-profile', {
        body: { 
          action: 'update',
          userId: user?.id,
          ...formData
        }
      });

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved successfully.'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerified = (phoneNumber: string, smsOptIn: boolean) => {
    setFormData({
      ...formData,
      phone: phoneNumber,
      phoneVerified: true,
      smsOptIn
    });
    toast({
      title: 'Phone Verified',
      description: 'Your phone number has been verified successfully.'
    });
  };

  const handleSMSOptInToggle = (checked: boolean) => {
    if (checked && !formData.phoneVerified) {
      setShowSMSModal(true);
    } else {
      setFormData({ ...formData, smsOptIn: checked });
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication?')) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke('two-factor-auth', {
        body: { action: 'disable' },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      
      setTwoFactorEnabled(false);
      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled.'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (show2FASetup) {
    return (
      <TwoFactorSetup
        onComplete={() => {
          setShow2FASetup(false);
          setTwoFactorEnabled(true);
        }}
        onCancel={() => setShow2FASetup(false)}
      />
    );
  }


  return (
    <>
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="name"
                className="pl-10"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                className="pl-10"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="phone"
                className="pl-10 pr-10"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={formData.phoneVerified}
              />
              {formData.phoneVerified && (
                <CheckCircle className="absolute right-3 top-3 w-4 h-4 text-green-500" />
              )}
            </div>
            {!formData.phoneVerified && formData.phone && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setShowSMSModal(true)}
              >
                Verify Phone Number
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="sms-notifications" className="text-base cursor-pointer">
                  SMS Booking Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive text message reminders 24 hours before your bookings
                </p>
              </div>
            </div>
            <Switch
              id="sms-notifications"
              checked={formData.smsOptIn}
              onCheckedChange={handleSMSOptInToggle}
              disabled={!formData.phoneVerified}
            />
          </div>


          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              {twoFactorEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <Label className="text-base">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  {twoFactorEnabled 
                    ? 'Extra security is enabled for your account' 
                    : 'Add an extra layer of security to your account'}
                </p>
              </div>
            </div>
            {twoFactorEnabled ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDisable2FA}
                disabled={loading}
              >
                Disable
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setShow2FASetup(true)}
              >
                Enable
              </Button>
            )}
          </div>

          {/* Session Timeout Settings Section */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-base">Session Timeout Settings</Label>
                  <p className="text-sm text-muted-foreground">
                    Configure automatic logout after inactivity
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="timeout-duration" className="text-sm">
                      Timeout Duration
                    </Label>
                    <Select
                      value={sessionPreferences.timeoutDuration.toString()}
                      onValueChange={(value) =>
                        setSessionPreferences({
                          ...sessionPreferences,
                          timeoutDuration: parseInt(value)
                        })
                      }
                    >
                      <SelectTrigger id="timeout-duration" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="300">5 minutes</SelectItem>
                        <SelectItem value="900">15 minutes</SelectItem>
                        <SelectItem value="1800">30 minutes</SelectItem>
                        <SelectItem value="3600">1 hour</SelectItem>
                        <SelectItem value="7200">2 hours</SelectItem>
                        <SelectItem value="14400">4 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="warning-duration" className="text-sm">
                      Warning Before Timeout
                    </Label>
                    <Select
                      value={sessionPreferences.warningDuration.toString()}
                      onValueChange={(value) =>
                        setSessionPreferences({
                          ...sessionPreferences,
                          warningDuration: parseInt(value)
                        })
                      }
                    >
                      <SelectTrigger id="warning-duration" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                        <SelectItem value="180">3 minutes</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-extend" className="text-sm">
                        Auto-extend on Activity
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically reset timer when you're active
                      </p>
                    </div>
                    <Switch
                      id="auto-extend"
                      checked={sessionPreferences.autoExtend}
                      onCheckedChange={(checked) =>
                        setSessionPreferences({
                          ...sessionPreferences,
                          autoExtend: checked
                        })
                      }
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={saveSessionPreferences}
                    className="w-full"
                  >
                    Save Session Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Biometric Authentication / Passkeys Section */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-start gap-3">
              <Fingerprint className="h-5 w-5 text-purple-500 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <Label className="text-base">Biometric Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Sign in with fingerprint, Face ID, or security keys
                  </p>
                </div>

                {showPasskeyRegistration ? (
                  <div className="space-y-3">
                    <PasskeyRegistration
                      userId={user?.id || ''}
                      onSuccess={() => {
                        setShowPasskeyRegistration(false);
                        loadAuthenticators();
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPasskeyRegistration(false)}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    {authenticators.length > 0 ? (
                      <div className="space-y-2">
                        {authenticators.map((auth) => (
                          <div
                            key={auth.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Fingerprint className="w-4 h-4 text-purple-500" />
                              <div>
                                <p className="text-sm font-medium">{auth.deviceName}</p>
                                <p className="text-xs text-muted-foreground">
                                  Added {new Date(auth.createdAt).toLocaleDateString()}
                                  {auth.lastUsedAt && ` • Last used ${new Date(auth.lastUsedAt).toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteAuthenticator(auth.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No passkeys registered yet
                      </p>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasskeyRegistration(true)}
                      className="w-full"
                    >
                      <Fingerprint className="w-4 h-4 mr-2" />
                      Add Passkey
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="location"
                className="pl-10"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>


          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </Card>

      <SMSVerificationModal
        isOpen={showSMSModal}
        onClose={() => setShowSMSModal(false)}
        userId={user?.id}
        onVerified={handlePhoneVerified}
      />
    </>
  );
}

