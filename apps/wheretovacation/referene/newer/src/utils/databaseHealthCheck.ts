import { supabase } from '@/lib/supabase';

export interface DatabaseHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  activeConnections: number;
  errors: string[];
  timestamp: Date;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const startTime = Date.now();
  const errors: string[] = [];
  const activeConnections = 0;


  try {
    // Test basic connection
    const { error: pingError } = await supabase.from('captains').select('count').limit(1);
    if (pingError) errors.push(`Ping failed: ${pingError.message}`);

    // Test auth connection
    const { error: authError } = await supabase.auth.getSession();
    if (authError) errors.push(`Auth failed: ${authError.message}`);

    // Test storage connection
    const { error: storageError } = await supabase.storage.listBuckets();
    if (storageError) errors.push(`Storage failed: ${storageError.message}`);

    const responseTime = Date.now() - startTime;
    const status = errors.length === 0 ? 'healthy' : errors.length < 2 ? 'degraded' : 'down';

    return { status, responseTime, activeConnections, errors, timestamp: new Date() };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      activeConnections: 0,
      errors: [`Critical error: ${error}`],
      timestamp: new Date()
    };
  }
}
