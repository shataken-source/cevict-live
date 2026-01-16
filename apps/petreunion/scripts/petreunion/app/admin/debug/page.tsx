'use client';

import { useState } from 'react';

export default function AdminDebugPage() {
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkEnv = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/env-status');
      const data = await res.json();
      setEnvStatus(data);
    } catch (error) {
      console.error('Error:', error);
      setEnvStatus({ error: 'Failed to fetch env status' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Debug Page</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Status</h2>
          <button
            onClick={checkEnv}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Environment Variables'}
          </button>

          {envStatus && (
            <div className="mt-4">
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                {JSON.stringify(envStatus, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Make sure <code className="bg-gray-100 px-2 py-1 rounded">PETREUNION_ADMIN_PASSWORD</code> or <code className="bg-gray-100 px-2 py-1 rounded">ADMIN_PASSWORD</code> is set in your <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> file</li>
            <li>Restart your Next.js dev server after adding the environment variable</li>
            <li>Check the environment status above to verify the password is configured</li>
            <li>Try logging in at <a href="/admin/login" className="text-blue-600 underline">/admin/login</a></li>
            <li>Check the browser console and server logs for any error messages</li>
          </ol>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Common Issues:</h3>
          <ul className="list-disc list-inside space-y-1 text-yellow-700">
            <li>Environment variable not set or has extra spaces</li>
            <li>Server not restarted after adding env variable</li>
            <li>Password has special characters that need escaping</li>
            <li>Cookie not being set (check browser dev tools → Application → Cookies)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

