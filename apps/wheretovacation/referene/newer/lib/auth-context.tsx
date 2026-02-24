'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * AUTH CONTEXT
 * 
 * Provides authentication state and methods throughout the app
 * Includes Facebook SDK integration
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface User {
  id: string;
  email?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: 'user' | 'admin' | 'shelter' | 'officer' | 'volunteer';
  isActive: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithFacebook: () => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
  isNewUser?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// FACEBOOK SDK TYPES
// ═══════════════════════════════════════════════════════════════════════════

declare global {
  interface Window {
    FB: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (callback: (response: FacebookLoginResponse) => void, options: { scope: string }) => void;
      logout: (callback: () => void) => void;
      getLoginStatus: (callback: (response: FacebookLoginResponse) => void) => void;
    };
    fbAsyncInit: () => void;
  }
}

interface FacebookLoginResponse {
  status: 'connected' | 'not_authorized' | 'unknown';
  authResponse?: {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════

interface AuthProviderProps {
  children: ReactNode;
  facebookAppId?: string;
}

export function AuthProvider({ children, facebookAppId }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fbReady, setFbReady] = useState(false);

  // Initialize Facebook SDK
  useEffect(() => {
    const appId = facebookAppId || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    
    if (!appId) {
      console.warn('[Auth] Facebook App ID not configured');
      return;
    }

    // Load Facebook SDK
    const loadFacebookSDK = () => {
      if (document.getElementById('facebook-jssdk')) {
        return;
      }

      window.fbAsyncInit = function() {
        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        setFbReady(true);
      };

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    };

    loadFacebookSDK();
  }, [facebookAppId]);

  // Check for existing session on mount
  useEffect(() => {
    refreshUser();
  }, []);

  // Refresh user from session
  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/facebook');
      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('[Auth] Failed to refresh user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login with Facebook
  const loginWithFacebook = useCallback(async (): Promise<LoginResult> => {
    return new Promise((resolve) => {
      if (!window.FB || !fbReady) {
        resolve({ success: false, error: 'Facebook SDK not loaded' });
        return;
      }

      window.FB.login(async (response) => {
        if (response.status === 'connected' && response.authResponse) {
          try {
            // Send token to our backend
            const backendResponse = await fetch('/api/auth/facebook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accessToken: response.authResponse.accessToken
              })
            });

            const data = await backendResponse.json();

            if (data.success && data.user) {
              setUser(data.user);
              resolve({
                success: true,
                user: data.user,
                isNewUser: data.isNewUser
              });
            } else {
              resolve({
                success: false,
                error: data.error || 'Authentication failed'
              });
            }
          } catch (error: any) {
            resolve({
              success: false,
              error: error.message || 'Network error'
            });
          }
        } else {
          resolve({
            success: false,
            error: response.status === 'not_authorized' 
              ? 'Please allow PetReunion to access your Facebook account'
              : 'Facebook login was cancelled'
          });
        }
      }, { scope: 'email,public_profile' });
    });
  }, [fbReady]);

  // Logout
  const logout = useCallback(async () => {
    try {
      // Logout from our backend
      await fetch('/api/auth/facebook', { method: 'DELETE' });
      
      // Logout from Facebook SDK
      if (window.FB && fbReady) {
        window.FB.logout(() => {});
      }

      setUser(null);
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      setUser(null);
    }
  }, [fbReady]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    loginWithFacebook,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to require authentication
 * Returns the user or null if not authenticated
 */
export function useRequireAuth(): { user: User | null; isLoading: boolean } {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(roles: string | string[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return roleArray.includes(user.role);
}

