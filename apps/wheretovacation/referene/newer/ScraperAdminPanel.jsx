import React, { useState, useEffect } from 'react';
import { Play, Pause, Settings, Calendar, Clock, Database, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

const ScraperAdminPanel = () => {
  const [scraperStatus, setScraperStatus] = useState({
    isRunning: false,
    lastRun: null,
    nextScheduledRun: null,
    totalBoatsScraped: 0,
    newBoatsToday: 0,
    scheduledEnabled: false,
  });

  const [config, setConfig] = useState({
    sources: {
      thehulltruth: true,
      craigslist: true,
      facebook: false,
      instagram: false,
      google: true,
    },
    schedule: {
      enabled: true,
      frequency: 'daily', // 'hourly', 'daily', 'weekly'
      time: '02:00', // Run at 2 AM
      timezone: 'America/Chicago',
    },
    filters: {
      states: ['AL', 'FL', 'MS', 'LA', 'TX'],
      minBoatLength: 20,
      maxBoatLength: 60,
    },
    maxBoatsPerRun: 10, // Configurable number of boats to find
  });

  const [recentLogs, setRecentLogs] = useState([]);
  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    loadScraperStatus();
    loadRecentLogs();
    const interval = setInterval(loadScraperStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadScraperStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('scraper_status')
        .select('*')
        .single();
      
      if (data) {
        setScraperStatus(data);
      }
    } catch (error) {
      console.error('Error loading scraper status:', error);
    }
  };

  const loadRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('scraper_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setRecentLogs(data);
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const runScraperManually = async () => {
    setScraperStatus(prev => ({ ...prev, isRunning: true }));
    
    try {
      const response = await fetch('/api/run-scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'manual',
          sources: Object.keys(config.sources).filter(s => config.sources[s]),
          filterState: config.filters.states,
          maxBoats: config.maxBoatsPerRun,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const summary = result.summary;
        alert(`✅ Scraper complete!\n\n` +
          `Targeted: ${summary.targeted} boats\n` +
          `Found: ${summary.found} boats\n` +
          `Complete: ${summary.complete} boats\n` +
          `Incomplete: ${summary.incomplete} boats\n` +
          `Saved: ${summary.saved} boats\n` +
          `Failed: ${summary.failed} boats\n\n` +
          `${summary.failed > 0 ? 'Check failure reports for details.' : 'All boats processed successfully!'}`
        );
      } else {
        alert('❌ Scraper failed: ' + result.error);
      }

      loadScraperStatus();
      loadRecentLogs();
    } catch (error) {
      alert('❌ Error running scraper: ' + error.message);
    } finally {
      setScraperStatus(prev => ({ ...prev, isRunning: false }));
    }
  };

  const toggleSchedule = async (enabled) => {
    try {
      const { error } = await supabase
        .from('scraper_config')
        .update({ schedule_enabled: enabled })
        .eq('id', 1);

      if (!error) {
        setConfig(prev => ({
          ...prev,
          schedule: { ...prev.schedule, enabled },
        }));
        alert(enabled ? '✅ Automatic scraping enabled!' : '⏸️ Automatic scraping paused');
      }
    } catch (error) {
      alert('Error updating schedule: ' + error.message);
    }
  };

  const saveConfig = async () => {
    try {
      const { error } = await supabase
        .from('scraper_config')
        .update({
          sources: config.sources,
          schedule: config.schedule,
          filters: config.filters,
        })
        .eq('id', 1);

      if (!error) {
        alert('✅ Configuration saved!');
        setIsConfiguring(false);
      }
    } catch (error) {
      alert('Error saving config: ' + error.message);
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
                <Database className="w-8 h-8 mr-3 text-blue-600" />
                Smart Scraper Control Panel
              </h1>
              <p className="text-gray-600 mt-2">
                Automatically discover and import charter boats from across the Gulf Coast
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsConfiguring(!isConfiguring)}
                className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Settings className="w-5 h-5 mr-2" />
                Configure
              </button>
              <button
                onClick={runScraperManually}
                disabled={scraperStatus.isRunning}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scraperStatus.isRunning ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Run Now
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Boats</p>
                  <p className="text-3xl font-bold text-blue-900">{scraperStatus.totalBoatsScraped}</p>
                </div>
                <Database className="w-10 h-10 text-blue-500 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">New Today</p>
                  <p className="text-3xl font-bold text-green-900">{scraperStatus.newBoatsToday}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-500 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Last Run</p>
                  <p className="text-lg font-bold text-purple-900">
                    {scraperStatus.lastRun ? new Date(scraperStatus.lastRun).toLocaleString() : 'Never'}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-purple-500 opacity-50" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Next Run</p>
                  <p className="text-lg font-bold text-orange-900">
                    {scraperStatus.nextScheduledRun ? new Date(scraperStatus.nextScheduledRun).toLocaleString() : 'Not scheduled'}
                  </p>
                </div>
                <Calendar className="w-10 h-10 text-orange-500 opacity-50" />
              </div>
            </div>
          </div>

          {/* Schedule Toggle */}
          <div className="mt-6 flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div>
              <h3 className="font-semibold text-gray-900">Automatic Scheduling</h3>
              <p className="text-sm text-gray-600">
                Scraper will run {config.schedule.frequency} at {config.schedule.time} {config.schedule.timezone}
              </p>
            </div>
            <button
              onClick={() => toggleSchedule(!config.schedule.enabled)}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
                config.schedule.enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                  config.schedule.enabled ? 'translate-x-11' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Configuration Panel */}
        {isConfiguring && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Scraper Configuration</h2>

            {/* Data Sources */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Sources</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(config.sources).map(source => (
                  <label key={source} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={config.sources[source]}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        sources: { ...prev.sources, [source]: e.target.checked },
                      }))}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-gray-900 font-medium capitalize">{source}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Schedule Settings */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Schedule Settings</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                  <select
                    value={config.schedule.frequency}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, frequency: e.target.value },
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="hourly">Every Hour</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Run Time</label>
                  <input
                    type="time"
                    value={config.schedule.time}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, time: e.target.value },
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                  <select
                    value={config.schedule.timezone}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule, timezone: e.target.value },
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="America/Chicago">Central (CST)</option>
                    <option value="America/New_York">Eastern (EST)</option>
                    <option value="America/Denver">Mountain (MST)</option>
                    <option value="America/Los_Angeles">Pacific (PST)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Filters</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">States</label>
                  <div className="flex flex-wrap gap-2">
                    {['AL', 'FL', 'MS', 'LA', 'TX'].map(state => (
                      <label key={state} className="flex items-center px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={config.filters.states.includes(state)}
                          onChange={(e) => {
                            const newStates = e.target.checked
                              ? [...config.filters.states, state]
                              : config.filters.states.filter(s => s !== state);
                            setConfig(prev => ({
                              ...prev,
                              filters: { ...prev.filters, states: newStates },
                            }));
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="ml-2 font-medium">{state}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Boats Per Run
                  </label>
                  <input
                    type="number"
                    value={config.maxBoatsPerRun}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      maxBoatsPerRun: parseInt(e.target.value) || 10,
                    }))}
                    min="1"
                    max="100"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of boats to find per scraper run (1-100)
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={saveConfig}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Save Configuration
            </button>
          </div>
        )}

        {/* Recent Logs */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Scraper Runs</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sources</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Boats</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Errors</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        log.mode === 'auto' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.mode}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {log.sources?.join(', ') || 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      +{log.new_boats}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600">
                      {log.updated_boats}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600">
                      {log.errors_count}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {log.errors_count > 0 ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScraperAdminPanel;
