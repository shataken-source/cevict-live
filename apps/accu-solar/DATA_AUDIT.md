# Accu Solar - Complete Data Audit & Frontend Redesign

## All Available Data Sources

### 1. TELEMETRY (19 fields)
```typescript
export type Telemetry = {
  ts: string;                           // Timestamp
  system_status: "normal" | "charging" | "discharging" | "fault";
  solar_w: number;                      // Current solar production (Watts)
  load_w: number;                       // Current load consumption (Watts)
  grid_w: number;                       // Grid flow (+ import, - export)
  battery_soc_pct: number;              // State of Charge %
  battery_v: number;                    // Battery voltage
  battery_a: number;                    // Battery current (+ charge, - discharge)
  battery_temp_c: number;               // Battery temperature (°C)
  battery_soh_pct: number;              // State of Health %
  ttg_hours: number | null;             // Time to Go (hours until empty/full)
  daily_solar_kwh: number;              // Daily solar yield
  daily_load_kwh: number;               // Daily consumption
  daily_grid_import_kwh: number;        // Daily grid import
  daily_grid_export_kwh: number;        // Daily grid export
  self_consumption_pct: number | null; // Self-consumption rate
  savings_today_usd: number | null;     // Today's savings
};
```

### 2. AI RECOMMENDATIONS ENGINE
**File:** `app/lib/ai-recommendations.ts`
- Generates intelligent recommendations based on telemetry + weather + latitude
- Severity levels: critical, warning, info
- Recommendation types:
  - Solar conditions assessment
  - Battery state warnings (low SoC, temperature)
  - Tilt angle guidance by season
  - Adjustable tilt ROI calculations

### 3. SOLAR IMPACT SCORING
**File:** `app/lib/solar-impact.ts`
- Score 0-100 based on weather conditions
- Factors: cloud cover, temperature, snow depth, air quality
- Classifications: OPTIMAL (85+), MODERATE (60-84), REDUCED (30-59), POOR (<30)

### 4. TILT OPTIMIZATION
**File:** `app/lib/tilt-optimizer.ts`
- Calculates optimal tilt angles by season
- Adjustable gain estimates (6% twice yearly, 10% seasonal)
- ROI calculations for adjustable mounts

### 5. CHARGE WINDOW PREDICTION
**File:** `app/lib/charge-window.ts`
- Peak harvest window detection
- Hourly production estimation
- Battery SOC simulation over time

### 6. SHADING LOSS MODELING
**File:** `app/lib/solar-core/shadingLoss.service.ts`
- Calculates shading impact by time of day
- Monthly impact breakdown
- Optimizer ROI recommendations
- Scenario comparison (no action vs microinverters vs relocation)

### 7. SCENARIO CALCULATOR
**File:** `app/lib/solar-core/scenarioCalculator.ts`
- Cold weather voltage warnings
- Production estimates (annual, seasonal)
- Financial calculations (payback, 20-year ROI)
- System configuration validation

## Frontend Redesign Plan

### New Tab Structure:
1. **OVERVIEW** - Combined dashboard with all key metrics
2. **TELEMETRY** - Raw system data display
3. **OPTIMIZATION** - Solar calculations and recommendations
4. **WEATHER** - Solar impact and forecasts
5. **ANALYTICS** - Scenarios, ROI, shading analysis
6. **AI INSIGHTS** - AI-generated recommendations
7. **CONTROLS** - BLE, location, battery config

### Data Display Strategy:
- **Overview Tab:** All telemetry in card grid + AI recommendations
- **Telemetry Tab:** Detailed system status + battery health + grid flow
- **Optimization Tab:** Tilt angles, charge windows, adjustable ROI
- **Weather Tab:** Solar impact score, forecast, production estimate
- **Analytics Tab:** Shading loss, scenario comparison, payback calculations
- **AI Insights Tab:** Full recommendation list with explanations
