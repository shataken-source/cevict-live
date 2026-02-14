'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Shield,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface Backup {
  backupId: string;
  timestamp: string;
  totalRecords: number;
  recordCounts?: Record<string, number>;
  fileName?: string;
  checksum?: string;
  status?: string;
}

interface HealthStatus {
  healthy: boolean;
  databaseAccessible: boolean;
  storageAccessible: boolean;
  hoursSinceLastBackup: number | null;
  lastBackupTime: string | null;
  message: string;
}

export default function BackupManagementPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    loadBackups();
    checkHealth();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/petreunion/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' })
      });

      if (!response.ok) {
        throw new Error('Failed to load backups');
      }

      const data = await response.json();
      setBackups(data.backups || []);
    } catch (error: any) {
      console.error('Failed to load backups:', error);
      toast.error('Failed to load backups: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch('/api/petreunion/backup?action=health', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const createBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch('/api/petreunion/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Backup failed');
      }

      const data = await response.json();
      toast.success(`Backup created successfully: ${data.totalRecords} records`);
      
      // Reload backups and health
      await loadBackups();
      await checkHealth();
    } catch (error: any) {
      console.error('Backup failed:', error);
      toast.error('Backup failed: ' + error.message);
    } finally {
      setBackupLoading(false);
    }
  };

  const verifyBackup = async (backupId: string) => {
    try {
      const response = await fetch('/api/petreunion/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', backupId })
      });

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const data = await response.json();
      toast.success(`Backup verified: ${data.message}`);
    } catch (error: any) {
      toast.error('Verification failed: ' + error.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatHoursAgo = (hours: number | null) => {
    if (hours === null) return 'Never';
    if (hours < 1) return `${Math.round(hours * 60)} minutes ago`;
    if (hours < 24) return `${Math.round(hours)} hours ago`;
    return `${Math.round(hours / 24)} days ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Database className="w-10 h-10 text-blue-600" />
            Database Backup Management
          </h1>
          <p className="text-gray-600">
            Manage automated backups for PetReunion database
          </p>
        </div>

        {/* Health Status */}
        {health && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {health.healthy ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Database</p>
                  <Badge variant={health.databaseAccessible ? 'default' : 'destructive'}>
                    {health.databaseAccessible ? 'Accessible' : 'Not Accessible'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Storage</p>
                  <Badge variant={health.storageAccessible ? 'default' : 'destructive'}>
                    {health.storageAccessible ? 'Accessible' : 'Not Accessible'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Backup</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">
                      {formatHoursAgo(health.hoursSinceLastBackup)}
                    </span>
                  </div>
                </div>
              </div>
              {health.hoursSinceLastBackup !== null && health.hoursSinceLastBackup > 7 && (
                <Alert className="mt-4 border-orange-200 bg-orange-50">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-700">
                    Warning: Last backup was {formatHoursAgo(health.hoursSinceLastBackup)}. 
                    Consider creating a new backup.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Create and manage database backups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button
                onClick={createBackup}
                disabled={backupLoading}
                className="flex items-center gap-2"
              >
                {backupLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Create Backup
                  </>
                )}
              </Button>
              <Button
                onClick={loadBackups}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh List
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Backups List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Backup History
            </CardTitle>
            <CardDescription>
              {backups.length} backup{backups.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-600 mt-2">Loading backups...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8">
                <Database className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No backups found</p>
                <p className="text-sm text-gray-500 mt-2">
                  Create your first backup to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {backups.map((backup) => (
                  <Card key={backup.backupId} className="border">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{backup.backupId}</Badge>
                            {backup.status && (
                              <Badge variant={backup.status === 'completed' ? 'default' : 'secondary'}>
                                {backup.status}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            <Clock className="w-4 h-4 inline mr-1" />
                            {formatDate(backup.timestamp)}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-600">
                              <Database className="w-4 h-4 inline mr-1" />
                              {backup.totalRecords} records
                            </span>
                            {backup.checksum && (
                              <span className="text-gray-500 flex items-center gap-1">
                                <Shield className="w-4 h-4" />
                                Verified
                              </span>
                            )}
                          </div>
                          {backup.recordCounts && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {Object.entries(backup.recordCounts).map(([table, count]) => (
                                <Badge key={table} variant="secondary" className="text-xs">
                                  {table}: {count}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {backup.checksum && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifyBackup(backup.backupId)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Verify
                            </Button>
                          )}
                          {backup.fileName && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Download backup file
                                toast.info('Download feature coming soon');
                              }}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}












