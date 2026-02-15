'use client';

import { useState } from 'react';
import { Mail, Smartphone, Check, AlertCircle, Loader2, Send } from 'lucide-react';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    try {
      const endpoint = activeTab === 'email' ? '/api/subscribe/email' : '/api/subscribe/sms';
      const payload = activeTab === 'email' 
        ? { email, name } 
        : { phone, name };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
        setEmail('');
        setPhone('');
        setName('');
      } else {
        setResult({ success: false, message: data.error || 'Something went wrong' });
      }
    } catch (err) {
      setResult({ success: false, message: 'Failed to subscribe. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  return (
    <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 rounded-2xl p-6 border border-emerald-700/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-600/20 rounded-lg">
          <Send className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Stay in the Loop</h3>
          <p className="text-sm text-slate-400">Get camping tips, weather alerts & gear recommendations</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'email'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
        <button
          onClick={() => setActiveTab('sms')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'sms'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          SMS
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Name (optional) */}
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Email or Phone */}
        {activeTab === 'email' ? (
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        ) : (
          <div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(555) 123-4567"
              maxLength={14}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || (activeTab === 'email' ? !email : !phone)}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Subscribing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Subscribe
            </>
          )}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div
          className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
            result.success
              ? 'bg-emerald-900/30 border border-emerald-700/30'
              : 'bg-red-900/30 border border-red-700/30'
          }`}
        >
          {result.success ? (
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          )}
          <p className={`text-sm ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
            {result.message}
          </p>
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-4 text-xs text-slate-500 text-center">
        We respect your privacy. Unsubscribe anytime. SMS rates may apply.
      </p>
    </div>
  );
}
