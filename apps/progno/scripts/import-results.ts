/**
 * Import Game Results from Various Sources
 * Can import from JSON, CSV, or merge with existing data
 */

import fs from 'fs';
import path from 'path';

interface GameResult {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  homeScore: number;
  awayScore: number;
  spread?: number;
  total?: number;
  homeCovered?: boolean;
  overHit?: boolean;
  winner: string;
}

function loadExistingResults(): Record<string, GameResult[]> {
  const prognoDir = path.join(process.cwd(), '.progno');
  const file = path.join(prognoDir, '2024-results-all-sports.json');
  
  if (!fs.existsSync(file)) {
    return {};
  }

  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load existing results:', error);
    return {};
  }
}

function saveResults(results: Record<string, GameResult[]>): void {
  const prognoDir = path.join(process.cwd(), '.progno');
  if (!fs.existsSync(prognoDir)) {
    fs.mkdirSync(prognoDir, { recursive: true });
  }

  const file = path.join(prognoDir, '2024-results-all-sports.json');
  fs.writeFileSync(file, JSON.stringify(results, null, 2), 'utf8');
  console.log(`✅ Results saved to ${file}`);
}

function importFromJSON(filePath: string): GameResult[] {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed.results && Array.isArray(parsed.results)) {
      return parsed.results;
    } else if (parsed.games && Array.isArray(parsed.games)) {
      return parsed.games;
    }
    
    console.warn('Unexpected JSON structure');
    return [];
  } catch (error) {
    console.error(`Failed to import from ${filePath}:`, error);
    return [];
  }
}

function importFromCSV(filePath: string): GameResult[] {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const results: GameResult[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      // Map CSV columns to GameResult
      const result: GameResult = {
        id: row.id || row.game_id || `${row.sport}_${row.date}_${i}`,
        sport: row.sport || 'NFL',
        homeTeam: row.home_team || row.homeTeam || '',
        awayTeam: row.away_team || row.awayTeam || '',
        date: row.date || row.game_date || '',
        homeScore: Number(row.home_score || row.homeScore || 0),
        awayScore: Number(row.away_score || row.awayScore || 0),
        spread: row.spread ? Number(row.spread) : undefined,
        total: row.total ? Number(row.total) : undefined,
        winner: row.winner || ''
      };
      
      if (!result.winner && result.homeScore > 0 && result.awayScore > 0) {
        result.winner = result.homeScore > result.awayScore ? result.homeTeam : result.awayTeam;
      }
      
      if (result.homeTeam && result.awayTeam && result.homeScore >= 0 && result.awayScore >= 0) {
        results.push(result);
      }
    }
    
    return results;
  } catch (error) {
    console.error(`Failed to import from CSV ${filePath}:`, error);
    return [];
  }
}

function mergeResults(
  existing: Record<string, GameResult[]>,
  newResults: GameResult[]
): Record<string, GameResult[]> {
  const merged = { ...existing };
  
  for (const result of newResults) {
    const sport = result.sport;
    if (!merged[sport]) {
      merged[sport] = [];
    }
    
    // Check if game already exists
    const exists = merged[sport].some(r => 
      r.id === result.id ||
      (r.homeTeam === result.homeTeam && 
       r.awayTeam === result.awayTeam && 
       r.date === result.date)
    );
    
    if (!exists) {
      merged[sport].push(result);
    }
  }
  
  return merged;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: tsx import-results.ts <file1> [file2] ...');
    console.log('Supports JSON and CSV files');
    console.log('\nExample:');
    console.log('  tsx import-results.ts data/nfl-2024.json data/nba-2024.csv');
    process.exit(1);
  }
  
  console.log('=== Importing Game Results ===\n');
  
  const existing = loadExistingResults();
  let totalImported = 0;
  
  for (const filePath of args) {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      continue;
    }
    
    console.log(`Importing from ${filePath}...`);
    
    const ext = path.extname(filePath).toLowerCase();
    let newResults: GameResult[] = [];
    
    if (ext === '.json') {
      newResults = importFromJSON(filePath);
    } else if (ext === '.csv') {
      newResults = importFromCSV(filePath);
    } else {
      console.warn(`⚠️  Unsupported file type: ${ext}`);
      continue;
    }
    
    if (newResults.length > 0) {
      const beforeCount = Object.values(existing).reduce((sum, arr) => sum + arr.length, 0);
      const merged = mergeResults(existing, newResults);
      const afterCount = Object.values(merged).reduce((sum, arr) => sum + arr.length, 0);
      const added = afterCount - beforeCount;
      
      Object.assign(existing, merged);
      totalImported += added;
      
      console.log(`  ✅ Imported ${added} new games (${newResults.length} total in file)`);
    } else {
      console.log(`  ⚠️  No valid games found in file`);
    }
  }
  
  if (totalImported > 0) {
    saveResults(existing);
    
    console.log(`\n=== Summary ===`);
    console.log(`Total games imported: ${totalImported}`);
    for (const [sport, results] of Object.entries(existing)) {
      console.log(`  ${sport}: ${results.length} games`);
    }
  } else {
    console.log('\n⚠️  No new games imported');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

