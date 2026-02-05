import { useState, useEffect } from 'react';
import { X, Mail, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ExitIntentModalProps {
  onClose: () => void;
}

export default function ExitIntentModal({ onClose }: ExitIntentModalProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Save to localStorage or send to backend
      localStorage.setItem('newsletter_subscribed', 'true');
      localStorage.setItem('discount_code', 'FIRST10');
      setSubmitted(true);
      setTimeout(() => onClose(), 3000);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {!submitted ? (
          <>
            <div className="text-center mb-6">
              <Gift className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h2 id="exit-modal-title" className="text-3xl font-bold mb-2">Wait! Don't Miss Out</h2>
              <p className="text-gray-600">Get 10% off your first charter booking!</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-center"
                  aria-label="Email address"
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-lg py-6">
                <Mail className="w-5 h-5 mr-2" />
                Get My 10% Discount
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Join 50,000+ travelers. Unsubscribe anytime. We respect your privacy.
              </p>
            </form>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-2">You're In!</h3>
            <p className="text-gray-600 mb-4">Check your email for code: <strong>FIRST10</strong></p>
          </div>
        )}
      </div>
    </div>
  );
}

