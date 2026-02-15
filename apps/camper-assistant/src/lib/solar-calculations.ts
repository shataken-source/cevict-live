// Solar calculations and utilities for camper solar systems

export interface SolarData {
  currentWatts: number;
  voltage: number;
  current: number;
  dailyKwh: number;
  efficiency: number;
}

export interface BatteryData {
  percentage: number;
  voltage: number;
  current: number;
  temperature: number;
  timeRemaining: number;
  cycles: number;
  health: number;
  cells: CellData[];
}

export interface CellData {
  id: number;
  voltage: number;
  temperature: number;
}

// Calculate optimal solar panel tilt angle based on latitude and season
export function calculateOptimalTilt(
  latitude: number,
  season: 'spring' | 'summer' | 'fall' | 'winter' = 'spring'
): number {
  const seasonalAdjustments: Record<string, number> = {
    spring: 0,
    summer: -15,
    fall: 0,
    winter: +15,
  };

  return Math.round(latitude + seasonalAdjustments[season]);
}

// Estimate daily solar production based on panel wattage and location
export function estimateDailyProduction(
  panelWatts: number,
  sunHours: number = 5,
  efficiency: number = 0.85
): number {
  return Math.round(panelWatts * sunHours * efficiency) / 1000; // Return kWh
}

// Calculate battery time remaining
export function calculateTimeRemaining(
  capacityAh: number,
  currentPercentage: number,
  currentDraw: number
): number {
  if (currentDraw <= 0) return Infinity;
  const remainingAh = (capacityAh * currentPercentage) / 100;
  return Math.round((remainingAh / Math.abs(currentDraw)) * 10) / 10;
}

// Get battery status color
export function getBatteryColor(percentage: number): string {
  if (percentage > 60) return '#34d399'; // green
  if (percentage > 20) return '#fbbf24'; // amber
  return '#fb7185'; // red
}

// Estimate solar panel efficiency based on tilt and sun angle
export function calculatePanelEfficiency(
  tiltAngle: number,
  optimalTilt: number
): number {
  const diff = Math.abs(tiltAngle - optimalTilt);
  // Efficiency drops about 1% per degree of misalignment
  return Math.max(50, 100 - diff);
}
