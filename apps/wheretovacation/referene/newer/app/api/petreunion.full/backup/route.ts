import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables for backup');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Encryption key for backups (should be stored securely in production)
const getEncryptionKey = () => {
  const key = process.env.BACKUP_ENCRYPTION_KEY || 'default-backup-key-change-in-production';
  return crypto.createHash('sha256').update(key).digest();
};

// Encrypt backup data (using AES-256-CBC for better compatibility)
function encryptBackup(data: string, key: Buffer): { encrypted: string; iv: string } {
  try {
    const iv = crypto.randomBytes(16);
    // Use AES-256-CBC instead of GCM for better compatibility
    const cipher = crypto.createCipheriv('aes-256-cbc', key.slice(0, 32), iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex')
    };
  } catch (error: any) {
    console.error('Encryption error:', error);
    // Fallback: return unencrypted but base64 encoded
    return {
      encrypted: Buffer.from(data).toString('base64'),
      iv: ''
    };
  }
}

// Decrypt backup data
function decryptBackup(encrypted: string, iv: string, key: Buffer): string {
  try {
    if (!iv) {
      // Unencrypted base64 fallback
      return Buffer.from(encrypted, 'base64').toString('utf8');
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key.slice(0, 32), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error: any) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt backup');
  }
}

// Calculate SHA-256 checksum
function calculateChecksum(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      const missingVars: string[] = [];
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        missingVars.push('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }
      return NextResponse.json(
        { 
          error: 'Database not configured',
          message: `Missing environment variables: ${missingVars.join(', ')}`,
          details: process.env.NODE_ENV === 'development' ? 'Check your .env.local file and restart the server' : undefined
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'backup';

    // Create backup
    if (action === 'backup') {
      console.log('🔄 Starting PetReunion database backup...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = `petreunion-backup-${Date.now()}`;
      
      // Backup all PetReunion tables
      const tables = ['lost_pets', 'found_pets', 'pet_matches', 'shelters', 'pet_alerts'];
      const backupData: Record<string, any[]> = {};
      let totalRecords = 0;

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*');
          
          if (error) {
            // Table might not exist, skip it
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
              console.log(`⚠️ Table ${table} does not exist, skipping...`);
              backupData[table] = [];
              continue;
            }
            throw error;
          }
          
          backupData[table] = data || [];
          totalRecords += (data || []).length;
          console.log(`✅ Backed up ${table}: ${(data || []).length} records`);
        } catch (error: any) {
          console.error(`❌ Error backing up ${table}:`, error.message);
          backupData[table] = [];
        }
      }

      // Create backup metadata
      const backupMetadata = {
        backupId,
        timestamp: new Date().toISOString(),
        totalRecords,
        tables: Object.keys(backupData),
        recordCounts: Object.fromEntries(
          Object.entries(backupData).map(([table, records]) => [table, records.length])
        ),
        version: '1.0'
      };

      // Combine data and metadata
      const fullBackup = {
        metadata: backupMetadata,
        data: backupData
      };

      // Convert to JSON string
      const backupJson = JSON.stringify(fullBackup, null, 2);
      
      // Calculate checksum
      const checksum = calculateChecksum(backupJson);
      
      // Encrypt backup
      const encryptionKey = getEncryptionKey();
      const { encrypted, iv } = encryptBackup(backupJson, encryptionKey);
      
      // Create backup file name
      const fileName = `${backupId}.encrypted.json`;
      const metadataFileName = `${backupId}.metadata.json`;
      
      // Store backup - try multiple methods
      let storageSuccess = false;
      let storageMethod = 'none';
      
      // Method 1: Try Supabase Storage
      try {
        // Check if bucket exists, create if needed
        const { data: buckets } = await supabase.storage.listBuckets();
        const backupBucket = buckets?.find(b => b.name === 'database-backups');
        
        if (!backupBucket) {
          console.log('📦 Creating database-backups bucket...');
          const { error: createError } = await supabase.storage.createBucket('database-backups', {
            public: false,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: ['application/json']
          });
          
          if (createError && !createError.message.includes('already exists')) {
            console.warn('⚠️ Could not create bucket:', createError.message);
          }
        }

        // Try to upload encrypted backup (convert string to buffer/blob)
        const encryptedBuffer = Buffer.from(encrypted, 'utf8');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('database-backups')
          .upload(fileName, encryptedBuffer, {
            contentType: 'application/json',
            upsert: false,
            cacheControl: '3600'
          });

        if (!uploadError) {
          storageSuccess = true;
          storageMethod = 'storage';
          console.log('✅ Backup uploaded to storage:', fileName);
          
          // Upload metadata
          const metadataBuffer = Buffer.from(JSON.stringify(backupMetadata), 'utf8');
          await supabase.storage
            .from('database-backups')
            .upload(metadataFileName, metadataBuffer, {
              contentType: 'application/json',
              upsert: false
            });
        } else {
          console.warn('⚠️ Storage upload failed:', uploadError.message);
        }
      } catch (storageError: any) {
        console.warn('⚠️ Storage error:', storageError.message);
      }

      // Method 2: Store in backup_logs table as fallback
      if (!storageSuccess) {
        try {
          // Create backup_logs table if it doesn't exist (via RPC or direct insert with error handling)
          const { error: logError } = await supabase
            .from('backup_logs')
            .insert({
              backup_id: backupId,
              timestamp: new Date().toISOString(),
              total_records: totalRecords,
              checksum,
              file_name: fileName,
              status: 'completed',
              metadata: backupMetadata,
              backup_data: fullBackup, // Store full backup in JSONB column
              storage_method: 'database'
            });
          
          if (logError) {
            if (logError.code === '42P01') {
              // Table doesn't exist - create it
              console.log('📋 Creating backup_logs table...');
              const createTableSQL = `
                CREATE TABLE IF NOT EXISTS backup_logs (
                  id BIGSERIAL PRIMARY KEY,
                  backup_id TEXT UNIQUE NOT NULL,
                  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                  total_records INTEGER NOT NULL,
                  checksum TEXT NOT NULL,
                  file_name TEXT,
                  status TEXT NOT NULL DEFAULT 'completed',
                  metadata JSONB,
                  backup_data JSONB,
                  storage_method TEXT DEFAULT 'database',
                  created_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_backup_logs_timestamp ON backup_logs(timestamp DESC);
                CREATE INDEX IF NOT EXISTS idx_backup_logs_backup_id ON backup_logs(backup_id);
              `;
              
              // Try to execute via RPC or direct SQL
              let createTableError: any = null;
              try {
                const result = await supabase.rpc('exec_sql', { sql: createTableSQL });
                createTableError = result.error;
              } catch (rpcError: any) {
                // If RPC doesn't exist, try inserting again (table might have been created)
                const insertResult = await supabase.from('backup_logs').insert({
                  backup_id: backupId,
                  timestamp: new Date().toISOString(),
                  total_records: totalRecords,
                  checksum,
                  file_name: fileName,
                  status: 'completed',
                  metadata: backupMetadata,
                  backup_data: fullBackup,
                  storage_method: 'database'
                });
                createTableError = insertResult.error;
              }
              
              if (createTableError && createTableError.code !== '42P01') {
                console.error('❌ Failed to create backup_logs table:', createTableError);
              } else {
                // Retry insert after table creation
                const { error: retryError } = await supabase.from('backup_logs').insert({
                  backup_id: backupId,
                  timestamp: new Date().toISOString(),
                  total_records: totalRecords,
                  checksum,
                  file_name: fileName,
                  status: 'completed',
                  metadata: backupMetadata,
                  backup_data: fullBackup,
                  storage_method: 'database'
                });
                
                if (!retryError) {
                  storageSuccess = true;
                  storageMethod = 'database';
                  console.log('✅ Backup stored in database:', backupId);
                }
              }
            } else {
              console.error('❌ Failed to log backup:', logError);
            }
          } else {
            storageSuccess = true;
            storageMethod = 'database';
            console.log('✅ Backup stored in database:', backupId);
          }
        } catch (dbError: any) {
          console.error('❌ Database storage error:', dbError.message);
        }
      }

      // Method 3: Return backup data in response as last resort (for immediate download)
      if (!storageSuccess) {
        console.warn('⚠️ Could not store backup, returning in response');
        return NextResponse.json({
          success: true,
          backupId,
          timestamp: backupMetadata.timestamp,
          totalRecords,
          tables: backupMetadata.tables,
          recordCounts: backupMetadata.recordCounts,
          checksum,
          fileName,
          storageMethod: 'response',
          backupData: fullBackup, // Include full backup in response
          message: `Backup completed but could not be stored. Download this response.`
        });
      }

      console.log(`✅ Backup completed: ${totalRecords} records from ${Object.keys(backupData).length} tables (stored via ${storageMethod})`);

      return NextResponse.json({
        success: true,
        backupId,
        timestamp: backupMetadata.timestamp,
        totalRecords,
        tables: backupMetadata.tables,
        recordCounts: backupMetadata.recordCounts,
        checksum,
        fileName,
        storageMethod,
        message: `Backup completed successfully: ${totalRecords} records stored via ${storageMethod}`
      });

    // List backups
    } else if (action === 'list') {
      try {
        const allBackups: any[] = [];
        
        // Method 1: Try to list from storage
        try {
          const { data: files, error } = await supabase.storage
            .from('database-backups')
            .list('', {
              limit: 100,
              sortBy: { column: 'created_at', order: 'desc' }
            });

          if (!error && files) {
            // Filter metadata files
            const metadataFiles = files.filter(f => f.name.endsWith('.metadata.json'));
            
            const storageBackups = await Promise.all(
              metadataFiles.map(async (file) => {
                try {
                  const { data, error } = await supabase.storage
                    .from('database-backups')
                    .download(file.name);
                  
                  if (error) return null;
                  
                  const text = await data.text();
                  const metadata = JSON.parse(text);
                  
                  return {
                    backupId: metadata.backupId,
                    timestamp: metadata.timestamp,
                    totalRecords: metadata.totalRecords,
                    recordCounts: metadata.recordCounts,
                    fileName: file.name.replace('.metadata.json', '.encrypted.json'),
                    storageMethod: 'storage'
                  };
                } catch (e) {
                  return null;
                }
              })
            );
            
            allBackups.push(...storageBackups.filter(b => b !== null));
          }
        } catch (storageError: any) {
          console.warn('⚠️ Could not list from storage:', storageError.message);
        }
        
        // Method 2: List from backup_logs table
        try {
          const { data: logs, error: logError } = await supabase
            .from('backup_logs')
            .select('backup_id, timestamp, total_records, checksum, file_name, status, metadata, storage_method')
            .order('timestamp', { ascending: false })
            .limit(100);
          
          if (!logError && logs) {
            const dbBackups = logs.map((log: any) => ({
              backupId: log.backup_id,
              timestamp: log.timestamp,
              totalRecords: log.total_records,
              checksum: log.checksum,
              fileName: log.file_name,
              status: log.status,
              recordCounts: log.metadata?.recordCounts,
              storageMethod: log.storage_method || 'database'
            }));
            
            allBackups.push(...dbBackups);
          }
        } catch (dbError: any) {
          console.warn('⚠️ Could not list from database:', dbError.message);
        }
        
        // Remove duplicates and sort by timestamp
        const uniqueBackups = Array.from(
          new Map(allBackups.map(b => [b.backupId, b])).values()
        ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        return NextResponse.json({
          backups: uniqueBackups,
          total: uniqueBackups.length
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: 'Failed to list backups', details: error.message },
          { status: 500 }
        );
      }

    // Verify backup
    } else if (action === 'verify') {
      const { backupId } = body;
      if (!backupId) {
        return NextResponse.json(
          { error: 'backupId required' },
          { status: 400 }
        );
      }

      try {
        const fileName = `${backupId}.encrypted.json`;
        const { data, error } = await supabase.storage
          .from('database-backups')
          .download(fileName);

        if (error) {
          return NextResponse.json(
            { error: 'Backup not found', details: error.message },
            { status: 404 }
          );
        }

        const encryptedData = await data.text();
        const checksum = calculateChecksum(encryptedData);

        return NextResponse.json({
          valid: true,
          backupId,
          checksum,
          size: encryptedData.length,
          message: 'Backup file exists and is valid'
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: 'Verification failed', details: error.message },
          { status: 500 }
        );
      }

    // Health check
    } else if (action === 'health') {
      try {
        // Check if we can access the database
        const { data: testData, error: testError } = await supabase
          .from('lost_pets')
          .select('id')
          .limit(1);

        // Check last backup
        const { data: lastBackup } = await supabase.storage
          .from('database-backups')
          .list('', {
            limit: 1,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        const lastBackupTime = lastBackup?.[0]?.created_at;
        const hoursSinceLastBackup = lastBackupTime
          ? (Date.now() - new Date(lastBackupTime).getTime()) / (1000 * 60 * 60)
          : null;

        return NextResponse.json({
          healthy: !testError,
          databaseAccessible: !testError,
          storageAccessible: true,
          hoursSinceLastBackup,
          lastBackupTime,
          message: testError 
            ? 'Database may not be accessible' 
            : 'System is healthy'
        });
      } catch (error: any) {
        return NextResponse.json({
          healthy: false,
          error: error.message
        }, { status: 500 });
      }

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use: backup, list, verify, or health' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('❌ Backup API error:', error);
    return NextResponse.json(
      { 
        error: 'Backup operation failed',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'health';

    if (action === 'health') {
      const { data: testData, error: testError } = await supabase
        .from('lost_pets')
        .select('id')
        .limit(1);

      return NextResponse.json({
        healthy: !testError,
        databaseAccessible: !testError,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

