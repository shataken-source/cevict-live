'use client';

import { useState } from 'react';

interface ReportResult {
  type: string;
  data: any;
  generatedAt: string;
}

interface ReportsSectionProps {
  secret: string;
  date: string;
}

export default function ReportsSection({ secret, date }: ReportsSectionProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [report, setReport] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runReport = async (reportType: string) => {
    setLoading(reportType);
    setError(null);
    setReport(null);
    
    try {
      const response = await fetch('/api/progno/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          secret: secret.trim(), 
          reportType,
          date 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Report failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      setReport({ type: reportType, data, generatedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(null);
    }
  };

  const exportToCSV = () => {
    if (!report) return;
    
    let csvContent = '';
    
    if (report.type === 'performance-by-sport') {
      csvContent = 'Sport,Wins,Losses,Pushes,Win Rate,Total Bets\n';
      report.data.sports.forEach((s: any) => {
        csvContent += `${s.sport},${s.wins},${s.losses},${s.pushes},${s.winRate}%,${s.total}\n`;
      });
    } else if (report.type === 'value-bets-analysis') {
      csvContent = 'Edge Range,Wins,Losses,Win Rate,Total Bets,Profit/Loss\n';
      report.data.ranges.forEach((r: any) => {
        csvContent += `${r.range},${r.wins},${r.losses},${r.winRate}%,${r.total},$${r.profit}\n`;
      });
    } else if (report.type === 'confidence-vs-results') {
      csvContent = 'Confidence Range,Wins,Losses,Win Rate,Total Bets\n';
      report.data.ranges.forEach((r: any) => {
        csvContent += `${r.range},${r.wins},${r.losses},${r.winRate}%,${r.total}\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cevict-report-${report.type}-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => runReport('performance-by-sport')}
          disabled={loading === 'performance-by-sport' || !secret.trim()}
          style={{
            padding: '12px 16px',
            background: loading === 'performance-by-sport' ? '#ccc' : '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {loading === 'performance-by-sport' ? 'Running…' : '🏆 Performance by Sport'}
        </button>
        
        <button
          onClick={() => runReport('value-bets-analysis')}
          disabled={loading === 'value-bets-analysis' || !secret.trim()}
          style={{
            padding: '12px 16px',
            background: loading === 'value-bets-analysis' ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {loading === 'value-bets-analysis' ? 'Running…' : '💰 Value Bets Analysis'}
        </button>
        
        <button
          onClick={() => runReport('confidence-vs-results')}
          disabled={loading === 'confidence-vs-results' || !secret.trim()}
          style={{
            padding: '12px 16px',
            background: loading === 'confidence-vs-results' ? '#ccc' : '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {loading === 'confidence-vs-results' ? 'Running…' : '📊 Confidence vs Results'}
        </button>
        
        <button
          onClick={() => runReport('monthly-summary')}
          disabled={loading === 'monthly-summary' || !secret.trim()}
          style={{
            padding: '12px 16px',
            background: loading === 'monthly-summary' ? '#ccc' : '#fd7e14',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {loading === 'monthly-summary' ? 'Running…' : '📅 Monthly Summary'}
        </button>
        
        <button
          onClick={() => runReport('streak-analysis')}
          disabled={loading === 'streak-analysis' || !secret.trim()}
          style={{
            padding: '12px 16px',
            background: loading === 'streak-analysis' ? '#ccc' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {loading === 'streak-analysis' ? 'Running…' : '🔥 Streak Analysis'}
        </button>
        
        <button
          onClick={() => runReport('roi-by-odds-range')}
          disabled={loading === 'roi-by-odds-range' || !secret.trim()}
          style={{
            padding: '12px 16px',
            background: loading === 'roi-by-odds-range' ? '#ccc' : '#20c997',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {loading === 'roi-by-odds-range' ? 'Running…' : '📈 ROI by Odds Range'}
        </button>
      </div>
      
      {error && (
        <div style={{ 
          padding: '12px', 
          background: '#ffe6e6', 
          borderRadius: '6px', 
          color: '#c00',
          marginBottom: '16px'
        }}>
          Error: {error}
        </div>
      )}
      
      {report && (
        <div style={{ 
          padding: '20px', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, textTransform: 'capitalize' }}>
              {report.type.replace(/-/g, ' ')}
            </h3>
            <button
              onClick={exportToCSV}
              style={{
                padding: '8px 14px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              ⬇️ Export CSV
            </button>
          </div>
          
          <pre style={{ 
            background: 'white', 
            padding: '16px', 
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '13px',
            maxHeight: '400px'
          }}>
            {JSON.stringify(report.data, null, 2)}
          </pre>
          
          <p style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
            Generated: {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
