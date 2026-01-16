'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });

  // Get env vars - these are available at build time in Next.js
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Create Supabase client only if env vars are available
  const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

  const handleOAuth = async (provider: 'google' | 'apple' | 'github' | 'facebook') => {
    if (!supabase) {
      setError('Supabase is not configured. Please check your environment variables.');
      return;
    }

    setOauthLoading(provider);
    setError(null);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/')}`;

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (oauthError) {
        // Check if it's a configuration error
        if (oauthError.message?.includes('not configured') || oauthError.message?.includes('disabled')) {
          throw new Error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not enabled in Supabase. Please enable it in your Supabase dashboard under Authentication > Providers.`);
        }
        throw oauthError;
      }

      // OAuth redirects automatically if data.url is present
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setOauthLoading(null);
      setError(err?.message || `Failed to sign in with ${provider}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      setError('Supabase is not configured. Please check your environment variables.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;

      if (data?.user) {
        // Check if email confirmation is required
        if (data.user.confirmed_at) {
          router.push('/');
          router.refresh();
        } else {
          setError('Please check your email to confirm your account');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-10 px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
          <CardDescription>Create an account to save and track reports.</CardDescription>
        </CardHeader>
        <CardContent>
          {!supabase && (
            <Alert className="border-yellow-200 bg-yellow-50 mb-6">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 text-sm">
                Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.
              </AlertDescription>
            </Alert>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading || !supabase}
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {oauthLoading === 'google' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <span className="text-xl">🔵</span>
                  Sign up with Google
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={() => handleOAuth('apple')}
              disabled={!!oauthLoading || !supabase}
              className="w-full h-12 bg-black hover:bg-gray-900 text-white border-2 border-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {oauthLoading === 'apple' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <span className="text-xl">⚫</span>
                  Sign up with Apple
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={!!oauthLoading || !supabase}
              className="w-full h-12 bg-gray-900 hover:bg-gray-800 text-white border-2 border-gray-900 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {oauthLoading === 'github' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <span className="text-xl">🐙</span>
                  Sign up with GitHub
                </>
              )}
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading || !!oauthLoading || !supabase} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account with Email'
              )}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Login
              </Link>
            </div>

            <div className="text-center text-sm text-gray-600">
              Are you a shelter?{' '}
              <Link href="/shelter/login" className="text-blue-600 hover:underline">
                Register/Login as Shelter
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
