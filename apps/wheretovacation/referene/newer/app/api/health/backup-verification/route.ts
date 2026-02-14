// Automated Backup Verification System
// Checks that backups are running successfully and alerts if issues detected

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface BackupStatus {
  lastBackupTime: Date | null;
  backupAgeHours: number;
  backupSize: number | null;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
}

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      const status: BackupStatus = {
        lastBackupTime: null,
        backupAgeHours: Infinity,
        backupSize: null,
        status: 'unknown',
        message: 'Database not configured',
      };
      return NextResponse.json(status);
    }

    // Check for recent backup records
    const { data: recentBackups, error } = await supabase
      .from('backup_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      // Table might not exist, check alternative
      const status: BackupStatus = {
        lastBackupTime: null,
        backupAgeHours: Infinity,
        backupSize: null,
        status: 'unknown',
        message: 'Backup logs table not found. Please verify backup system is configured.',
      };
      return NextResponse.json(status);
    }

    if (!recentBackups || recentBackups.length === 0) {
      const status: BackupStatus = {
        lastBackupTime: null,
        backupAgeHours: Infinity,
        backupSize: null,
        status: 'critical',
        message: 'No backup records found. Backups may not be running.',
      };
      return NextResponse.json(status);
    }

    const lastBackup = recentBackups[0];
    const lastBackupTime = new Date(lastBackup.created_at);
    const now = new Date();
    const backupAgeHours = (now.getTime() - lastBackupTime.getTime()) / (1000 * 60 * 60);

    let status: BackupStatus['status'] = 'healthy';
    let message = 'Backups are running normally.';

    if (backupAgeHours > 48) {
      status = 'critical';
      message = `Last backup was ${Math.round(backupAgeHours)} hours ago. Backups may have stopped.`;
    } else if (backupAgeHours > 24) {
      status = 'warning';
      message = `Last backup was ${Math.round(backupAgeHours)} hours ago. Check backup schedule.`;
    }

    // Check backup success
    if (lastBackup.status === 'failed' || lastBackup.error) {
      status = 'critical';
      message = `Last backup failed: ${lastBackup.error || 'Unknown error'}`;
    }

    const result: BackupStatus = {
      lastBackupTime,
      backupAgeHours: Math.round(backupAgeHours * 100) / 100,
      backupSize: lastBackup.size || null,
      status,
      message,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unknown',
        message: `Error checking backup status: ${error.message}`,
        lastBackupTime: null,
        backupAgeHours: Infinity,
        backupSize: null,
      },
      { status: 500 }
    );
  }
}

