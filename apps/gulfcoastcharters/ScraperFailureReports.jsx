import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Download, RefreshCw, Eye, Filter } from 'lucide-react';

const ScraperFailureReports = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'failures', 'incomplete'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('scraper_failure_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setReports(data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = (report) => {
    const data = {
      timestamp: report.run_timestamp,
      summary: {
        totalFailures: report.total_failures,
        totalIncomplete: report.total_incomplete,
      },
      failures: report.failures,
      incompleteBoats: report.incomplete_boats,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraper-report-${new Date(report.run_timestamp).toISOString()}.json`;
    a.click();
  };

  const exportCSV = (report) => {
    // Create CSV for incomplete boats
    const headers = ['Name', 'Location', 'Captain', 'Phone', 'Email', 'Boat Type', 'Length', 'Missing Fields'];
    const rows = report.incomplete_boats.map(boat => [
      boat.name || '',
      boat.location || '',
      boat.captain || '',
      boat.phone || '',
      boat.email || '',
      boat.boat_type || '',
      boat.length || '',
      boat.missingFields?.join(', ') || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incomplete-boats-${new Date(report.run_timestamp).toISOString()}.csv`;
    a.click();
  };

  const getFilteredData = (report) => {
    if (filterType === 'failures') {
      return report.failures || [];
    } else if (filterType === 'incomplete') {
      return report.incomplete_boats || [];
    } else {
      return [...(report.failures || []), ...(report.incomplete_boats || [])];
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <AlertTriangle className="w-8 h-8 mr-3 text-yellow-600" />
                Scraper Failure Reports
              </h1>
              <p className="text-gray-600 mt-2">
                Review incomplete and failed boat discoveries
              </p>
            </div>
            <button
              onClick={loadReports}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-600 font-medium">Total Reports</p>
              <p className="text-3xl font-bold text-yellow-900">{reports.length}</p>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600 font-medium">Total Failures</p>
              <p className="text-3xl font-bold text-red-900">
                {reports.reduce((sum, r) => sum + (r.total_failures || 0), 0)}
              </p>
            </div>
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-600 font-medium">Incomplete Boats</p>
              <p className="text-3xl font-bold text-orange-900">
                {reports.reduce((sum, r) => sum + (r.total_incomplete || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Reports</h2>
          
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Failures!</h3>
              <p className="text-gray-600">All scraper runs have been successful.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold mr-3 ${
                          report.mode === 'auto' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {report.mode}
                        </span>
                        <span className="text-sm text-gray-600">
                          {new Date(report.run_timestamp).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Sources</p>
                          <p className="font-semibold text-gray-900">
                            {report.sources?.join(', ') || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Failures</p>
                          <p className="font-semibold text-red-600">
                            {report.total_failures || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Incomplete</p>
                          <p className="font-semibold text-orange-600">
                            {report.total_incomplete || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Total Issues</p>
                          <p className="font-semibold text-gray-900">
                            {(report.total_failures || 0) + (report.total_incomplete || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportReport(report);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Export JSON"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportCSV(report);
                        }}
                        className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Export CSV"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <Eye className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedReport?.id === report.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      {/* Filter Buttons */}
                      <div className="flex items-center space-x-2 mb-4">
                        <Filter className="w-5 h-5 text-gray-600" />
                        <button
                          onClick={() => setFilterType('all')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'all'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          All ({(report.total_failures || 0) + (report.total_incomplete || 0)})
                        </button>
                        <button
                          onClick={() => setFilterType('failures')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'failures'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Failures ({report.total_failures || 0})
                        </button>
                        <button
                          onClick={() => setFilterType('incomplete')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterType === 'incomplete'
                              ? 'bg-orange-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Incomplete ({report.total_incomplete || 0})
                        </button>
                      </div>

                      {/* Failures */}
                      {filterType !== 'incomplete' && report.failures && report.failures.length > 0 && (
                        <div className="mb-6">
                          <h3 className="font-semibold text-red-900 mb-3 flex items-center">
                            <XCircle className="w-5 h-5 mr-2" />
                            Complete Failures ({report.failures.length})
                          </h3>
                          <div className="space-y-2">
                            {report.failures.map((failure, idx) => (
                              <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="font-semibold text-red-900 mb-2">
                                  {failure.boat?.name || 'Unknown Boat'}
                                </p>
                                <p className="text-sm text-red-700 mb-2">
                                  <span className="font-medium">Reason:</span> {failure.reason}
                                </p>
                                {failure.missingFields && failure.missingFields.length > 0 && (
                                  <p className="text-sm text-red-700">
                                    <span className="font-medium">Missing Fields:</span>{' '}
                                    {failure.missingFields.join(', ')}
                                  </p>
                                )}
                                {failure.boat?.source_url && (
                                  <a
                                    href={failure.boat.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                                  >
                                    View Source →
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Incomplete Boats */}
                      {filterType !== 'failures' && report.incomplete_boats && report.incomplete_boats.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-orange-900 mb-3 flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            Incomplete Boats ({report.incomplete_boats.length})
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-orange-50">
                                <tr>
                                  <th className="px-4 py-3 text-left font-semibold text-orange-900">Name</th>
                                  <th className="px-4 py-3 text-left font-semibold text-orange-900">Location</th>
                                  <th className="px-4 py-3 text-left font-semibold text-orange-900">Contact</th>
                                  <th className="px-4 py-3 text-left font-semibold text-orange-900">Missing Fields</th>
                                  <th className="px-4 py-3 text-left font-semibold text-orange-900">Source</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-orange-100">
                                {report.incomplete_boats.map((boat, idx) => (
                                  <tr key={idx} className="hover:bg-orange-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{boat.name}</td>
                                    <td className="px-4 py-3 text-gray-700">{boat.location || '-'}</td>
                                    <td className="px-4 py-3 text-gray-700">
                                      {boat.phone || boat.email || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                        {boat.missingFields?.join(', ') || 'Unknown'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      {boat.source_url ? (
                                        <a
                                          href={boat.source_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          View
                                        </a>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScraperFailureReports;
