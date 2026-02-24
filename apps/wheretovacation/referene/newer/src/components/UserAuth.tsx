import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import TwoFactorVerification from './TwoFactorVerification';
import PasskeyAuthentication from './PasskeyAuthentication';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { ResetPasswordForm } from './ResetPasswordForm';



interface UserAuthProps {
  onClose: () => void;
  message?: string;
}


export default function UserAuth({ onClose, message }: UserAuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [showPasskeyAuth, setShowPasskeyAuth] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const { login } = useUser();




  // Get message from sessionStorage if not provided as prop
  const authMessage = message || sessionStorage.getItem('authMessage') || '';


  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const user = session.user;
        const provider = user.app_metadata?.provider;
        
        // If OAuth login, sync profile data
        if (provider && provider !== 'email') {
          try {
            const { data: syncData } = await supabase.functions.invoke('oauth-profile-sync', {
              body: {
                userId: user.id,
                provider: provider,
                metadata: user.user_metadata
              }
            });

            if (syncData?.success) {
              const userData = {
                id: user.id,
                email: user.email || '',
                name: syncData.profileData?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
                profilePicture: syncData.profileData?.profile_picture || user.user_metadata?.avatar_url || user.user_metadata?.picture,
                provider: provider
              };
              login(userData);
              setSuccess('Login successful!');
              setTimeout(() => onClose(), 1000);
            }
          } catch (err) {
            console.error('OAuth sync error:', err);
            // Fallback to basic user data
            const userData = {
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
              profilePicture: user.user_metadata?.avatar_url || user.user_metadata?.picture,
              provider: provider
            };
            login(userData);
            setSuccess('Login successful!');
            setTimeout(() => onClose(), 1000);
          }
        } else {
          // Email/password login
          const userData = {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
            profilePicture: user.user_metadata?.avatar_url,
            provider: 'email'
          };
          login(userData);
          setSuccess('Login successful!');
          setTimeout(() => onClose(), 1000);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [login, onClose]);


  const handleOAuthLogin = async (provider: 'google' | 'facebook' | 'twitter' | 'github' | 'apple' | 'azure' | 'discord') => {
    setLoading(true);
    setError('');
    
    try {
      // Initiating OAuth login
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        throw error;
      }
      
      // OAuth redirect initiated successfully
      // Don't set loading to false here - user is being redirected
      
      // Don't set loading to false here - user is being redirected
      
    } catch (err: any) {
      console.error(`${provider} OAuth error:`, err);
      setError(err.message || `Failed to login with ${provider}. Please check your browser console and ensure OAuth is configured in Supabase.`);
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // For login, check if password provided
        if (!password) {
          setError('Please enter a password or use a magic link/social login above');
          setLoading(false);
          return;
        }
        
        // Authenticate with credentials
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        // Check if user has 2FA enabled
        const { data: twoFAData } = await supabase.functions.invoke('two-factor-auth', {
          body: { action: 'status' },
          headers: { Authorization: `Bearer ${authData.session?.access_token}` }
        });

        if (twoFAData?.enabled) {
          // 2FA is enabled, show verification modal
          setPendingUser(authData.user);
          setShow2FA(true);
          setLoading(false);
          return;
        }

        // No 2FA, complete login
        const userData = {
          id: authData.user.id,
          email: authData.user.email || '',
          name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || '',
          profilePicture: authData.user.user_metadata?.avatar_url,
          provider: 'email'
        };
        login(userData);
        setSuccess('Login successful!');
        setTimeout(() => onClose(), 1000);
      } else {
        // Signup flow with avatar creation
        const { data, error } = await supabase.functions.invoke('user-auth', {
          body: { action: 'signup', email, password, name }
        });

        if (error) {
          setError(error.message || 'Unable to connect');
          return;
        }

        if (data?.success) {
          // Create default avatar for new user
          try {
            await supabase.from('user_avatars').insert({
              user_id: data.user.id,
              sex: 'male',
              skin_color: '#f5d0a9',
              hair_style: 'short',
              hair_color: '#4a3728'
            });

            // Award welcome points
            await supabase.from('profiles').update({ 
              points: 15 
            }).eq('id', data.user.id);

            await supabase.from('avatar_analytics').insert({
              event_type: 'avatar_created',
              user_id: data.user.id,
              metadata: { signup_date: new Date().toISOString() }
            });
          } catch (avatarError) {
            console.error('Avatar creation error:', avatarError);
            // Don't fail signup if avatar creation fails
          }

          login(data.user);
          setSuccess('Account created! Welcome bonus: 15 points');
          setTimeout(() => onClose(), 1500);
        } else {
          setError(data?.error || 'Authentication failed');
        }
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handle2FAVerified = () => {
    if (pendingUser) {
      const userData = {
        id: pendingUser.id,
        email: pendingUser.email || '',
        name: pendingUser.user_metadata?.full_name || pendingUser.user_metadata?.name || pendingUser.email?.split('@')[0] || '',
        profilePicture: pendingUser.user_metadata?.avatar_url,
        provider: 'email'
      };
      login(userData);
      setSuccess('Login successful!');
      setShow2FA(false);
      setTimeout(() => onClose(), 1000);
    }
  };

  const handlePasskeySuccess = async (userId: string) => {
    try {
      // Get user data from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const userData = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
          profilePicture: user.user_metadata?.avatar_url,
          provider: 'passkey'
        };
        login(userData);
        setSuccess('Login successful!');
        setTimeout(() => onClose(), 1000);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to complete passkey login');
    }
  };


  // If showing 2FA verification, render that instead
  if (show2FA) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <TwoFactorVerification
          onVerified={handle2FAVerified}
          onCancel={() => {
            setShow2FA(false);
            setPendingUser(null);
            supabase.auth.signOut();
          }}
        />
      </div>
    );
  }

  // If showing passkey authentication, render that instead
  if (showPasskeyAuth) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white relative">
            <button onClick={onClose} className="absolute top-4 right-4 hover:bg-white/20 rounded-full p-1 transition">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold mb-2">Biometric Login</h2>
            <p className="text-purple-100">
              Use your fingerprint, Face ID, or security key
            </p>
          </div>
          <div className="p-8">
            <PasskeyAuthentication
              onSuccess={handlePasskeySuccess}
              onCancel={() => setShowPasskeyAuth(false)}
            />
          </div>
        </div>
      </div>
    );
  }


  return (
    <>

      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white relative">
            <button onClick={onClose} className="absolute top-4 right-4 hover:bg-white/20 rounded-full p-1 transition">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-blue-100">
              {authMessage || (isLogin ? 'Login to access your bookings' : 'Join our charter community')}
            </p>
          </div>

          <div className="p-8">
            {isLogin && (
              <>
                <Button 
                  onClick={() => setShowPasskeyAuth(true)} 
                  variant="outline" 
                  className="w-full h-14 border-2 hover:bg-purple-50 hover:border-purple-300 mb-6 transition-all"
                >
                  <Fingerprint className="w-6 h-6 mr-3 text-purple-600" />
                  <div className="text-left">
                    <div className="font-semibold text-base">Sign in with Biometrics</div>
                    <div className="text-xs text-gray-500">Use fingerprint, Face ID, or security key</div>
                  </div>
                </Button>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or</span></div>
                </div>
              </>
            )}

            {/* OAuth Providers - Prominent Position */}
            <div className="space-y-3 mb-6">
              <Button onClick={() => handleOAuthLogin('google')} disabled={loading} variant="outline" className="w-full h-12 border-2 hover:bg-gray-50 shadow-sm">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
              <Button onClick={() => handleOAuthLogin('facebook')} disabled={loading} variant="outline" className="w-full h-12 border-2 hover:bg-gray-50 shadow-sm">
                <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Continue with Facebook
              </Button>
              {/* Add more OAuth providers */}
              <Button onClick={() => handleOAuthLogin('github')} disabled={loading} variant="outline" className="w-full h-12 border-2 hover:bg-gray-50 shadow-sm">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                </svg>
                Continue with GitHub
              </Button>
            </div>

            {/* Magic Link Email - Passwordless Option */}
            {isLogin && (
              <div className="mb-4">
                <Button 
                  onClick={async () => {
                    if (!email) {
                      setError('Please enter your email address');
                      return;
                    }
                    setLoading(true);
                    setError('');
                    try {
                      const { error } = await supabase.auth.signInWithOtp({
                        email,
                        options: {
                          emailRedirectTo: `${window.location.origin}/`,
                        }
                      });
                      if (error) throw error;
                      setSuccess('Check your email for a magic link! No password needed.');
                    } catch (err: any) {
                      setError(err.message || 'Failed to send magic link');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !email}
                  variant="outline"
                  className="w-full h-12 border-2 border-purple-200 hover:bg-purple-50 text-purple-700 shadow-sm"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Send me a magic link (no password!)
                </Button>
              </div>
            )}

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or use email & password</span></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 h-12" required />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder={isLogin ? "Password (or use magic link above)" : "Password"} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="pl-10 pr-10 h-12" 
                  required={!isLogin}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {isLogin && (
                <div className="text-xs text-gray-500 text-center">
                  💡 Tip: Use Google/Facebook login above - no password needed!
                </div>
              )}
              {isLogin && (
                <div className="text-right">
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-blue-600 hover:underline">
                    Forgot Password?
                  </button>
                </div>
              )}
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              {success && <Alert className="bg-green-50 text-green-800 border-green-200"><AlertDescription>{success}</AlertDescription></Alert>}
              <Button type="submit" className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-lg font-semibold" disabled={loading}>
                {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }} className="text-blue-600 hover:underline font-semibold">
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      </div>

      <ForgotPasswordModal 
        open={showForgotPassword} 
        onOpenChange={(open) => {
          setShowForgotPassword(open);
          if (!open) {
            // Check if we got a reset code and show reset form
            const code = sessionStorage.getItem('resetCode');
            if (code) {
              setResetCode(code);
              setShowResetForm(true);
              sessionStorage.removeItem('resetCode');
            }
          }
        }} 
      />

      <ResetPasswordForm
        open={showResetForm}
        onOpenChange={setShowResetForm}
        email={email}
        resetCode={resetCode}
      />
    </>
  );
}
