'use client';

import React, { useState, useEffect } from 'react';
import { getTelemetryHistorySummary } from '@/app/lib/solar-core/supabaseService';

interface TelemetryTrend {
  date: string;
  production: number;
  load: number;
  battery_soc: number;
  efficiency: number;
}

interface ProHistoricalAnalyticsProps {
  userId: string;
  siteId: string;
  userTier: 'basic' | 'pro';
}

export function ProHistoricalAnalytics({
  userId,
  siteId,
  userTier,
}: ProHistoricalAnalyticsProps) {
  const [data, setData] = useState<TelemetryTrend[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(30);

  const maxDays = userTier === 'pro' ? 90 : 30;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await getTelemetryHistorySummary(userId, siteId, selectedDays);
        setSummary(result);

        // Generate mock data for demo (in production, fetch from API)
        const mockData = generateMockData(selectedDays);
        setData(mockData);
      } catch (err) {
        console.error('Failed to load historical data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, siteId, selectedDays]);

  const handleDownloadCSV = async () => {
    try {
      const csv = generateCSV(data);
      downloadFile(csv, `solar-history-${selectedDays}d.csv`, 'text/csv');
    } catch (err) {
      console.error('Failed to download CSV:', err);
      alert('❌ Failed to download data');
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-600">📊 Loading historical data...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">📈 Historical Analytics</h2>
        {userTier === 'basic' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-300 rounded">
            <span className="text-lg">ℹ️</span>
            <span className="text-sm text-blue-700">30-day history (upgrade for 90 days)</span>
          </div>
        )}
      </div>

      {/* Time Period Selector */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setSelectedDays(7)}
          className={`px-4 py-2 rounded font-semibold ${
            selectedDays === 7
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          7 Days
        </button>
        <button
          onClick={() => setSelectedDays(30)}
          className={`px-4 py-2 rounded font-semibold ${
            selectedDays === 30
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          30 Days
        </button>
        {userTier === 'pro' && (
          <button
            onClick={() => setSelectedDays(90)}
            className={`px-4 py-2 rounded font-semibold ${
              selectedDays === 90
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            90 Days (PRO)
          </button>
        )}
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-blue-50 p-4 rounded border border-green-200">
            <p className="text-xs text-gray-600 mb-1">Total Production</p>
            <p className="text-2xl font-bold text-green-600">
              {Math.round(summary.avgProduction * selectedDays) / 1000}
            </p>
            <p className="text-xs text-gray-500 mt-2">kWh total</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded border border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Daily Average</p>
            <p className="text-2xl font-bold text-blue-600">{Math.round(summary.avgProduction / 1000 * 10) / 10}</p>
            <p className="text-xs text-gray-500 mt-2">kWh/day</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded border border-yellow-200">
            <p className="text-xs text-gray-600 mb-1">Peak Production</p>
            <p className="text-2xl font-bold text-yellow-600">
              {Math.round(summary.peakProduction / 1000 * 10) / 10}
            </p>
            <p className="text-xs text-gray-500 mt-2">kW peak</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded border border-purple-200">
            <p className="text-xs text-gray-600 mb-1">Data Points</p>
            <p className="text-2xl font-bold text-purple-600">{summary.totalRecords}</p>
            <p className="text-xs text-gray-500 mt-2">records logged</p>
          </div>
        </div>
      )}

      {/* Production Trend Chart - Simple Table */}
      <div className="mb-8 bg-gray-50 p-6 rounded border border-gray-200">
        <h3 className="font-bold text-lg text-gray-900 mb-4">📊 Production Trend (Last 7 Days)</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-right">Production (kWh)</th>
              <th className="p-2 text-right">Battery SOC</th>
              <th className="p-2 text-right">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(-7).map((row, idx) => (
              <tr key={idx} className="border-b">
                <td className="p-2">{row.date}</td>
                <td className="p-2 text-right">{Math.round(row.production / 1000 * 10) / 10}</td>
                <td className="p-2 text-right">{Math.round(row.battery_soc)}%</td>
                <td className="p-2 text-right">{Math.round(row.efficiency * 10) / 10}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Battery SOC vs Load - Simple Table */}
      <div className="mb-8 bg-gray-50 p-6 rounded border border-gray-200">
        <h3 className="font-bold text-lg text-gray-900 mb-4">🔋 Battery & Load Pattern</h3>
        <p className="text-sm text-gray-600 mb-4">Average values across {selectedDays} days</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded border border-blue-200">
            <p className="text-xs text-gray-600 mb-2">Avg Battery SOC</p>
            <p className="text-2xl font-bold text-blue-600">{Math.round(data.reduce((a, b) => a + b.battery_soc, 0) / data.length)}%</p>
          </div>
          <div className="bg-white p-4 rounded border border-orange-200">
            <p className="text-xs text-gray-600 mb-2">Avg Load</p>
            <p className="text-2xl font-bold text-orange-600">{Math.round(data.reduce((a, b) => a + b.load, 0) / data.length / 1000 * 10) / 10}kW</p>
          </div>
        </div>
      </div>

      {/* System Efficiency - Simple Bar Display */}
      <div className="mb-8 bg-gray-50 p-6 rounded border border-gray-200">
        <h3 className="font-bold text-lg text-gray-900 mb-4">⚡ System Efficiency Trend</h3>
        <div className="space-y-2">
          {data.slice(-7).map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-20 text-sm text-gray-600">{row.date}</span>
              <div className="flex-1 bg-gray-300 rounded h-8 overflow-hidden">
                <div
                  className="bg-green-500 h-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ width: `${row.efficiency}%` }}
                >
                  {Math.round(row.efficiency)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded border border-blue-200">
        <h3 className="font-bold text-lg text-gray-900 mb-4">💡 Insights</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">✓</span>
            <span>
              Your system averaged <strong>{Math.round(summary.avgProduction / 1000 * 10) / 10} kWh/day</strong> over
              the last {selectedDays} days.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">✓</span>
            <span>
              Peak production reached <strong>{Math.round(summary.peakProduction / 1000 * 10) / 10} kW</strong>, typically
              during midday hours.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">✓</span>
            <span>System efficiency has been stable. Monitor for any sudden drops which may indicate maintenance needs.</span>
          </li>
        </ul>
      </div>

      {/* Download Data */}
      <div className="flex gap-3">
        <button
          onClick={handleDownloadCSV}
          className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg flex items-center justify-center gap-2"
        >
          ⬇️
          Download as CSV
        </button>
        {userTier !== 'pro' && (
          <div className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-lg flex items-center justify-center">
            📄 Excel Export (PRO)
          </div>
        )}
      </div>

      {/* Pro Upgrade Hint */}
      {userTier === 'basic' && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded">
          <p className="text-sm text-yellow-900">
            <strong>💡 Tip:</strong> Upgrade to Pro to access <strong>90-day history</strong>, export to Excel, and
            custom analytics.
          </p>
        </div>
      )}
    </div>
  );
}

function generateMockData(days: number): TelemetryTrend[] {
  const data = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      production: 12000 + Math.random() * 8000 + Math.sin((days - i) / 10) * 4000,
      load: 8000 + Math.random() * 6000,
      battery_soc: 60 + Math.random() * 30,
      efficiency: 73 + Math.random() * 5,
    });
  }

  return data;
}

function generateCSV(data: TelemetryTrend[]): string {
  const headers = ['Date', 'Production (W)', 'Load (W)', 'Battery SOC (%)', 'Efficiency (%)'];
  const rows = data.map((row) => [
    row.date,
    Math.round(row.production),
    Math.round(row.load),
    Math.round(row.battery_soc),
    Math.round(row.efficiency * 100) / 100,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
