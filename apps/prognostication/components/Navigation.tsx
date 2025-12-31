'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trophy, Crown, BarChart3, Settings, Menu, X, Zap } from 'lucide-react';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Trophy,
      href: '/',
      description: 'Live predictions & stats'
    },
    {
      id: 'premium',
      label: 'Premium Picks',
      icon: Crown,
      href: '/premium',
      description: '90%+ confidence picks'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      href: '/analytics',
      description: 'Performance & trends'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: '/settings',
      description: 'Account & preferences'
    }
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-sports-card border border-sports-border p-2 rounded-lg"
      >
        {isMenuOpen ? <X className="w-6 h-6 text-sports-text" /> : <Menu className="w-6 h-6 text-sports-text" />}
      </button>

      {/* Mobile Overlay */}
      {isMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <nav className={`
        fixed lg:static top-0 left-0 h-full lg:h-auto w-64 lg:w-64 
        bg-sports-card border-r border-sports-border z-40
        transform transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="relative">
              <Trophy className="w-8 h-8 text-primary-500" />
              <Zap className="w-3 h-3 text-yellow-500 absolute -top-1 -right-1" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sports-text">PROGNO</h1>
              <p className="text-xs text-gray-400">AI Sports Predictions</p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    setCurrentView(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30' 
                      : 'text-gray-400 hover:text-sports-text hover:bg-sports-bg'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs opacity-70">{item.description}</div>
                  </div>
                  {item.id === 'premium' && (
                    <Crown className="w-4 h-4 text-yellow-500" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* PROGNO Status */}
          <div className="mt-8 p-4 bg-sports-bg rounded-lg border border-sports-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">PROGNO Status</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div className="text-xs text-gray-500">
              Algorithm active • 156 predictions today
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Win Rate</span>
              <span className="text-sm font-medium text-sports-accent">68.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Active Picks</span>
              <span className="text-sm font-medium text-primary-500">23</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Streak</span>
              <span className="text-sm font-medium text-green-500">4W</span>
            </div>
          </div>

          {/* Premium CTA */}
          <div className="mt-8">
            <Link
              href="/premium"
              onClick={() => setIsMenuOpen(false)}
              className="block w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 text-center"
            >
              <Crown className="w-4 h-4 inline mr-2" />
              Upgrade to Premium
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
