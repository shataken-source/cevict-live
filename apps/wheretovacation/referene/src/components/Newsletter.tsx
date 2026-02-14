import { useState } from 'react';
import { Send } from 'lucide-react';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Get Travel Inspiration</h2>
        <p className="text-xl text-blue-100 mb-8">Subscribe for exclusive deals and destination guides</p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="flex-1 px-6 py-4 rounded-full text-lg focus:outline-none focus:ring-4 focus:ring-white/50"
            required
          />
          <button
            type="submit"
            className="px-8 py-4 bg-white text-blue-600 rounded-full font-bold text-lg hover:bg-gray-100 transition inline-flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Subscribe
          </button>
        </form>
        {status === 'success' && (
          <p className="mt-4 text-white font-semibold">Thanks for subscribing!</p>
        )}
        {status === 'error' && (
          <p className="mt-4 text-red-200 font-semibold">Please enter a valid email</p>
        )}
      </div>
    </section>
  );
}
