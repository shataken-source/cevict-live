'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Building2, Mail, Lock, Loader2 } from 'lucide-react';

export default function ShelterLoginPage() {
  const router = useRouter();
  
  // State for Supabase client (initialized asynchronously)
  const [supabase, setSupabase] = useState<any>(null);

  // Initialize Supabase client only in browser
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    import('@supabase/supabase-js').then(({ createClient }) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
        setSupabase(createClient(supabaseUrl, supabaseAnonKey));
      }
    }).catch((error) => {
      console.error('Error loading Supabase:', error);
    });
  }, []);

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    shelter_name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!supabase) {
      setError('Database not configured');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Login
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        // Get shelter info
        const { data: shelter } = await supabase
          .from('shelters')
          .select('*')
          .eq('email', formData.email)
          .single();

        if (shelter) {
          // Store in localStorage
          localStorage.setItem('shelter_id', shelter.id);
          localStorage.setItem('shelter_name', shelter.shelter_name);
          router.push('/petreunion/shelter/dashboard');
        } else {
          throw new Error('Shelter account not found');
        }
      } else {
        // Register new shelter
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        // Create shelter record
        const { data: shelter, error: shelterError } = await supabase
          .from('shelters')
          .insert([{
            shelter_name: formData.shelter_name,
            email: formData.email,
            phone: formData.phone || null,
            address: formData.address || null,
            created_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (shelterError) {
          // If table doesn't exist, use localStorage (mock mode)
          if (shelterError.code === '42P01') {
            localStorage.setItem('shelter_id', `mock-${Date.now()}`);
            localStorage.setItem('shelter_name', formData.shelter_name);
            localStorage.setItem('shelter_email', formData.email);
            router.push('/petreunion/shelter/dashboard');
            return;
          }
          throw shelterError;
        }

        localStorage.setItem('shelter_id', shelter.id);
        localStorage.setItem('shelter_name', shelter.shelter_name);
        router.push('/petreunion/shelter/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center py-8 px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isLogin ? 'Shelter Login' : 'Register Shelter'}
          </CardTitle>
          <CardDescription>
            {isLogin 
              ? 'Access your shelter dashboard' 
              : 'Create a new shelter account'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="shelter_name">Shelter Name *</Label>
                  <Input
                    id="shelter_name"
                    type="text"
                    required
                    value={formData.shelter_name}
                    onChange={(e) => setFormData({ ...formData, shelter_name: e.target.value })}
                    placeholder="ABC Animal Shelter"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St, City, State"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="shelter@example.com"
              />
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isLogin ? 'Logging in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Login' : 'Register Shelter'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                {isLogin 
                  ? "Don't have an account? Register" 
                  : 'Already have an account? Login'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

