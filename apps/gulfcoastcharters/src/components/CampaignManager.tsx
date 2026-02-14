import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, Send, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function CampaignManager() {
  const [campaignType, setCampaignType] = useState<'email' | 'sms'>('email');
  const [template, setTemplate] = useState('promotional');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const emailTemplates = [
    { value: 'welcome', label: 'Welcome Email' },
    { value: 'promotional', label: 'Promotional Offer' },
    { value: 'abandoned_cart', label: 'Abandoned Cart' },
    { value: 'booking_reminder', label: 'Booking Reminder' },
    { value: 'seasonal', label: 'Seasonal Campaign' }
  ];

  const smsTemplates = [
    { value: 'booking_reminder', label: 'Booking Reminder' },
    { value: 'last_minute_deal', label: 'Last Minute Deal' },
    { value: 'weather_alert', label: 'Weather Alert' },
    { value: 'catch_milestone', label: 'Catch Milestone' },
    { value: 'review_request', label: 'Review Request' }
  ];

  const audiences = [
    { value: 'all', label: 'All Users' },
    { value: 'customers', label: 'Customers Only' },
    { value: 'captains', label: 'Captains Only' },
    { value: 'premium', label: 'Premium Members' },
    { value: 'inactive', label: 'Inactive Users (30+ days)' }
  ];

  const sendCampaign = async () => {
    setLoading(true);
    try {
      if (campaignType === 'email') {
        const { data, error } = await supabase.functions.invoke('email-campaign-sender', {
          body: {
            campaignType: template,
            audience,
            recipients: [],
            templateData: { headline: subject, message }
          }
        });
        if (error) throw error;
        toast({ title: 'Campaign Sent!', description: `Email campaign sent to ${audience} audience` });
      } else {
        const { data, error } = await supabase.functions.invoke('sms-campaign-manager', {
          body: {
            template,
            audience,
            customMessage: message
          }
        });
        if (error) throw error;
        toast({ title: 'Campaign Sent!', description: `SMS campaign sent to ${audience} audience` });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send campaign', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant={campaignType === 'email' ? 'default' : 'outline'}
              onClick={() => setCampaignType('email')}
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Campaign
            </Button>
            <Button
              variant={campaignType === 'sms' ? 'default' : 'outline'}
              onClick={() => setCampaignType('sms')}
              className="flex-1"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS Campaign
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Template</label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(campaignType === 'email' ? emailTemplates : smsTemplates).map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Audience</label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {audiences.map(a => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {campaignType === 'email' && (
            <div>
              <label className="block text-sm font-medium mb-2">Subject Line</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={campaignType === 'email' ? 'Email body...' : 'SMS message (160 chars max)...'}
              rows={campaignType === 'email' ? 6 : 3}
              maxLength={campaignType === 'sms' ? 160 : undefined}
            />
            {campaignType === 'sms' && (
              <p className="text-sm text-gray-500 mt-1">{message.length}/160 characters</p>
            )}
          </div>

          <Button onClick={sendCampaign} disabled={loading} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            {loading ? 'Sending...' : 'Send Campaign'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
