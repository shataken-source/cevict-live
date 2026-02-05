import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Download, RefreshCw, Clock, Database } from 'lucide-react';
import { toast } from 'sonner';

export default function BackupManagement() {
  const [backups, setBackups] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBackups();
    checkHealth();
  }, []);

  const loadBackups = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('database-backup', {
        body: { action: 'list' }
      });
      if (error) throw error;
      setBackups(data.backups || []);
    } catch (error: any) {
      toast.error('Failed to load backups');
    }
  };

  const checkHealth = async () => {
    try {
      const { data } = await supabase.functions.invoke('database-backup', {
        body: { action: 'health' }
      });
      setHealth(data);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('database-backup', {
        body: { action: 'backup' }
      });
      if (error) throw error;
      toast.success(`Backup created: ${data.totalRecords} records`);
      loadBackups();
      checkHealth();
    } catch (error: any) {
      toast.error('Backup failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyBackup = async (backupId: string) => {
    try {
      const { data } = await supabase.functions.invoke('database-backup', {
        body: { action: 'verify', backupId }
      });
      if (data.valid) {
        toast.success('Backup verified successfully');
      } else {
        toast.error('Backup verification failed');
      }
    } catch (error) {
      toast.error('Verification failed');
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm('Are you sure? This will restore the database to this backup point.')) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('database-backup', {
        body: { action: 'restore', backupId }
      });
      if (error) throw error;
      toast.success(`Restored ${data.restoredCount} records`);
    } catch (error: any) {
      toast.error('Restore failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Database Backup Management</h2>
        <Button onClick={createBackup} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Create Backup Now
        </Button>
      </div>

      {health && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {health.healthy ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-red-500" />
              )}
              <div>
                <h3 className="font-semibold">Backup Health Status</h3>
                <p className="text-sm text-muted-foreground">
                  Last backup: {health.hoursSinceLastBackup}h ago
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Recent Backups</div>
              <div className="text-2xl font-bold">{health.recentBackups}</div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4">
        {backups.map((backup) => (
          <Card key={backup.timestamp} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Database className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="font-semibold">
                    {new Date(backup.timestamp).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {backup.totalRecords} records • {backup.tableCount} tables
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => verifyBackup(backup.timestamp)}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Verify
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restoreBackup(backup.timestamp)}
                  disabled={loading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Restore
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}