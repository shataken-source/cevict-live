'use client';

import React, { useState } from 'react';
import {
  calculateScenarioResults,
  calculateOptimalTilt,
  checkVoltageWarnings,
  type SystemConfig,
  type ScenarioResults,
  type ColdWeatherWarning,
} from '@/app/lib/solar-core/scenarioCalculator';

interface ProScenarioBuilderProps {
  siteId: string;
  userId: string;
  currentSystem: SystemConfig;
  onScenarioSave?: (scenario: {
    name: string;
    description: string;
    config: SystemConfig;
    results: ScenarioResults;
  }) => void;
}

export function ProScenarioBuilder({
  siteId,
  userId,
  currentSystem,
  onScenarioSave,
}: ProScenarioBuilderProps) {
  const [scenarioName, setScenarioName] = useState('What-If Scenario');
  const [scenarioDescription, setScenarioDescription] = useState('');
  
  // Modified configuration
  const [proposedPanelCount, setProposedPanelCount] = useState(currentSystem.panelCount);
  const [proposedTiltAngle, setProposedTiltAngle] = useState(currentSystem.tiltAngleDegrees);
  const [proposedBatteryCapacity, setProposedBatteryCapacity] = useState(
    currentSystem.batteryCapacityAh
  );
  const [proposedControllerMaxVoc, setProposedControllerMaxVoc] = useState(
    currentSystem.controllerMaxVocV
  );

  const [results, setResults] = useState<ScenarioResults | null>(null);
  const [voltageWarnings, setVoltageWarnings] = useState<ColdWeatherWarning[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const tiltOptimal = calculateOptimalTilt(currentSystem.latitude);

  const handleCalculate = () => {
    const proposedSystem: SystemConfig = {
      ...currentSystem,
      panelCount: proposedPanelCount,
      tiltAngleDegrees: proposedTiltAngle,
      batteryCapacityAh: proposedBatteryCapacity,
      controllerMaxVocV: proposedControllerMaxVoc,
    };

    const calculatedResults = calculateScenarioResults(
      currentSystem,
      proposedSystem,
      currentSystem.latitude,
      currentSystem.longitude
    );

    setResults(calculatedResults);
    setVoltageWarnings(calculatedResults.coldWeatherWarnings);
  };

  const handleSaveScenario = async () => {
    if (!results) return;

    setIsSaving(true);
    try {
      const proposedSystem: SystemConfig = {
        ...currentSystem,
        panelCount: proposedPanelCount,
        tiltAngleDegrees: proposedTiltAngle,
        batteryCapacityAh: proposedBatteryCapacity,
        controllerMaxVocV: proposedControllerMaxVoc,
      };

      if (onScenarioSave) {
        onScenarioSave({
          name: scenarioName,
          description: scenarioDescription,
          config: proposedSystem,
          results,
        });
      }

      // TODO: Save to Supabase via API
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          siteId,
          name: scenarioName,
          description: scenarioDescription,
          baseConfig: currentSystem,
          proposedConfig: proposedSystem,
          results,
        }),
      });

      if (response.ok) {
        alert('✅ Scenario saved successfully!');
        setScenarioName('What-If Scenario');
        setScenarioDescription('');
      }
    } catch (err) {
      console.error('Failed to save scenario:', err);
      alert('❌ Failed to save scenario');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">🧪 Build Your Scenario</h2>

      {/* Scenario Metadata */}
      <div className="mb-8 p-4 bg-gray-50 rounded border border-gray-200">
        <input
          type="text"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          placeholder="Scenario name (e.g., 'Winter Optimization')"
          className="w-full mb-3 px-3 py-2 border border-gray-300 rounded"
        />
        <textarea
          value={scenarioDescription}
          onChange={(e) => setScenarioDescription(e.target.value)}
          placeholder="Optional description"
          className="w-full px-3 py-2 border border-gray-300 rounded"
          rows={2}
        />
      </div>

      {/* Adjustment Controls */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Panel Count */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Panel Count
            <span className="text-gray-500 text-xs ml-2">Current: {currentSystem.panelCount}</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setProposedPanelCount(Math.max(1, proposedPanelCount - 2))}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              -
            </button>
            <input
              type="number"
              value={proposedPanelCount}
              onChange={(e) => setProposedPanelCount(parseInt(e.target.value) || 1)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-center"
            />
            <button
              onClick={() => setProposedPanelCount(proposedPanelCount + 2)}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
            >
              +
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Total: {(proposedPanelCount * currentSystem.panelWattage) / 1000}kW
          </p>
        </div>

        {/* Tilt Angle */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tilt Angle (degrees)
            <span className="text-gray-500 text-xs ml-2">Current: {currentSystem.tiltAngleDegrees}°</span>
          </label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setProposedTiltAngle(Math.max(0, proposedTiltAngle - 5))}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              -
            </button>
            <input
              type="number"
              value={proposedTiltAngle}
              onChange={(e) => setProposedTiltAngle(Math.max(0, Math.min(90, parseInt(e.target.value) || 0)))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-center"
            />
            <button
              onClick={() => setProposedTiltAngle(Math.min(90, proposedTiltAngle + 5))}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
            >
              +
            </button>
          </div>
          <div className="text-xs text-blue-600 font-semibold">
            📌 Optimal Annual: {tiltOptimal.annualOptimal}° | Winter: {tiltOptimal.winterOptimal}° | Summer:{' '}
            {tiltOptimal.summerOptimal}°
          </div>
        </div>

        {/* Battery Capacity */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Battery Capacity (Ah)
            <span className="text-gray-500 text-xs ml-2">Current: {currentSystem.batteryCapacityAh}Ah</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setProposedBatteryCapacity(Math.max(10, proposedBatteryCapacity - 50))}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              -
            </button>
            <input
              type="number"
              value={proposedBatteryCapacity}
              onChange={(e) => setProposedBatteryCapacity(parseInt(e.target.value) || 1)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-center"
            />
            <button
              onClick={() => setProposedBatteryCapacity(proposedBatteryCapacity + 50)}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
            >
              +
            </button>
          </div>
        </div>

        {/* Controller Max Voc */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Controller Max Voc (V)
            <span className="text-gray-500 text-xs ml-2">Current: {currentSystem.controllerMaxVocV}V</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setProposedControllerMaxVoc(Math.max(400, proposedControllerMaxVoc - 50))}
              className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            >
              -
            </button>
            <input
              type="number"
              value={proposedControllerMaxVoc}
              onChange={(e) => setProposedControllerMaxVoc(parseInt(e.target.value) || 400)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-center"
            />
            <button
              onClick={() => setProposedControllerMaxVoc(proposedControllerMaxVoc + 50)}
              className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <button
        onClick={handleCalculate}
        className="w-full mb-8 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2"
      >
        📈
        Calculate Scenario
      </button>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Voltage Warnings */}
          {voltageWarnings.length > 0 && (
            <div className="space-y-2">
              {voltageWarnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded flex gap-3 ${
                    warning.severity === 'danger'
                      ? 'bg-red-50 border border-red-300'
                      : warning.severity === 'warning'
                        ? 'bg-yellow-50 border border-yellow-300'
                        : 'bg-blue-50 border border-blue-300'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0 mt-1">
                    {warning.severity === 'danger' || warning.severity === 'warning'
                      ? '⚠️'
                      : '✅'}
                  </span>
                  <div>
                    <p className="font-bold text-gray-900">{warning.title}</p>
                    <p className="text-sm text-gray-700 mt-1">{warning.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Production Comparison */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded border border-green-200">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Production Impact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Annual Production</p>
                <p className="text-2xl font-bold text-green-600">
                  {results.annualProductionKWh.toLocaleString()} kWh
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {results.annualProductionKWh > currentSystem.panelCount * currentSystem.panelWattage * 8
                    ? '📈 +' + (results.annualProductionKWh - currentSystem.panelCount * currentSystem.panelWattage * 8) + ' kWh'
                    : '📉 No change'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Grid Independence</p>
                <p className="text-2xl font-bold text-blue-600">{results.gridIndependencePct}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Payback Period</p>
                <p className="text-2xl font-bold text-indigo-600">{results.paybackYears} years</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">20-Year ROI</p>
                <p className="text-2xl font-bold text-green-600">
                  ${results.twentyYearROI.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveScenario}
            disabled={isSaving}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold rounded-lg"
          >
            {isSaving ? '💾 Saving...' : '💾 Save Scenario'}
          </button>
        </div>
      )}
    </div>
  );
}
