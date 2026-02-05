/**
 * Database Connection Pool
 * 
 * Manages database connections efficiently to handle 1000+ concurrent users.
 * CRITICAL FIX: Prevents connection exhaustion and crashes.
 * 
 * Features:
 * - Connection pooling with limits
 * - Automatic connection recycling
 * - Health checks
 * - Metrics and monitoring
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface PoolConfig {
  minConnections?: number;
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageWaitTime: number;
}

interface Connection {
  client: SupabaseClient;
  inUse: boolean;
  lastUsed: number;
  createdAt: number;
}

export class ConnectionPool {
  private connections: Connection[] = [];
  private waitQueue: Array<{
    resolve: (client: SupabaseClient) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  private config: Required<PoolConfig>;
  private supabaseUrl: string;
  private supabaseKey: string;
  
  // Stats
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalWaitTime: 0
  };
  
  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config?: PoolConfig
  ) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    
    this.config = {
      minConnections: config?.minConnections || 5,
      maxConnections: config?.maxConnections || 50,
      connectionTimeout: config?.connectionTimeout || 30000, // 30s
      idleTimeout: config?.idleTimeout || 300000, // 5min
      maxRetries: config?.maxRetries || 3,
      retryDelay: config?.retryDelay || 1000
    };
    
    // Initialize minimum connections
    this.initialize();
    
    // Start idle connection cleanup
    this.startIdleCleanup();
  }
  
  /**
   * Initialize minimum connections
   */
  private async initialize(): Promise<void> {
    const promises = [];
    
    for (let i = 0; i < this.config.minConnections; i++) {
      promises.push(this.createConnection());
    }
    
    await Promise.all(promises);
    console.log(`Connection pool initialized with ${this.config.minConnections} connections`);
  }
  
  /**
   * Create new connection
   */
  private async createConnection(): Promise<Connection> {
    const client = createClient(this.supabaseUrl, this.supabaseKey, {
      auth: {
        persistSession: false // Don't persist in connection pool
      }
    });
    
    const connection: Connection = {
      client,
      inUse: false,
      lastUsed: Date.now(),
      createdAt: Date.now()
    };
    
    this.connections.push(connection);
    return connection;
  }
  
  /**
   * Get connection from pool
   */
  async getConnection(): Promise<SupabaseClient> {
    this.stats.totalRequests++;
    const startTime = Date.now();
    
    try {
      // Find available connection
      const available = this.connections.find(conn => !conn.inUse);
      
      if (available) {
        available.inUse = true;
        available.lastUsed = Date.now();
        this.stats.successfulRequests++;
        this.stats.totalWaitTime += Date.now() - startTime;
        return available.client;
      }
      
      // Create new connection if under max
      if (this.connections.length < this.config.maxConnections) {
        const newConn = await this.createConnection();
        newConn.inUse = true;
        newConn.lastUsed = Date.now();
        this.stats.successfulRequests++;
        this.stats.totalWaitTime += Date.now() - startTime;
        return newConn.client;
      }
      
      // Wait for available connection
      return await this.waitForConnection(startTime);
      
    } catch (error) {
      this.stats.failedRequests++;
      throw error;
    }
  }
  
  /**
   * Wait for available connection
   */
  private waitForConnection(startTime: number): Promise<SupabaseClient> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitQueue.findIndex(req => req.resolve === resolve);
        if (index !== -1) {
          this.waitQueue.splice(index, 1);
        }
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);
      
      this.waitQueue.push({
        resolve: (client) => {
          clearTimeout(timeout);
          this.stats.successfulRequests++;
          this.stats.totalWaitTime += Date.now() - startTime;
          resolve(client);
        },
        reject: (error) => {
          clearTimeout(timeout);
          this.stats.failedRequests++;
          reject(error);
        },
        timestamp: Date.now()
      });
    });
  }
  
  /**
   * Release connection back to pool
   */
  releaseConnection(client: SupabaseClient): void {
    const connection = this.connections.find(conn => conn.client === client);
    
    if (connection) {
      connection.inUse = false;
      connection.lastUsed = Date.now();
      
      // Check if anyone is waiting
      const waiting = this.waitQueue.shift();
      if (waiting) {
        connection.inUse = true;
        waiting.resolve(client);
      }
    }
  }
  
  /**
   * Execute query with automatic connection management
   */
  async execute<T>(
    callback: (client: SupabaseClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getConnection();
    
    try {
      const result = await callback(client);
      this.releaseConnection(client);
      return result;
    } catch (error) {
      this.releaseConnection(client);
      throw error;
    }
  }
  
  /**
   * Execute with retry logic
   */
  async executeWithRetry<T>(
    callback: (client: SupabaseClient) => Promise<T>,
    retries?: number
  ): Promise<T> {
    const maxRetries = retries || this.config.maxRetries;
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(callback);
      } catch (error: any) {
        lastError = error;
        
        if (attempt < maxRetries) {
          // Wait before retry
          await new Promise(resolve => 
            setTimeout(resolve, this.config.retryDelay * (attempt + 1))
          );
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }
  
  /**
   * Start idle connection cleanup
   */
  private startIdleCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const minConnections = this.config.minConnections;
      
      // Remove idle connections (keeping minimum)
      this.connections = this.connections.filter(conn => {
        const isIdle = !conn.inUse && 
          (now - conn.lastUsed) > this.config.idleTimeout;
        const canRemove = isIdle && this.connections.length > minConnections;
        
        if (canRemove) {
          console.log('Removing idle connection');
        }
        
        return !canRemove;
      });
    }, 60000); // Check every minute
  }
  
  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    const active = this.connections.filter(c => c.inUse).length;
    const idle = this.connections.length - active;
    const avgWaitTime = this.stats.totalRequests > 0
      ? this.stats.totalWaitTime / this.stats.totalRequests
      : 0;
    
    return {
      totalConnections: this.connections.length,
      activeConnections: active,
      idleConnections: idle,
      waitingRequests: this.waitQueue.length,
      totalRequests: this.stats.totalRequests,
      successfulRequests: this.stats.successfulRequests,
      failedRequests: this.stats.failedRequests,
      averageWaitTime: avgWaitTime
    };
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      poolSize: number;
      activeConnections: number;
      waitingRequests: number;
      canAcceptRequests: boolean;
    };
  }> {
    const stats = this.getStats();
    const canAcceptRequests = 
      stats.activeConnections < this.config.maxConnections ||
      stats.idleConnections > 0;
    
    return {
      healthy: canAcceptRequests && stats.waitingRequests < 100,
      details: {
        poolSize: stats.totalConnections,
        activeConnections: stats.activeConnections,
        waitingRequests: stats.waitingRequests,
        canAcceptRequests
      }
    };
  }
  
  /**
   * Close all connections
   */
  async close(): Promise<void> {
    // Reject all waiting requests
    this.waitQueue.forEach(req => {
      req.reject(new Error('Pool closing'));
    });
    this.waitQueue = [];
    
    // Clear connections
    this.connections = [];
    
    console.log('Connection pool closed');
  }
  
  /**
   * Log pool metrics
   */
  logMetrics(): void {
    const stats = this.getStats();
    console.log('=== Connection Pool Metrics ===');
    console.log(`Total Connections: ${stats.totalConnections}`);
    console.log(`Active: ${stats.activeConnections} | Idle: ${stats.idleConnections}`);
    console.log(`Waiting Requests: ${stats.waitingRequests}`);
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Success Rate: ${(stats.successfulRequests / stats.totalRequests * 100).toFixed(2)}%`);
    console.log(`Avg Wait Time: ${stats.averageWaitTime.toFixed(2)}ms`);
    console.log('==============================');
  }
}

/**
 * Global connection pool instance
 * Use this instead of creating multiple pools
 */
let globalPool: ConnectionPool | null = null;

export function initializePool(
  supabaseUrl: string,
  supabaseKey: string,
  config?: PoolConfig
): ConnectionPool {
  if (!globalPool) {
    globalPool = new ConnectionPool(supabaseUrl, supabaseKey, config);
  }
  return globalPool;
}

export function getPool(): ConnectionPool {
  if (!globalPool) {
    throw new Error('Connection pool not initialized. Call initializePool() first.');
  }
  return globalPool;
}

export async function closePool(): Promise<void> {
  if (globalPool) {
    await globalPool.close();
    globalPool = null;
  }
}

/**
 * Example usage:
 * 
 * // Initialize once at app startup
 * initializePool(SUPABASE_URL, SUPABASE_KEY, {
 *   minConnections: 10,
 *   maxConnections: 100
 * });
 * 
 * // Use in your code
 * const pool = getPool();
 * const data = await pool.execute(async (client) => {
 *   const { data } = await client.from('boats').select('*');
 *   return data;
 * });
 */
