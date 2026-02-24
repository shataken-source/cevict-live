'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building, LogOut, FileText, Search, BarChart3, Upload, Settings, Users, TrendingUp, AlertCircle, Clock } from 'lucide-react';

export default function ShelterPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setRememberMe(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
            <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-orange-500">
              <span>🐾</span>
              <span>PetReunion</span>
            </Link>
          </nav>
        </header>

        {/* Login Screen */}
        <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-700 to-blue-600">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">🏥 Shelter Portal</h1>
              <p className="text-gray-600">Log in to manage your shelter's pet reports and reunifications</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Shelter Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shelter@example.com"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-600 text-white font-bold rounded-lg hover:transform hover:translate-y-[-2px] transition-all shadow-lg"
              >
                Sign In
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="mb-2">
                <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Forgot password?
                </a>
              </p>
              <p>
                Don't have an account?{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Register your shelter
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-orange-500">
            <span>🐾</span>
            <span>PetReunion</span>
          </Link>
        </nav>
      </header>

      {/* Dashboard Header */}
      <div className="bg-white py-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Birmingham Animal Shelter</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-semibold text-gray-900">Sarah Johnson</div>
              <div className="text-sm text-gray-600">Shelter Administrator</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
            <div className="text-sm text-gray-600 mb-2">Active Reports</div>
            <div className="text-4xl font-bold text-gray-900">47</div>
            <div className="text-sm text-green-600 mt-2">↑ 5 this week</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
            <div className="text-sm text-gray-600 mb-2">Successful Reunions</div>
            <div className="text-4xl font-bold text-gray-900">23</div>
            <div className="text-sm text-green-600 mt-2">↑ 8 this month</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500">
            <div className="text-sm text-gray-600 mb-2">Pending Matches</div>
            <div className="text-4xl font-bold text-gray-900">12</div>
            <div className="text-sm text-gray-600 mt-2">Requires attention</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
            <div className="text-sm text-gray-600 mb-2">Critical Cases</div>
            <div className="text-4xl font-bold text-gray-900">3</div>
            <div className="text-sm text-gray-600 mt-2">Over 30 days</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-8 rounded-xl shadow-md mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <button className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-xl hover:transform hover:translate-y-[-3px] transition-all shadow-md hover:shadow-lg">
              <div className="text-4xl mb-2">📝</div>
              <div className="font-bold text-gray-900">Report Found Pet</div>
            </button>

            <button className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-xl hover:transform hover:translate-y-[-3px] transition-all shadow-md hover:shadow-lg">
              <div className="text-4xl mb-2">🔍</div>
              <div className="font-bold text-gray-900">Search Lost Pets</div>
            </button>

            <button className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-xl hover:transform hover:translate-y-[-3px] transition-all shadow-md hover:shadow-lg">
              <div className="text-4xl mb-2">📊</div>
              <div className="font-bold text-gray-900">View Analytics</div>
            </button>

            <button className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-xl hover:transform hover:translate-y-[-3px] transition-all shadow-md hover:shadow-lg">
              <div className="text-4xl mb-2">📤</div>
              <div className="font-bold text-gray-900">Bulk Import</div>
            </button>

            <button className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-xl hover:transform hover:translate-y-[-3px] transition-all shadow-md hover:shadow-lg">
              <div className="text-4xl mb-2">⚙️</div>
              <div className="font-bold text-gray-900">Settings</div>
            </button>

            <button className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-xl hover:transform hover:translate-y-[-3px] transition-all shadow-md hover:shadow-lg">
              <div className="text-4xl mb-2">👥</div>
              <div className="font-bold text-gray-900">Manage Users</div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            <div className="p-6 bg-gray-50 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">✅ Successful Reunion: Max (Golden Retriever)</div>
                <div className="text-gray-600 text-sm">Owner contacted and pet returned • Birmingham, AL</div>
              </div>
              <div className="text-gray-400 text-sm ml-4">2 hours ago</div>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">📸 New Found Pet Report: Luna (Tabby Cat)</div>
                <div className="text-gray-600 text-sm">Added by Staff Member • Homewood, AL</div>
              </div>
              <div className="text-gray-400 text-sm ml-4">5 hours ago</div>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">🔔 Potential Match: Buddy (Lab Mix)</div>
                <div className="text-gray-600 text-sm">AI identified 87% match • Requires verification</div>
              </div>
              <div className="text-gray-400 text-sm ml-4">1 day ago</div>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">📞 Owner Contact: Whiskers (Siamese)</div>
                <div className="text-gray-600 text-sm">Owner called to confirm pet details • In progress</div>
              </div>
              <div className="text-gray-400 text-sm ml-4">2 days ago</div>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg border-l-4 border-blue-500 flex justify-between items-center">
              <div className="flex-1">
                <div className="font-semibold text-gray-900 mb-1">📤 Bulk Import Completed</div>
                <div className="text-gray-600 text-sm">15 new pet records added from intake system</div>
              </div>
              <div className="text-gray-400 text-sm ml-4">3 days ago</div>
            </div>
          </div>

          <button className="w-full mt-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-colors">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}
