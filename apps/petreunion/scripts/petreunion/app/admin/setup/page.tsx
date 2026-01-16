'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, CheckCircle2, XCircle, Loader2, AlertCircle } from '@/components/ui/icons';
import Link from 'next/link';

export default function DatabaseSetupPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const checkMigration = async (migrationName: string) => {
    setLoading(migrationName);
    setResults(prev => ({ ...prev, [migrationName]: { success: false, message: 'Checking...' } }));

    try {
      const response = await fetch('/api/petreunion/admin/run-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ migrationName })
      });

      const data = await response.json();

      if (response.ok) {
        setResults(prev => ({
          ...prev,
          [migrationName]: { 
            success: data.success || false, 
            message: data.message || data.error || 'Unknown status' 
          }
        }));
      } else {
        setResults(prev => ({
          ...prev,
          [migrationName]: { success: false, message: data.error || 'Check failed' }
        }));
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        [migrationName]: { success: false, message: error.message || 'Failed to check migration' }
      }));
    } finally {
      setLoading(null);
    }
  };

  const migrations = [
    {
      name: 'pet_alerts',
      title: 'Pet Alerts Table',
      description: 'Creates the pet_alerts table for email notifications',
      sqlFile: 'CREATE_PET_ALERTS_TABLE.sql'
    },
    {
      name: 'lost_pets',
      title: 'Lost Pets Table',
      description: 'Creates the lost_pets table (main pet database)',
      sqlFile: 'CREATE_LOST_PETS_TABLE.sql'
    },
    {
      name: 'shelters',
      title: 'Shelters Table',
      description: 'Creates the shelters table for rescue organizations',
      sqlFile: 'UPDATE_SHELTERS_TABLE.sql'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Database className="w-10 h-10 text-blue-600" />
              Database Setup
            </h1>
            <p className="text-gray-600 text-lg">
              Run database migrations with one click
            </p>
          </div>
          <Link href="/petreunion/admin/dashboard">
            <Button variant="outline">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium mb-1">
                  What are migrations?
                </p>
                <p className="text-sm text-blue-700">
                  Migrations create the database tables needed for PetReunion to work. 
                  Click the buttons below to set up each table. You only need to run each migration once.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Migration Cards */}
        <div className="space-y-4">
          {migrations.map((migration) => {
            const result = results[migration.name];
            const isLoading = loading === migration.name;

            return (
              <Card key={migration.name} className="hover:shadow-lg transition">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{migration.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {migration.description}
                      </CardDescription>
                    </div>
                    {result && (
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600" />
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result && (
                      <div
                        className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${
                          result.success
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {result.message}
                        {!result.success && result.message.includes('SQL') && (
                          <div className="mt-3">
                            <p className="font-semibold mb-2">To fix this:</p>
                            <ol className="list-decimal list-inside space-y-1 text-xs">
                              <li>Go to your Supabase project dashboard</li>
                              <li>Click "SQL Editor" in the left sidebar</li>
                              <li>Click "New Query"</li>
                              <li>Copy the SQL from: <code className="bg-gray-100 px-1 rounded">supabase/migrations/create_pet_alerts_table.sql</code></li>
                              <li>Paste it and click "Run"</li>
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                    <Button
                      onClick={() => checkMigration(migration.name)}
                      disabled={isLoading}
                      className="w-full"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4 mr-2" />
                          Check {migration.title} Status
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-3">
              <Link href="/petreunion/admin/dashboard">
                <Button variant="outline" className="w-full">
                  <Database className="w-4 h-4 mr-2" />
                  Admin Dashboard
                </Button>
              </Link>
              <Link href="/petreunion/admin/populate">
                <Button variant="outline" className="w-full">
                  <Database className="w-4 h-4 mr-2" />
                  Populate Database
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

