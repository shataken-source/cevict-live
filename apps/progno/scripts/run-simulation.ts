/**
 * Run Simulation Script
 * Executes the 2024 simulation and tuning process
 */

import { SimulationEngine } from './simulate-2024';

async function run() {
  console.log('🎲 PROGNO 2024 Simulation and Tuning');
  console.log('=====================================\n');

  const simulator = new SimulationEngine();
  
  try {
    // Load 2024 data
    await simulator.load2024Data();
    
    // Run simulations until 90% win rate
    await simulator.runSimulations(90);
    
    console.log('\n✅ Simulation complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

run();

