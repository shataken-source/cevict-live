import React from "react";
import type { ScenarioResults } from "@/app/lib/solar-core/scenarioCalculator";

interface GraphicsReportProps {
  title: string;
  systemName: string;
  generatedDate: string;
  currentResults: ScenarioResults;
  proposedResults?: ScenarioResults;
  monthlyData?: Array<{ month: string; production: number; forecast: number }>;
}

export function GraphicsReportHTML({
  title,
  systemName,
  generatedDate,
  currentResults,
  proposedResults,
  monthlyData = generateSampleMonthlyData(),
}: GraphicsReportProps) {
  return (
    <div className="w-full bg-white text-gray-900" id="graphics-report">
      {/* PAGE 1: Executive Summary */}
      <div className="page-break p-12 border-b-4 border-gray-200">
        {/* Header */}
        <div className="mb-12 border-b-2 border-green-500 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">☀️ {title}</h1>
          <p className="text-xl text-gray-600 mb-2">{systemName}</p>
          <p className="text-sm text-gray-500">Generated: {generatedDate}</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-green-600 mb-6 pb-2 border-b border-gray-200">
            📊 Key Performance Metrics
          </h2>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-100 p-6 rounded">
              <p className="text-xs text-gray-600 mb-2 font-semibold">Annual Production</p>
              <p className="text-3xl font-bold text-gray-900">
                {currentResults.annualProductionKWh.toLocaleString()}
                <span className="text-lg text-gray-500 ml-2">kWh</span>
              </p>
            </div>

            <div className="bg-gray-100 p-6 rounded">
              <p className="text-xs text-gray-600 mb-2 font-semibold">Daily Average</p>
              <p className="text-3xl font-bold text-gray-900">
                {currentResults.dailyAverageKWh}
                <span className="text-lg text-gray-500 ml-2">kWh</span>
              </p>
            </div>

            <div className="bg-gray-100 p-6 rounded">
              <p className="text-xs text-gray-600 mb-2 font-semibold">Grid Independence</p>
              <p className="text-3xl font-bold text-blue-600">{currentResults.gridIndependencePct}%</p>
            </div>

            <div className="bg-gray-100 p-6 rounded">
              <p className="text-xs text-gray-600 mb-2 font-semibold">Self-Consumption</p>
              <p className="text-3xl font-bold text-blue-600">{currentResults.selfConsumptionPct}%</p>
            </div>
          </div>

          {/* Grid Independence Pie Chart Replacement */}
          <div className="bg-white p-6 rounded border border-gray-200 mb-8">
            <p className="text-center text-lg font-bold text-gray-900 mb-4">
              <span className="text-green-600">{currentResults.gridIndependencePct}%</span> Solar / 
              <span className="text-red-600 ml-2">{100 - currentResults.gridIndependencePct}%</span> Grid
            </p>
            <div className="flex gap-2">
              <div
                className="bg-green-500 rounded h-12"
                style={{ width: `${currentResults.gridIndependencePct}%` }}
              ></div>
              <div
                className="bg-red-500 rounded h-12"
                style={{ width: `${100 - currentResults.gridIndependencePct}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-green-600 mb-6 pb-2 border-b border-gray-200">
            💰 Financial Summary
          </h2>

          <div className="bg-indigo-100 border-l-4 border-indigo-600 p-6 rounded mb-6">
            <p className="text-sm text-indigo-700 mb-2 font-semibold">20-Year Return on Investment</p>
            <p className="text-4xl font-bold text-indigo-600">
              ${currentResults.twentyYearROI.toLocaleString()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-100 p-6 rounded">
              <p className="text-xs text-gray-600 mb-2 font-semibold">Annual Savings</p>
              <p className="text-3xl font-bold text-green-600">
                ${currentResults.annualSavings.toLocaleString()}
              </p>
            </div>

            <div className="bg-gray-100 p-6 rounded">
              <p className="text-xs text-gray-600 mb-2 font-semibold">Payback Period</p>
              <p className="text-3xl font-bold text-gray-900">
                {currentResults.paybackYears}
                <span className="text-lg text-gray-500 ml-2">years</span>
              </p>
            </div>
          </div>
        </div>

        {/* Voltage Safety */}
        <div>
          <h2 className="text-2xl font-bold text-green-600 mb-6 pb-2 border-b border-gray-200">
            ⚡ Voltage Safety Check
          </h2>

          {currentResults.coldWeatherWarnings.map((warning, idx) => {
            if (warning.severity === "info" && warning.type === "voc_safe") {
              return (
                <div key={idx} className="bg-green-50 border-l-4 border-green-600 p-4 rounded mb-4">
                  <p className="font-bold text-green-900 mb-2">{warning.title}</p>
                  <p className="text-sm text-green-800">{warning.message}</p>
                </div>
              );
            }

            return (
              <div key={idx} className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded mb-4">
                <p className="font-bold text-yellow-900 mb-2">{warning.title}</p>
                <p className="text-sm text-yellow-800">{warning.message}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* PAGE 2: Seasonal Analysis */}
      <div className="page-break p-12">
        <div className="mb-12 border-b-2 border-green-500 pb-6">
          <h1 className="text-3xl font-bold text-gray-900">📈 Seasonal Analysis</h1>
        </div>

        <div className="mb-12">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Seasonal Production Breakdown</h3>
          <table className="w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 text-left font-bold">Season</th>
                <th className="p-3 text-right font-bold">Production</th>
                <th className="p-3 text-right font-bold">% of Annual</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3">Summer (May-Aug)</td>
                <td className="p-3 text-right">{currentResults.summerProductionKWh.toLocaleString()} kWh</td>
                <td className="p-3 text-right font-bold">
                  {((currentResults.summerProductionKWh / currentResults.annualProductionKWh) * 100).toFixed(0)}%
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-3">Winter (Nov-Feb)</td>
                <td className="p-3 text-right">{currentResults.winterProductionKWh.toLocaleString()} kWh</td>
                <td className="p-3 text-right font-bold">
                  {((currentResults.winterProductionKWh / currentResults.annualProductionKWh) * 100).toFixed(0)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {proposedResults && (
          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded">
            <h3 className="text-lg font-bold text-blue-900 mb-4">Upgrade Impact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-blue-700 mb-2 font-semibold">Production Increase</p>
                <p className="text-2xl font-bold text-blue-900">
                  +{proposedResults.annualProductionKWh - currentResults.annualProductionKWh} kWh/yr
                </p>
              </div>
              <div>
                <p className="text-xs text-blue-700 mb-2 font-semibold">New Payback</p>
                <p className="text-2xl font-bold text-blue-900">{proposedResults.paybackYears} years</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PAGE 3: Recommendations */}
      <div className="page-break p-12">
        <div className="mb-12 border-b-2 border-green-500 pb-6">
          <h1 className="text-3xl font-bold text-gray-900">🎯 Recommendations</h1>
        </div>

        <div className="space-y-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-600 p-6 rounded">
            <h3 className="font-bold text-yellow-900 mb-2 text-lg">1. Tilt Angle Optimization</h3>
            <p className="text-sm text-yellow-800">
              Consider adjustable mounting to optimize for seasonal peaks.
            </p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-600 p-6 rounded">
            <h3 className="font-bold text-yellow-900 mb-2 text-lg">2. Cold Weather Voltage</h3>
            <p className="text-sm text-yellow-800">
              Ensure protection systems are properly configured for winter.
            </p>
          </div>

          <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded">
            <h3 className="font-bold text-green-900 mb-2 text-lg">✅ System Status</h3>
            <p className="text-sm text-green-800">Your system is operating efficiently.</p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-300 text-center text-xs text-gray-600">
          <p>Generated by Accu Solar Command on {generatedDate}</p>
        </div>
      </div>
    </div>
  );
}

function generateSampleMonthlyData() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.map((month, idx) => ({
    month,
    production: Math.round(500 + Math.sin((idx / 12) * Math.PI * 2) * 300 + Math.random() * 100),
    forecast: Math.round(550 + Math.sin((idx / 12) * Math.PI * 2) * 280),
  }));
}
