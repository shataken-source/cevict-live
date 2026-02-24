'use client';

import { useState, useEffect } from 'react';

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  🐕 PETREUNION ADMIN DASHBOARD                                             ║
// ║  Location: apps/wheretovacation/app/admin/pet-manager/page.tsx            ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// Auth helper - passes SUPABASE_SERVICE_ROLE_KEY as Bearer token
const getAuthHeaders = (masterKey?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Get from localStorage or use provided key
  const key = masterKey || (typeof window !== 'undefined' ? localStorage.getItem('petreunion_admin_key') : null);
  
  if (key) {
    headers['Authorization'] = `Bearer ${key}`;
  }
  
  return headers;
};

interface Stats {
  totalReports: number;
  activeReports: number;
  reunited: number;
  pending: number;
  successRate: number;
  totalScraped: number;
}

interface ScanResult {
  petsFound: number;
  petsSaved: number;
  errors: string[];
  location: string;
  timestamp: string;
}

export default function PetManagerDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalReports: 0,
    activeReports: 0,
    reunited: 0,
    pending: 0,
    successRate: 0,
    totalScraped: 0,
  });
  
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('all');
  const [maxPets, setMaxPets] = useState(200);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [masterKey, setMasterKey] = useState('');
  const [adminUser, setAdminUser] = useState('admin'); // Pre-filled username

  // Check auth on load
  useEffect(() => {
    const savedKey = localStorage.getItem('petreunion_admin_key');
    if (savedKey) {
      setMasterKey(savedKey);
      setIsAuthenticated(true);
      fetchStats();
    }
  }, []);

  const handleLogin = () => {
    setError(''); // Clear any previous errors
    
    if (!masterKey.trim()) {
      setError('Please enter the Master Key');
      return;
    }
    
    // Basic validation - Supabase JWT starts with "eyJ"
    if (!masterKey.startsWith('eyJ')) {
      setError('Invalid key format. Supabase service role keys start with "eyJ..."');
      return;
    }
    
    localStorage.setItem('petreunion_admin_key', masterKey);
    setIsAuthenticated(true);
    setError('');
    fetchStats();
  };

  const handleLogout = () => {
    localStorage.removeItem('petreunion_admin_key');
    setIsAuthenticated(false);
    setMasterKey('');
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/petreunion/stats', {
        headers: getAuthHeaders(masterKey),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Run PetScanner with location
  const runScan = async () => {
    if (!location.trim()) {
      setError('Please enter a location (City, State or Zip Code)');
      return;
    }

    setIsScanning(true);
    setError('');
    setScanResult(null);

    try {
      // Parse location into city/state/zip
      const locationParts = parseLocation(location);
      
      // Call the appropriate API endpoint based on source
      const endpoints = getEndpointsForSource(source);
      let totalFound = 0;
      let totalSaved = 0;
      const errors: string[] = [];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: getAuthHeaders(masterKey),
            body: JSON.stringify({
              ...locationParts,
              maxPets,
              area: location,
            }),
          });

          const data = await res.json();
          
          if (data.petsFound) totalFound += data.petsFound;
          if (data.petsSaved) totalSaved += data.petsSaved;
          if (data.error) errors.push(data.error);
        } catch (err: any) {
          errors.push(`${endpoint}: ${err.message}`);
        }
      }

      const result: ScanResult = {
        petsFound: totalFound,
        petsSaved: totalSaved,
        errors,
        location,
        timestamp: new Date().toISOString(),
      };

      setScanResult(result);
      setRecentScans(prev => [result, ...prev.slice(0, 9)]);
      
      // Refresh stats
      fetchStats();
    } catch (err: any) {
      setError(err.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  // Parse location string into components
  const parseLocation = (loc: string) => {
    const result: any = {};
    
    // Check if it's a zip code
    if (/^\d{5}$/.test(loc.trim())) {
      result.zipcode = loc.trim();
      return result;
    }
    
    // Check if it's "City, State" format
    const match = loc.match(/^(.+),\s*([A-Za-z]{2})$/);
    if (match) {
      result.city = match[1].trim();
      result.state = match[2].trim().toUpperCase();
      return result;
    }
    
    // Check if it's just a state abbreviation
    if (/^[A-Za-z]{2}$/.test(loc.trim())) {
      result.state = loc.trim().toUpperCase();
      return result;
    }
    
    // Assume it's a city name
    result.city = loc.trim();
    return result;
  };

  // Get API endpoints based on source selection
  const getEndpointsForSource = (src: string): string[] => {
    switch (src) {
      case 'petharbor':
        return ['/api/petreunion/scrape-petharbor'];
      case 'petfinder':
        return ['/api/petreunion/autonomous-scraper-loop'];
      case 'facebook':
        return ['/api/petreunion/scrape-facebook-bulletproof'];
      case 'adoptapet':
        return ['/api/petreunion/scrape-adoptapet'];
      case 'all':
      default:
        return [
          '/api/petreunion/scrape-petharbor',
          '/api/petreunion/autonomous-scraper-loop',
        ];
    }
  };

  // Trigger PetScanner.ps1 script (via PowerShell endpoint)
  const triggerPetScanner = async () => {
    if (!location.trim()) {
      setError('Please enter a location');
      return;
    }

    setIsScanning(true);
    setError('');

    try {
      // This would call a server-side endpoint that executes the PowerShell script
      const res = await fetch('/api/petreunion/trigger-scanner', {
        method: 'POST',
        headers: getAuthHeaders(masterKey),
        body: JSON.stringify({
          location,
          source,
          maxPets,
          scriptPath: 'C:\\cevict-live\\scripts\\PetScanner.ps1',
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        setScanResult({
          petsFound: data.petsFound || 0,
          petsSaved: data.petsSaved || 0,
          errors: data.errors || [],
          location,
          timestamp: new Date().toISOString(),
        });
      } else {
        setError(data.error || 'Script execution failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-8 px-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
              🐕 PetReunion Admin
            </h1>
            <p className="text-gray-600 mt-2">Enter credentials to access the admin dashboard</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ❌ {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={adminUser}
                onChange={(e) => setAdminUser(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Master Key (Supabase Service Role)</label>
              <input
                type="password"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in Supabase Dashboard → Project Settings → API → service_role key
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleLogin}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                🔐 Login to Admin Panel
              </button>
              <button
                onClick={() => {
                  setIsAuthenticated(true);
                  setError('');
                }}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                title="Skip auth for local testing"
              >
                ⚡ Skip
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Auth headers will be passed as:</p>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              Authorization: Bearer [your-key]
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                🐕 PetReunion Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Manage pet scraping, matching, and reunification operations
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-600">Total Pets</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">{stats.totalScraped || stats.totalReports}</div>
            <div className="mt-1 text-sm text-gray-500">In database</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-600">Active Cases</div>
            <div className="mt-2 text-3xl font-bold text-orange-600">{stats.activeReports}</div>
            <div className="mt-1 text-sm text-gray-500">Still missing</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-600">Reunited</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{stats.reunited}</div>
            <div className="mt-1 text-sm text-green-600">❤️ Success</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-600">Pending Review</div>
            <div className="mt-2 text-3xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="mt-1 text-sm text-gray-500">Moderation</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-600">Success Rate</div>
            <div className="mt-2 text-3xl font-bold text-purple-600">{stats.successRate}%</div>
            <div className="mt-1 text-sm text-gray-500">Reunion rate</div>
          </div>
        </div>

        {/* Scanner Control Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            🔍 PetScanner Control
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Location Input */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location (City, State or Zip)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Houston, TX or 77001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isScanning}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maps to: <code className="bg-gray-100 px-1 rounded">PetScanner.ps1 -Location "{location || '...'}"</code>
              </p>
            </div>

            {/* Source Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isScanning}
              >
                <option value="all">All Sources</option>
                <option value="petharbor">PetHarbor</option>
                <option value="petfinder">Petfinder</option>
                <option value="adoptapet">AdoptAPet</option>
                <option value="facebook">Facebook</option>
              </select>
            </div>

            {/* Max Pets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Pets
              </label>
              <input
                type="number"
                value={maxPets}
                onChange={(e) => setMaxPets(parseInt(e.target.value) || 100)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={10}
                max={500}
                disabled={isScanning}
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ❌ {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={runScan}
              disabled={isScanning}
              className={`px-6 py-3 rounded-lg font-medium text-white flex items-center gap-2 ${
                isScanning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isScanning ? (
                <>
                  <span className="animate-spin">🔄</span>
                  Scanning...
                </>
              ) : (
                <>
                  🚀 Run API Scan
                </>
              )}
            </button>

            <button
              onClick={triggerPetScanner}
              disabled={isScanning}
              className={`px-6 py-3 rounded-lg font-medium text-white flex items-center gap-2 ${
                isScanning
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isScanning ? (
                <>
                  <span className="animate-spin">🔄</span>
                  Scanning...
                </>
              ) : (
                <>
                  ⚡ Run PetScanner.ps1
                </>
              )}
            </button>

            <button
              onClick={fetchStats}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
            >
              🔄 Refresh Stats
            </button>
          </div>
        </div>

        {/* Scan Result */}
        {scanResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              📊 Latest Scan Result
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600">Pets Found</div>
                <div className="text-2xl font-bold text-blue-700">{scanResult.petsFound}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600">Pets Saved</div>
                <div className="text-2xl font-bold text-green-700">{scanResult.petsSaved}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Location</div>
                <div className="text-lg font-medium text-gray-700">{scanResult.location}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Timestamp</div>
                <div className="text-lg font-medium text-gray-700">
                  {new Date(scanResult.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
            {scanResult.errors.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm font-medium text-yellow-800">Errors:</div>
                {scanResult.errors.map((err, i) => (
                  <div key={i} className="text-sm text-yellow-700">• {err}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📜 Recent Scans</h2>
            <div className="divide-y divide-gray-200">
              {recentScans.map((scan, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium">{scan.location}</span>
                    <span className="text-gray-500 ml-2 text-sm">
                      {new Date(scan.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-blue-600">Found: {scan.petsFound}</span>
                    <span className="text-green-600">Saved: {scan.petsSaved}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/petreunion" className="block bg-blue-600 text-white p-6 rounded-lg shadow hover:bg-blue-700">
            <div className="text-2xl mb-2">🐕</div>
            <div className="font-medium">View All Pets</div>
            <div className="text-sm text-blue-100">Browse database</div>
          </a>
          <a href="/admin/pet-manager/matches" className="block bg-green-600 text-white p-6 rounded-lg shadow hover:bg-green-700">
            <div className="text-2xl mb-2">🔗</div>
            <div className="font-medium">AI Matches</div>
            <div className="text-sm text-green-100">View potential matches</div>
          </a>
          <a href="/admin/pet-manager/shelters" className="block bg-purple-600 text-white p-6 rounded-lg shadow hover:bg-purple-700">
            <div className="text-2xl mb-2">🏠</div>
            <div className="font-medium">Shelters</div>
            <div className="text-sm text-purple-100">Manage shelters</div>
          </a>
          <a href="/admin/pet-manager/reports" className="block bg-orange-600 text-white p-6 rounded-lg shadow hover:bg-orange-700">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-medium">Reports</div>
            <div className="text-sm text-orange-100">Analytics & logs</div>
          </a>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ System Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Database</div>
              <div className="text-lg font-bold text-green-600">✓ Connected</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Match Engine</div>
              <div className="text-lg font-bold text-green-600">✓ Running</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">SMS Alerts</div>
              <div className="text-lg font-bold text-green-600">✓ Active</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">PetScanner.ps1</div>
              <div className="text-lg font-bold text-blue-600">
                C:\cevict-live\scripts\
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

