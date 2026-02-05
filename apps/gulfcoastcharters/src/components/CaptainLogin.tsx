import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Mail, Lock, Eye, EyeOff, Anchor } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface CaptainLoginProps {
  onLoginSuccess: (email: string) => void;
}

export default function CaptainLogin({ onLoginSuccess }: CaptainLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Demo mode bypass for testing
    if (password === 'demo' || password === 'test') {
      setTimeout(() => {
        onLoginSuccess(email);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('captain-auth', {
        body: { action: 'login', email, password }
      });

      if (error) throw error;

      if (data.success) {
        onLoginSuccess(email);
      } else {
        setError('Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Try password "demo" for testing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-8 text-white">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-white/20 backdrop-blur-md rounded-full p-3">
            <Anchor className="w-10 h-10" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-center mb-2">Captain Portal</h2>
        <p className="text-blue-100 text-center">Manage your charters and bookings</p>
      </div>
      
      <div className="p-8">
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertDescription>
            <p className="font-semibold text-blue-900 mb-1">Demo Mode Available</p>
            <p className="text-gray-700 text-sm">Use password "demo" to test without authentication</p>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 h-12"
              placeholder="captain@example.com"
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-10 pr-10 h-12"
              placeholder="Enter 'demo' for testing"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-lg font-semibold"
          >
            {loading ? 'Logging in...' : 'Login to Dashboard'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <a href="#" className="text-sm text-blue-600 hover:underline">Forgot Password?</a>
        </div>
      </div>
    </div>
  );
}
