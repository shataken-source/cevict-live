import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ReferralEmailInviteProps {
  referralCode: string;
  userEmail: string;
}

export default function ReferralEmailInvite({ referralCode, userEmail }: ReferralEmailInviteProps) {
  const [emails, setEmails] = useState<string[]>(['']);
  const [message, setMessage] = useState('Join me on Gulf Coast Charters! Use my referral code to get $10 off your first booking.');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const addEmailField = () => setEmails([...emails, '']);
  const removeEmail = (index: number) => setEmails(emails.filter((_, i) => i !== index));
  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const sendInvites = async () => {
    const validEmails = emails.filter(e => e.includes('@'));
    if (validEmails.length === 0) {
      toast({ title: 'Please enter at least one valid email', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      await supabase.functions.invoke('referral-rewards', {
        body: { action: 'send_invites', userEmail, referralCode, friendEmails: validEmails, message }
      });
      
      toast({ title: `Invitations sent to ${validEmails.length} friends!`, description: 'Track their progress in your dashboard.' });
      setEmails(['']);
      setMessage('Join me on Gulf Coast Charters! Use my referral code to get $10 off your first booking.');
    } catch (error) {
      toast({ title: 'Failed to send invitations', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          Invite Friends via Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {emails.map((email, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => updateEmail(index, e.target.value)}
              />
              {emails.length > 1 && (
                <Button variant="outline" size="icon" onClick={() => removeEmail(index)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" onClick={addEmailField} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Add Another Email
          </Button>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Personal Message</label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Add a personal message..."
          />
        </div>

        <Button onClick={sendInvites} disabled={sending} className="w-full">
          {sending ? 'Sending...' : 'Send Invitations'}
        </Button>
      </CardContent>
    </Card>
  );
}
