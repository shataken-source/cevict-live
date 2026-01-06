'use client';

/**
 * Legislation Tracker Component
 * Real-time tracking of smoking/vaping legislation
 * Unique competitive advantage
 */

import { useState, useEffect } from 'react';
import {
  fetchStateLegislation,
  fetchLegislationAlerts,
  LegislationBill,
  LegislationAlert,
  getStatusColor,
  getImpactColor,
  getAlertLevelColor,
} from '@/lib/legislation-tracker';
import { ALL_STATES } from '@/lib/states';

interface Props {
  initialState?: string;
}

export default function LegislationTracker({ initialState = 'GA' }: Props) {
  const [selectedState, setSelectedState] = useState(initialState);
  const [bills, setBills] = useState<LegislationBill[]>([]);
  const [alerts, setAlerts] = useState<LegislationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<LegislationBill | null>(null);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'positive' | 'negative'>('all');

  useEffect(() => {
    loadData();
  }, [selectedState]);

  const loadData = async () => {
    setLoading(true);
    const [billsData, alertsData] = await Promise.all([
      fetchStateLegislation(selectedState),
      fetchLegislationAlerts([selectedState]),
    ]);
    setBills(billsData);
    setAlerts(alertsData);
    setLoading(false);
  };

  const filteredBills = bills.filter(bill => {
    if (filter === 'all') return true;
    if (filter === 'urgent') return bill.alertLevel === 'urgent';
    if (filter === 'positive') return bill.impact === 'positive';
    if (filter === 'negative') return bill.impact === 'negative';
    return true;
  });

  const getStatusText = (status: LegislationBill['status']) => {
    const statusMap: Record<string, string> = {
      introduced: 'Introduced',
      committee: 'In Committee',
      passed_house: 'Passed House',
      passed_senate: 'Passed Senate',
      signed: 'Signed into Law',
      vetoed: 'Vetoed',
      dead: 'Dead',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚖️</span>
            <div>
              <h2 className="text-2xl font-bold">Legislation Tracker</h2>
              <p className="text-blue-100">Real-time smoking & vaping bills</p>
            </div>
          </div>
          {alerts.length > 0 && (
            <div className="bg-red-500 px-3 py-1 rounded-full text-sm font-bold animate-pulse">
              {alerts.length} New Alert{alerts.length > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* State Selector */}
        <div className="mt-4">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            {ALL_STATES.map((state) => (
              <option key={state.code} value={state.code} className="text-slate-900">
                {state.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="text-sm font-bold text-red-700 mb-2">🚨 Active Alerts</div>
          <div className="space-y-2">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="text-sm text-red-800">
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 border-b border-slate-200 flex gap-2 overflow-x-auto">
        {(['all', 'urgent', 'positive', 'negative'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === f
                ? f === 'urgent' ? 'bg-red-600 text-white' :
                  f === 'positive' ? 'bg-green-600 text-white' :
                  f === 'negative' ? 'bg-red-600 text-white' :
                  'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? '📋 All Bills' :
             f === 'urgent' ? '🚨 Urgent' :
             f === 'positive' ? '👍 Pro-Smoker' :
             '👎 Anti-Smoker'}
          </button>
        ))}
      </div>

      {/* Bills List */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading legislation...</p>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <div className="text-4xl mb-2">📭</div>
          <p>No active legislation matching your filters</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredBills.map(bill => (
            <div
              key={bill.id}
              onClick={() => setSelectedBill(bill)}
              className="p-4 hover:bg-slate-50 cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getAlertLevelColor(bill.alertLevel)}`}>
                      {bill.alertLevel.toUpperCase()}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{bill.billNumber}</span>
                  </div>
                  <h3 className="font-medium text-slate-900 mb-1">{bill.title}</h3>
                  <p className="text-sm text-slate-600 line-clamp-2">{bill.summary}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                      {getStatusText(bill.status)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getImpactColor(bill.impact)}`}>
                      {bill.impact === 'positive' ? '👍 Pro-Smoker' :
                       bill.impact === 'negative' ? '👎 Anti-Smoker' :
                       'Neutral'}
                    </span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bill Detail Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getAlertLevelColor(selectedBill.alertLevel)}`}>
                    {selectedBill.alertLevel.toUpperCase()}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">{selectedBill.billNumber}</h2>
                  <h3 className="text-lg text-slate-700">{selectedBill.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm font-medium text-slate-500 mb-1">Summary</div>
                <p className="text-slate-700">{selectedBill.summary}</p>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-500 mb-1">Impact on Smokers</div>
                <div className={`p-3 rounded-lg ${
                  selectedBill.impact === 'positive' ? 'bg-green-50 text-green-800' :
                  selectedBill.impact === 'negative' ? 'bg-red-50 text-red-800' :
                  'bg-slate-50 text-slate-800'
                }`}>
                  {selectedBill.impactDescription}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Status</div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedBill.status)}`}>
                    {getStatusText(selectedBill.status)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Category</div>
                  <span className="text-slate-700 capitalize">{selectedBill.category.replace(/_/g, ' ')}</span>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-500 mb-1">Sponsors</div>
                <div className="flex flex-wrap gap-1">
                  {selectedBill.sponsors.map(sponsor => (
                    <span key={sponsor} className="px-2 py-1 bg-slate-100 rounded-full text-sm text-slate-700">
                      {sponsor}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-500 mb-1">Last Action</div>
                <p className="text-slate-700">{selectedBill.lastAction}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(selectedBill.lastActionDate).toLocaleDateString()}
                </p>
              </div>

              {selectedBill.votes && (
                <div>
                  <div className="text-sm font-medium text-slate-500 mb-1">Votes</div>
                  {selectedBill.votes.house && (
                    <div className="text-sm text-slate-700">
                      House: {selectedBill.votes.house.yea} Yea - {selectedBill.votes.house.nay} Nay
                    </div>
                  )}
                  {selectedBill.votes.senate && (
                    <div className="text-sm text-slate-700">
                      Senate: {selectedBill.votes.senate.yea} Yea - {selectedBill.votes.senate.nay} Nay
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex gap-2">
              <button className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all">
                📢 Take Action
              </button>
              <button className="px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 transition-all">
                🔔 Track
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

