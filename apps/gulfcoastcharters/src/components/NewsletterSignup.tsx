import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Mail, Phone, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function NewsletterSignup() {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    emailEnabled: true,
    smsEnabled: false
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email && !formData.phone) {
      toast.error('Please provide at least email or phone number');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mailing-list-manager', {
        body: {
          action: 'subscribe',
          data: formData
        }
      });

      if (error) throw error;

      if (data.success) {
        setSuccess(true);
        toast.success('Successfully subscribed to our mailing list!');
        setFormData({
          email: '',
          phone: '',
          firstName: '',
          lastName: '',
          emailEnabled: true,
          smsEnabled: false
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 py-16">
        <div className="container mx-auto px-4">
          <Card className="p-12 text-center max-w-2xl mx-auto">
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h3 className="text-3xl font-bold mb-4">You're All Set!</h3>
            <p className="text-lg text-gray-600">
              Thank you for subscribing. You'll receive updates based on your preferences.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 py-16">
      <div className="container mx-auto px-4">
        <Card className="p-8 max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h3 className="text-3xl font-bold mb-3">Stay Updated</h3>
            <p className="text-lg text-gray-600">
              Get the latest charter deals, captain tips, and boating news delivered to you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="John"
                  className="h-12"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Doe"
                  className="h-12"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-4 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  className="pl-12 h-12"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-4 h-5 w-5 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="pl-12 h-12"
                />
              </div>
            </div>

            <div className="space-y-3 pt-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="emailEnabled"
                  checked={formData.emailEnabled}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, emailEnabled: checked as boolean })
                  }
                />
                <Label htmlFor="emailEnabled" className="cursor-pointer text-base">
                  Receive email updates
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="smsEnabled"
                  checked={formData.smsEnabled}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, smsEnabled: checked as boolean })
                  }
                />
                <Label htmlFor="smsEnabled" className="cursor-pointer text-base">
                  Receive SMS updates (standard rates apply)
                </Label>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700" disabled={loading}>
              {loading ? 'Subscribing...' : 'Subscribe Now'}
            </Button>

            <p className="text-sm text-gray-500 text-center">
              We respect your privacy. Unsubscribe anytime.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}

