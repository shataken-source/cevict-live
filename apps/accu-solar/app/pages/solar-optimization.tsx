/**
 * SOLAR OPTIMIZATION PAGE - Complete Integration
 * Ready to drop into: app/pages/solar-optimization.tsx or app/solar-optimization/page.tsx
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  SolarCommandDashboard,
  MobileStatusBar,
  MobileActionBar,
} from "@/app/components/SolarDashboard";

/**
 * Example integration with real data
 */
export default function SolarOptimizationPage() {
  const [batterySOC, setBatterySOC] = useState(67);
  const [systemStatus, setSystemStatus] = useState<"charging" | "discharging" | "idle">(
    "charging"
  );

  // Mock data - replace with real API calls
  const tiltData = {
    latitude: 30.2672,
    annualOptimal: 25,
    winterOptimal: 40,
    summerOptimal: 15,
    currentTilt: 25,
  };

  const chargeWindowData = {
    peakStartHour: 12,
    peakEndHour: 14,
    expectedSOCPercent: 92,
    expectedTimeToFull: "3h 20m",
  };

  const shadingData = {
    averageLossPercent: 12,
    monthlyImpact: [
      { month: "Jan", lossPercent: 18 },
      { month: "Feb", lossPercent: 17 },
      { month: "Mar", lossPercent: 14 },
      { month: "Apr", lossPercent: 10 },
      { month: "May", lossPercent: 8 },
      { month: "Jun", lossPercent: 7 },
      { month: "Jul", lossPercent: 7 },
      { month: "Aug", lossPercent: 8 },
      { month: "Sep", lossPercent: 10 },
      { month: "Oct", lossPercent: 13 },
      { month: "Nov", lossPercent: 16 },
      { month: "Dec", lossPercent: 18 },
    ],
    recommendations: [
      "Moderate shading from afternoon trees.",
      "Consider microinverters for better performance.",
      "Seasonal pruning could reduce loss by 3%.",
    ],
  };

  return (
    <div className="bg-gray-50">
      {/* Mobile Status Bar */}
      <MobileStatusBar
        batterySOC={batterySOC}
        systemStatus={systemStatus}
        timeToFull={chargeWindowData.expectedTimeToFull}
      />

      {/* Main Dashboard */}
      <div className="pb-24 md:pb-0">
        <SolarCommandDashboard
          tilt={tiltData}
          chargeWindow={chargeWindowData}
          shading={shadingData}
        />

        {/* Extra Insights Section */}
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-6 md:py-8">
          <div className="bg-white rounded-lg p-4 md:p-6 shadow-sm">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
              📈 Today's Summary
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <StatBox label="Solar Output" value="12.4 kWh" status="good" />
              <StatBox label="Grid Draw" value="2.1 kWh" status="neutral" />
              <StatBox label="Self-Consumption" value="85%" status="good" />
              <StatBox label="Efficiency" value="92%" status="good" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Action Bar */}
      <MobileActionBar
        onOptimize={() => console.log("Optimize clicked")}
        onAdvised={() => console.log("AI Advisor clicked")}
      />
    </div>
  );
}

// ============================================================================
// STAT BOX COMPONENT
// ============================================================================

interface StatBoxProps {
  label: string;
  value: string;
  status?: "good" | "warning" | "danger" | "neutral";
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, status = "neutral" }) => {
  const colors = {
    good: "text-emerald-600 bg-emerald-50",
    warning: "text-amber-600 bg-amber-50",
    danger: "text-red-600 bg-red-50",
    neutral: "text-gray-600 bg-gray-50",
  };

  return (
    <div className={`rounded-lg p-3 md:p-4 ${colors[status]}`}>
      <div className="text-xs md:text-sm font-medium opacity-75">{label}</div>
      <div className="text-lg md:text-2xl font-bold mt-1">{value}</div>
    </div>
  );
};
