/**
 * Script to scrape all 50 US states starting from each capital
 * Processes 250 cities per state using the bulk-scrape-all-platforms API
 * Enhanced with eye candy: progress bars, memory monitoring, colorful output!
 * 
 * Run with: npx tsx scripts/scrape-all-states.ts
 * Or: pnpm tsx scripts/scrape-all-states.ts
 */

import * as os from 'os';
import * as process from 'process';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
const API_ENDPOINT = `${BASE_URL}/api/petreunion/city-expansion-crawler`;

// ANSI color codes for terminal colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

function colorize(text: string, color: string): string {
  return `${color}${text}${colors.reset}`;
}

function getMemoryUsage() {
  const total = os.totalmem() / 1024 / 1024 / 1024; // GB
  const free = os.freemem() / 1024 / 1024 / 1024; // GB
  const used = total - free;
  const percent = (used / total) * 100;
  
  return {
    total: Math.round(total * 100) / 100,
    used: Math.round(used * 100) / 100,
    free: Math.round(free * 100) / 100,
    percent: Math.round(percent * 10) / 10,
  };
}

function getCPUUsage(): Promise<number> {
  return new Promise((resolve) => {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    resolve(usage);
  });
}

function createProgressBar(percent: number, length: number = 50): string {
  const filled = Math.floor((percent / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function printHeader(text: string) {
  console.log('');
  console.log(colorize('╔' + '═'.repeat(78) + '╗', colors.cyan));
  const padding = Math.floor((78 - text.length) / 2);
  console.log(
    colorize('║', colors.cyan) +
    ' '.repeat(padding) +
    colorize(text, colors.yellow) +
    ' '.repeat(78 - padding - text.length) +
    colorize('║', colors.cyan)
  );
  console.log(colorize('╚' + '═'.repeat(78) + '╝', colors.cyan));
}

// State capitals mapping
const STATE_CAPITALS: Record<string, string> = {
  'Alabama': 'Montgomery',
  'Alaska': 'Juneau',
  'Arizona': 'Phoenix',
  'Arkansas': 'Little Rock',
  'California': 'Sacramento',
  'Colorado': 'Denver',
  'Connecticut': 'Hartford',
  'Delaware': 'Dover',
  'Florida': 'Tallahassee',
  'Georgia': 'Atlanta',
  'Hawaii': 'Honolulu',
  'Idaho': 'Boise',
  'Illinois': 'Springfield',
  'Indiana': 'Indianapolis',
  'Iowa': 'Des Moines',
  'Kansas': 'Topeka',
  'Kentucky': 'Frankfort',
  'Louisiana': 'Baton Rouge',
  'Maine': 'Augusta',
  'Maryland': 'Annapolis',
  'Massachusetts': 'Boston',
  'Michigan': 'Lansing',
  'Minnesota': 'St. Paul',
  'Mississippi': 'Jackson',
  'Missouri': 'Jefferson City',
  'Montana': 'Helena',
  'Nebraska': 'Lincoln',
  'Nevada': 'Carson City',
  'New Hampshire': 'Concord',
  'New Jersey': 'Trenton',
  'New Mexico': 'Santa Fe',
  'New York': 'Albany',
  'North Carolina': 'Raleigh',
  'North Dakota': 'Bismarck',
  'Ohio': 'Columbus',
  'Oklahoma': 'Oklahoma City',
  'Oregon': 'Salem',
  'Pennsylvania': 'Harrisburg',
  'Rhode Island': 'Providence',
  'South Carolina': 'Columbia',
  'South Dakota': 'Pierre',
  'Tennessee': 'Nashville',
  'Texas': 'Austin',
  'Utah': 'Salt Lake City',
  'Vermont': 'Montpelier',
  'Virginia': 'Richmond',
  'Washington': 'Olympia',
  'West Virginia': 'Charleston',
  'Wisconsin': 'Madison',
  'Wyoming': 'Cheyenne',
};

interface StateResult {
  state: string;
  capital: string;
  citiesProcessed: number;
  sheltersDiscovered: number;
  petsSaved: number;
  duration: number;
  success: boolean;
  error?: string;
}

async function scrapeState(state: string, capital: string, index: number, total: number): Promise<StateResult> {
  const startTime = Date.now();

  try {
    console.log(colorize('  🚀 Starting scraper...', colors.yellow));
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startCity: capital,
        startState: state,
        maxCities: 250,
        delayBetweenCities: 5,
      }),
    });

    const data = await response.json();
    const duration = (Date.now() - startTime) / 1000 / 60; // minutes

    if (data.success) {
      const petsSaved = data.summary?.totalPetsSaved || 0;
      
      // Success output is handled in main() loop now
      return {
        state,
        capital,
        citiesProcessed: data.summary?.totalCitiesProcessed || 0,
        sheltersDiscovered: data.summary?.sheltersDiscovered || 0,
        petsSaved,
        duration: parseFloat(duration.toFixed(2)),
        success: true,
      };
    } else {
      return {
        state,
        capital,
        citiesProcessed: 0,
        sheltersDiscovered: 0,
        petsSaved: 0,
        duration: 0,
        success: false,
        error: data.error || 'Unknown error',
      };
    }
  } catch (error: any) {
    const duration = (Date.now() - startTime) / 1000 / 60;
    return {
      state,
      capital,
      citiesProcessed: 0,
      sheltersDiscovered: 0,
      petsSaved: 0,
      duration: parseFloat(duration.toFixed(2)),
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  const states = Object.keys(STATE_CAPITALS).sort();
  
  // Clear screen and show header
  console.clear();
  printHeader('🐕 PetReunion - All States Scraper 🚀');
  
  // Initial system stats
  const initialMem = getMemoryUsage();
  const startTime = Date.now();
  
  console.log(colorize('📊 SYSTEM INFORMATION', colors.magenta));
  console.log(colorize('━'.repeat(78), colors.gray));
  console.log(
    colorize('💾 Total RAM:     ', colors.white) +
    colorize(`${initialMem.total} GB`, colors.green)
  );
  console.log(
    colorize('📈 RAM Used:      ', colors.white) +
    colorize(
      `${initialMem.used} GB (${initialMem.percent}%)`,
      initialMem.percent > 80 ? colors.red : initialMem.percent > 60 ? colors.yellow : colors.green
    )
  );
  console.log(
    colorize('🆓 RAM Free:      ', colors.white) +
    colorize(`${initialMem.free} GB`, colors.green)
  );
  console.log('');
  
  console.log(colorize('📋 SCRAPING PLAN', colors.magenta));
  console.log(colorize('━'.repeat(78), colors.gray));
  console.log(
    colorize('🗺️  Total States:     ', colors.white) +
    colorize(`${states.length}`, colors.cyan) +
    colorize(' states', colors.white)
  );
  console.log(
    colorize('🏙️  Cities per State:  ', colors.white) +
    colorize('250', colors.cyan) +
    colorize(' cities', colors.white)
  );
  console.log(
    colorize('🌆 Total Cities:      ', colors.white) +
    colorize(`${states.length * 250}`, colors.cyan) +
    colorize(' cities', colors.white)
  );
  const estHours = Math.round((states.length * 250 * 5) / 3600 * 10) / 10;
  console.log(
    colorize('⏱️  Est. Time:        ', colors.white) +
    colorize(`${estHours} hours`, colors.yellow)
  );
  console.log('');
  
  console.log(colorize('🎯 STARTING SCRAPER...', colors.green));
  console.log(colorize('━'.repeat(78), colors.gray));
  console.log('');

  const results: StateResult[] = [];
  let totalPets = 0;

  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    const capital = STATE_CAPITALS[state];
    const progress = Math.round(((i + 1) / states.length) * 100 * 10) / 10;
    const progressBar = createProgressBar(progress);
    
    // System stats
    const mem = getMemoryUsage();
    const cpu = await getCPUUsage();
    const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
    const avgTimePerState = i > 0 ? elapsed / i : 0;
    const remainingStates = states.length - (i + 1);
    const eta = avgTimePerState > 0 ? Math.round(remainingStates * avgTimePerState * 10) / 10 : 0;
    
    // Beautiful state header
    console.log('');
    console.log(colorize('┌' + '─'.repeat(78) + '┐', colors.cyan));
    console.log(
      colorize('│', colors.cyan) +
      colorize(` STATE ${i + 1}/${states.length} `, colors.yellow) +
      colorize(`(${progress}%)`, colors.white) +
      ' '.repeat(60 - state.length - capital.length) +
      colorize('│', colors.cyan)
    );
    console.log(colorize('├' + '─'.repeat(78) + '┤', colors.cyan));
    console.log(
      colorize('│', colors.cyan) +
      colorize(' 🗺️  State: ', colors.white) +
      colorize(state, colors.green) +
      colorize('  │  🏛️  Capital: ', colors.white) +
      colorize(capital, colors.cyan)
    );
    console.log(colorize('│', colors.cyan));
    console.log(
      colorize('│', colors.cyan) +
      colorize(' Progress: ', colors.white) +
      colorize(
        progressBar,
        progress > 75 ? colors.green : progress > 50 ? colors.yellow : colors.cyan
      ) +
      colorize(` ${progress}%`, colors.white)
    );
    console.log(colorize('│', colors.cyan));
    console.log(
      colorize('│', colors.cyan) +
      colorize(' 💾 RAM: ', colors.white) +
      colorize(
        `${mem.used}GB / ${mem.total}GB (${mem.percent}%)`,
        mem.percent > 80 ? colors.red : mem.percent > 60 ? colors.yellow : colors.green
      ) +
      colorize('  │  🔥 CPU: ', colors.white) +
      colorize(
        `${cpu}%`,
        cpu > 80 ? colors.red : cpu > 60 ? colors.yellow : colors.green
      )
    );
    const elapsedHours = Math.floor(elapsed / 60);
    const elapsedMins = Math.round(elapsed % 60);
    console.log(
      colorize('│', colors.cyan) +
      colorize(' ⏱️  Elapsed: ', colors.white) +
      colorize(`${elapsedHours}h ${elapsedMins}m`, colors.cyan) +
      colorize('  │  ⏳ ETA: ', colors.white) +
      colorize(`${Math.round(eta / 60 * 10) / 10}h`, colors.yellow)
    );
    console.log(colorize('└' + '─'.repeat(78) + '┘', colors.cyan));
    
    const result = await scrapeState(state, capital, i, states.length);
    results.push(result);
    
    if (result.success) {
      totalPets += result.petsSaved;
      
      // Enhanced success output
      console.log(colorize('  ✅ SUCCESS!', colors.green));
      console.log(
        colorize('     🏙️  Cities: ', colors.white) +
        colorize(`${result.citiesProcessed}`, colors.cyan)
      );
      console.log(
        colorize('     🏠 Shelters: ', colors.white) +
        colorize(`${result.sheltersDiscovered}`, colors.cyan)
      );
      console.log(
        colorize('     🐕 Pets Saved: ', colors.white) +
        colorize(`${result.petsSaved}`, colors.green)
      );
      console.log(
        colorize('     ⏱️  Duration: ', colors.white) +
        colorize(`${result.duration} min`, colors.yellow)
      );
      console.log(
        colorize('     📊 Total So Far: ', colors.white) +
        colorize(`${totalPets} pets`, colors.magenta)
      );
    } else {
      console.log(
        colorize('  ❌ FAILED: ', colors.red) +
        colorize(result.error || 'Unknown error', colors.red)
      );
    }

    // Small delay between states to avoid overwhelming the server
    if (i < states.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final Summary with Eye Candy
  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1000 / 60; // minutes
  const finalMem = getMemoryUsage();
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log('');
  printHeader('🎉 FINAL SUMMARY 🎉');
  
  console.log(colorize('📊 OVERALL STATISTICS', colors.magenta));
  console.log(colorize('━'.repeat(78), colors.gray));
  console.log(
    colorize('✅ Total States Processed: ', colors.white) +
    colorize(`${results.length}`, colors.cyan)
  );
  console.log(
    colorize('🎯 Successful: ', colors.white) +
    colorize(`${successCount}`, colors.green)
  );
  console.log(
    colorize('❌ Failed: ', colors.white) +
    colorize(`${failCount}`, failCount > 0 ? colors.red : colors.green)
  );
  console.log(
    colorize('🐕 Total Pets Saved: ', colors.white) +
    colorize(`${totalPets}`, colors.green) +
    colorize(' pets! 🎊', colors.magenta)
  );
  const totalHours = Math.floor(totalDuration / 60);
  const totalMins = Math.round(totalDuration % 60);
  console.log(
    colorize('⏱️  Total Duration: ', colors.white) +
    colorize(`${totalHours} hours ${totalMins} minutes`, colors.cyan)
  );
  console.log(
    colorize('💾 Final RAM Usage: ', colors.white) +
    colorize(
      `${finalMem.used}GB / ${finalMem.total}GB (${finalMem.percent}%)`,
      finalMem.percent > 80 ? colors.red : finalMem.percent > 60 ? colors.yellow : colors.green
    )
  );
  console.log('');
  
  // Top 10 States
  console.log(colorize('🏆 TOP 10 STATES BY PETS SAVED', colors.magenta));
  console.log(colorize('━'.repeat(78), colors.gray));
  const topStates = results
    .filter(r => r.success)
    .sort((a, b) => b.petsSaved - a.petsSaved)
    .slice(0, 10);
  
  topStates.forEach((result, index) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
    console.log(
      colorize(`${medal} #${rank} `, colors.yellow) +
      colorize(`${result.state} `, colors.green) +
      colorize(`(${result.capital}): `, colors.gray) +
      colorize(`${result.petsSaved} pets`, colors.cyan) +
      colorize(' | ', colors.gray) +
      colorize(`${result.citiesProcessed} cities`, colors.white) +
      colorize(' | ', colors.gray) +
      colorize(`${result.duration} min`, colors.yellow)
    );
  });
  console.log('');
  
  // Save results to JSON file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const fs = require('fs');
  const resultsFile = `scrape-all-states-results-${timestamp}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  console.log(
    colorize('💾 Results saved to: ', colors.white) +
    colorize(resultsFile, colors.cyan)
  );
  console.log('');
  console.log(colorize('✨ Scraping complete! Check your database for all the pets! ✨', colors.green));
  console.log('');
}

main().catch(console.error);

