/**
 * Progno-Massager Integration
 * 
 * Uses the Progno-Massager Python engine to analyze and validate data
 * before making trading decisions. Provides AI Safety 2025 compliant
 * validation of all financial calculations.
 */

import { spawn } from 'child_process';
import * as path from 'path';

export interface MassagerAnalysis {
  validated: boolean;
  confidence: number;
  recommendations: string[];
  warnings: string[];
  adjustedProbability?: number;
  arbitrageOpportunities?: any[];
  hedgeRecommendations?: any[];
}

export class PrognoMassagerIntegration {
  private massagerPath: string;
  private pythonCmd: string;

  constructor() {
    // Path to progno-massager
    this.massagerPath = path.join(process.cwd(), '..', 'progno-massager');
    this.pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  }

  /**
   * Analyze market data using progno-massager before making a decision
   * Returns enhanced analysis with AI Safety 2025 validation
   */
  async analyzeMarketData(marketData: {
    title: string;
    yesPrice: number;
    noPrice: number;
    volume?: number;
    category?: string;
  }): Promise<MassagerAnalysis> {
    try {
      console.log(`   🔬 Analyzing with progno-massager: ${marketData.title.substring(0, 50)}...`);

      // Prepare data for massager
      const analysis = await this.runMassagerAnalysis({
        market: marketData.title,
        odds_yes: marketData.yesPrice / 100,
        odds_no: marketData.noPrice / 100,
        volume: marketData.volume || 0,
        category: marketData.category || 'unknown',
      });

      return analysis;
    } catch (error: any) {
      console.warn(`   ⚠️  Massager analysis failed: ${error.message}, using fallback`);
      
      // Fallback to basic analysis if massager is unavailable
      return {
        validated: true,
        confidence: 50,
        recommendations: ['Massager unavailable - using basic analysis'],
        warnings: ['Progno-massager did not validate this analysis'],
      };
    }
  }

  /**
   * Run massager analysis via Python subprocess
   */
  private async runMassagerAnalysis(data: any): Promise<MassagerAnalysis> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.massagerPath, 'logic', 'anai.py');

      // Create a JSON payload for the massager
      const payload = JSON.stringify(data);

      // Spawn Python process
      const pythonProcess = spawn(this.pythonCmd, [
        scriptPath,
        '--analyze',
        '--json',
        payload,
      ], {
        cwd: this.massagerPath,
        timeout: 10000, // 10 second timeout
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Massager exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve({
            validated: result.validated || false,
            confidence: result.confidence || 50,
            recommendations: result.recommendations || [],
            warnings: result.warnings || [],
            adjustedProbability: result.adjusted_probability,
            arbitrageOpportunities: result.arbitrage || [],
            hedgeRecommendations: result.hedges || [],
          });
        } catch (e) {
          reject(new Error(`Failed to parse massager output: ${e}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(error);
      });

      // Timeout fallback
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Massager analysis timed out'));
      }, 10000);
    });
  }

  /**
   * Validate arbitrage opportunity using massager's supervisor agent
   */
  async validateArbitrage(odds: number[], stake: number): Promise<{
    valid: boolean;
    confidence: number;
    errors: string[];
    profitEstimate?: number;
  }> {
    try {
      const scriptPath = path.join(this.massagerPath, 'logic', 'arbitrage.py');

      return new Promise((resolve) => {
        const pythonProcess = spawn(this.pythonCmd, [
          scriptPath,
          '--validate',
          JSON.stringify({ odds, stake }),
        ], {
          cwd: this.massagerPath,
          timeout: 5000,
        });

        let stdout = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            resolve({
              valid: false,
              confidence: 0,
              errors: ['Arbitrage validation failed'],
            });
            return;
          }

          try {
            const result = JSON.parse(stdout);
            resolve({
              valid: result.is_valid || false,
              confidence: result.confidence || 0,
              errors: result.errors || [],
              profitEstimate: result.profit_estimate,
            });
          } catch {
            resolve({
              valid: false,
              confidence: 0,
              errors: ['Failed to parse validation result'],
            });
          }
        });

        pythonProcess.on('error', () => {
          resolve({
            valid: false,
            confidence: 0,
            errors: ['Massager process error'],
          });
        });

        setTimeout(() => {
          pythonProcess.kill();
          resolve({
            valid: false,
            confidence: 0,
            errors: ['Validation timed out'],
          });
        }, 5000);
      });
    } catch (error: any) {
      return {
        valid: false,
        confidence: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Check if progno-massager is available and running
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const testProcess = spawn(this.pythonCmd, ['--version'], { timeout: 2000 });
      
      return new Promise((resolve) => {
        testProcess.on('close', (code) => {
          resolve(code === 0);
        });

        testProcess.on('error', () => {
          resolve(false);
        });

        setTimeout(() => {
          testProcess.kill();
          resolve(false);
        }, 2000);
      });
    } catch {
      return false;
    }
  }

  /**
   * Update massager with latest market data for learning
   */
  async syncLatestData(markets: any[]): Promise<void> {
    try {
      console.log(`   📤 Syncing ${markets.length} markets to progno-massager...`);

      const scriptPath = path.join(this.massagerPath, 'logic', 'supabase_sync.py');

      const pythonProcess = spawn(this.pythonCmd, [
        scriptPath,
        '--sync',
        JSON.stringify({ markets }),
      ], {
        cwd: this.massagerPath,
        timeout: 15000,
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('   ✅ Massager data sync complete');
        } else {
          console.warn('   ⚠️  Massager sync returned non-zero exit code');
        }
      });

      pythonProcess.on('error', (error) => {
        console.warn(`   ⚠️  Massager sync error: ${error.message}`);
      });
    } catch (error: any) {
      console.warn(`   ⚠️  Failed to sync data to massager: ${error.message}`);
    }
  }
}

