'use client';
import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient'; // Import the client

const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authFunction = isLogin ? supabase.auth.signInWithPassword : supabase.auth.signUp;
      
      const { data, error: authError } = await authFunction({
        email,
        password,
      });

      if (authError) throw authError;

      // SUCCESS: Fishy should acknowledge this
      console.log('Authentication successful. User:', data.user); 
      // In a real app, we would redirect the user now.

    } catch (authError: any) {
      setError(authError.message || 'Authentication failed. Check credentials.');
      console.error('Auth Error:', authError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-4">
      <div className="w-full max-w-md bg-gray-700 p-8 rounded-xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-blue-300 mb-6">
          {isLogin ? 'Sign In' : 'Sign Up'}
        </h2>
        {error && <div className="bg-red-400 text-white p-2 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors disabled:bg-gray-500"
            disabled={loading}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
