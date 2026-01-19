import { useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      localStorage.setItem('newsletter_email', email);
      setSubscribed(true);
      setTimeout(() => setSubscribed(false), 5000);
      setEmail('');
    }
  };

  return (
    <section className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <Mail className="w-16 h-16 mx-auto mb-4 opacity-90" />
          <h2 className="text-4xl font-bold mb-4">Get Exclusive Deals</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join 50,000+ travelers and receive insider tips, early access to deals, and travel inspiration
          </p>

          {!subscribed ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 h-14 text-lg px-6"
              />
              <Button type="submit" size="lg" className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-8 font-semibold">
                <Send className="w-5 h-5 mr-2" />
                Subscribe
              </Button>
            </form>
          ) : (
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 max-w-xl mx-auto">
              <p className="text-xl font-semibold">✓ Successfully subscribed!</p>
              <p className="text-blue-100 mt-2">Check your inbox for your welcome gift</p>
            </div>
          )}

          <p className="text-sm text-blue-100 mt-4">
            No spam, ever. Unsubscribe anytime with one click.
          </p>
        </div>
      </div>
    </section>
  );
}
