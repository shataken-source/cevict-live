"use client";

import { useState, useEffect } from "react";
import { getWeatherPredictions } from "./shared-weather-service";
import { getTidePredictionsForLocation, getCoordinatesFromLocation } from "./free-data-fetcher";
import { predictFishActivity } from "./fish-activity-predictor";
import { fetchUpcomingGames } from "./free-data-fetcher";

interface SystemStatus {
  weather: 'online' | 'offline' | 'warning';
  tides: 'online' | 'offline' | 'warning';
  fishActivity: 'online' | 'offline' | 'warning';
  sports: 'online' | 'offline' | 'warning';
  lastUpdate: Date;
}

export default function TVDashboard() {
  const [location, setLocation] = useState("Panama City, FL");
  const [weatherStatus, setWeatherStatus] = useState<'online' | 'offline' | 'warning'>('offline');
  const [tideStatus, setTideStatus] = useState<'online' | 'offline' | 'warning'>('offline');
  const [fishStatus, setFishStatus] = useState<'online' | 'offline' | 'warning'>('offline');
  const [sportsStatus, setSportsStatus] = useState<'online' | 'offline' | 'warning'>('offline');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [tideData, setTideData] = useState<any>(null);
  const [fishData, setFishData] = useState<any>(null);
  const [sportsData, setSportsData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchAllData();
      }, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [autoRefresh, location]);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, [location]);

  async function fetchAllData() {
    try {
      // Fetch weather
      try {
        const weather = await getWeatherPredictions(location, 7);
        setWeatherData(weather);
        const alerts = (weather as any)?.alerts || [];
        const forecasts = Array.isArray((weather as any)?.forecasts) ? (weather as any)?.forecasts : [];
        const hasAlerts = alerts.length > 0;
        const highWinds = forecasts.some((f: any) => f.windSpeed > 25);
        setWeatherStatus(hasAlerts || highWinds ? 'warning' : 'online');
      } catch (e) {
        setWeatherStatus('offline');
      }

      // Fetch tides
      try {
        const coords = await getCoordinatesFromLocation(location);
        if (coords) {
          const tides = await getTidePredictionsForLocation(coords, 7);
          setTideData(tides);
          setTideStatus('online');
        }
      } catch (e) {
        setTideStatus('offline');
      }

      // Fetch fish activity
      try {
        const coords = await getCoordinatesFromLocation(location);
        if (coords) {
          const now = new Date();
          const conditions = {
            location: { name: location, coordinates: coords },
            tides: [],
            weather: { temperature: 75, humidity: 60, windSpeed: 8, windDirection: "N", pressure: 1012, conditions: "Clear" },
            moonPhase: "full",
            sunrise: new Date(now.setHours(6, 0, 0, 0)),
            sunset: new Date(now.setHours(18, 0, 0, 0))
          };
          const fish = predictFishActivity(conditions as any);
          setFishData(fish);
          setFishStatus(fish.overallScore > 70 ? 'online' : 'warning');
        }
      } catch (e) {
        setFishStatus('offline');
      }

      // Fetch sports
      try {
        const games = await fetchUpcomingGames('NFL');
        setSportsData(games);
        setSportsStatus(games.length > 0 ? 'online' : 'warning');
      } catch (e) {
        setSportsStatus('offline');
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    }
  }

  function getStatusColor(status: 'online' | 'offline' | 'warning'): string {
    if (status === 'online') return '#00ff00';
    if (status === 'warning') return '#ffaa00';
    return '#ff0000';
  }

  function getStatusGlow(status: 'online' | 'offline' | 'warning'): string {
    if (status === 'online') return '0 0 20px #00ff00, 0 0 40px #00ff00';
    if (status === 'warning') return '0 0 20px #ffaa00, 0 0 40px #ffaa00';
    return '0 0 20px #ff0000, 0 0 40px #ff0000';
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      color: 'white',
      fontFamily: 'monospace',
      overflow: 'hidden',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '2px solid #00ffaa',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{
            fontSize: '48px',
            margin: 0,
            background: 'linear-gradient(90deg, #00ffaa, #00b4ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            PROGNO COMMAND CENTER
          </h1>
          <p style={{ color: '#888', fontSize: '18px', margin: '5px 0 0 0' }}>
            Real-Time Prediction Monitoring Dashboard
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', color: '#00ffaa', marginBottom: '5px' }}>
            {lastUpdate.toLocaleTimeString()}
          </div>
          <div style={{ fontSize: '14px', color: '#888' }}>
            Last Update
          </div>
          <button
            onClick={fetchAllData}
            style={{
              marginTop: '10px',
              padding: '10px 20px',
              background: '#00ffaa',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            🔄 REFRESH
          </button>
        </div>
      </div>

      {/* Status Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Weather Status */}
        <div style={{
          background: '#111',
          border: `3px solid ${getStatusColor(weatherStatus)}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: getStatusGlow(weatherStatus),
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: getStatusColor(weatherStatus),
            boxShadow: getStatusGlow(weatherStatus),
            animation: weatherStatus === 'online' ? 'pulse 2s infinite' : 'none'
          }} />
          <h3 style={{ fontSize: '24px', margin: '0 0 10px 0', color: '#00b4ff' }}>🌤️ WEATHER</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: getStatusColor(weatherStatus), marginBottom: '5px' }}>
            {weatherStatus.toUpperCase()}
          </div>
          {weatherData && (
            <div style={{ fontSize: '14px', color: '#aaa', marginTop: '10px' }}>
              <div>Today: {weatherData.forecasts[0]?.high}°F / {weatherData.forecasts[0]?.low}°F</div>
              <div>Condition: {weatherData.forecasts[0]?.condition}</div>
              <div>Wind: {weatherData.forecasts[0]?.windSpeed} mph {weatherData.forecasts[0]?.windDirection}</div>
              {weatherData.alerts.length > 0 && (
                <div style={{ color: '#ffaa00', marginTop: '5px' }}>
                  ⚠️ {weatherData.alerts.length} Alert(s)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tides Status */}
        <div style={{
          background: '#111',
          border: `3px solid ${getStatusColor(tideStatus)}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: getStatusGlow(tideStatus),
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: getStatusColor(tideStatus),
            boxShadow: getStatusGlow(tideStatus),
            animation: tideStatus === 'online' ? 'pulse 2s infinite' : 'none'
          }} />
          <h3 style={{ fontSize: '24px', margin: '0 0 10px 0', color: '#00b4ff' }}>🌊 TIDES</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: getStatusColor(tideStatus), marginBottom: '5px' }}>
            {tideStatus.toUpperCase()}
          </div>
          {tideData && (
            <div style={{ fontSize: '14px', color: '#aaa', marginTop: '10px' }}>
              <div>Station: {tideData.stationName}</div>
              <div>Next High: {tideData.predictions.find((t: any) => t.type === 'High')?.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
              <div>Next Low: {tideData.predictions.find((t: any) => t.type === 'Low')?.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
              <div>Total: {tideData.predictions.length} predictions</div>
            </div>
          )}
        </div>

        {/* Fish Activity Status */}
        <div style={{
          background: '#111',
          border: `3px solid ${getStatusColor(fishStatus)}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: getStatusGlow(fishStatus),
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: getStatusColor(fishStatus),
            boxShadow: getStatusGlow(fishStatus),
            animation: fishStatus === 'online' ? 'pulse 2s infinite' : 'none'
          }} />
          <h3 style={{ fontSize: '24px', margin: '0 0 10px 0', color: '#00b4ff' }}>🎣 FISH ACTIVITY</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: getStatusColor(fishStatus), marginBottom: '5px' }}>
            {fishStatus.toUpperCase()}
          </div>
          {fishData && (
            <div style={{ fontSize: '14px', color: '#aaa', marginTop: '10px' }}>
              <div style={{ fontSize: '28px', color: getStatusColor(fishStatus), fontWeight: 'bold' }}>
                {fishData.overallScore}%
              </div>
              <div>Moon: {fishData.moonPhase.name}</div>
              <div>Best Time: {fishData.bestTimes[0]?.time}</div>
              <div>Score: {fishData.bestTimes[0]?.score}%</div>
            </div>
          )}
        </div>

        {/* Sports Status */}
        <div style={{
          background: '#111',
          border: `3px solid ${getStatusColor(sportsStatus)}`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: getStatusGlow(sportsStatus),
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: getStatusColor(sportsStatus),
            boxShadow: getStatusGlow(sportsStatus),
            animation: sportsStatus === 'online' ? 'pulse 2s infinite' : 'none'
          }} />
          <h3 style={{ fontSize: '24px', margin: '0 0 10px 0', color: '#00b4ff' }}>🏈 SPORTS</h3>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: getStatusColor(sportsStatus), marginBottom: '5px' }}>
            {sportsStatus.toUpperCase()}
          </div>
          {sportsData && (
            <div style={{ fontSize: '14px', color: '#aaa', marginTop: '10px' }}>
              <div>NFL Games: {sportsData.length}</div>
              <div>Source: ESPN (Free)</div>
              <div style={{ marginTop: '5px', fontSize: '12px', color: '#888' }}>
                Ready for analysis
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Display Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        height: 'calc(100vh - 300px)'
      }}>
        {/* Weather Forecast */}
        <div style={{
          background: '#111',
          border: '2px solid #333',
          borderRadius: '12px',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <h3 style={{ fontSize: '28px', margin: '0 0 20px 0', color: '#00ffaa' }}>📅 7-Day Weather Forecast</h3>
          {weatherData ? (
            <div style={{ display: 'grid', gap: '15px' }}>
              {weatherData.forecasts.map((forecast: any, i: number) => (
                <div key={i} style={{
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '15px',
                  display: 'grid',
                  gridTemplateColumns: '150px 1fr 100px 100px',
                  gap: '15px',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {new Date(forecast.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '14px', color: '#aaa' }}>{forecast.condition}</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#00b4ff' }}>
                    {forecast.high}° / {forecast.low}°
                  </div>
                  <div style={{ fontSize: '14px', color: '#888' }}>
                    {forecast.windSpeed} mph {forecast.windDirection}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>Loading weather data...</div>
          )}
        </div>

        {/* System Info & Alerts */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* System Health */}
          <div style={{
            background: '#111',
            border: '2px solid #333',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '24px', margin: '0 0 15px 0', color: '#00ffaa' }}>⚙️ SYSTEM HEALTH</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#aaa' }}>Weather API</span>
                <span style={{
                  color: getStatusColor(weatherStatus),
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  {weatherStatus === 'online' ? '●' : weatherStatus === 'warning' ? '●' : '●'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#aaa' }}>Tide API</span>
                <span style={{
                  color: getStatusColor(tideStatus),
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  {tideStatus === 'online' ? '●' : tideStatus === 'warning' ? '●' : '●'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#aaa' }}>Fish Activity</span>
                <span style={{
                  color: getStatusColor(fishStatus),
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  {fishStatus === 'online' ? '●' : fishStatus === 'warning' ? '●' : '●'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#aaa' }}>Sports API</span>
                <span style={{
                  color: getStatusColor(sportsStatus),
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  {sportsStatus === 'online' ? '●' : sportsStatus === 'warning' ? '●' : '●'}
                </span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div style={{
            background: '#111',
            border: '2px solid #ffaa00',
            borderRadius: '12px',
            padding: '20px',
            flex: 1,
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '24px', margin: '0 0 15px 0', color: '#ffaa00' }}>⚠️ ALERTS</h3>
            {weatherData && weatherData.alerts.length > 0 ? (
              <div style={{ display: 'grid', gap: '10px' }}>
                {weatherData.alerts.map((alert: any, i: number) => (
                  <div key={i} style={{
                    background: '#330000',
                    border: '1px solid #ff4444',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '14px'
                  }}>
                    <div style={{ color: '#ff6666', fontWeight: 'bold' }}>{alert.title}</div>
                    <div style={{ color: '#aaa', fontSize: '12px', marginTop: '5px' }}>{alert.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                ✅ No active alerts
              </div>
            )}
          </div>

          {/* Location Selector */}
          <div style={{
            background: '#111',
            border: '2px solid #333',
            borderRadius: '12px',
            padding: '15px'
          }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '14px' }}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchAllData()}
              style={{
                padding: '10px',
                width: '100%',
                background: '#222',
                color: 'white',
                border: '1px solid #333',
                borderRadius: '6px',
                fontSize: '16px'
              }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ color: '#aaa', fontSize: '12px' }}>Auto-refresh every 5 min</span>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        background: '#0a0a0a',
        borderTop: '2px solid #00ffaa',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        color: '#888'
      }}>
        <div>PROGNO Command Center v1.0</div>
        <div>All data from FREE NOAA/ESPN APIs</div>
        <div>Designed for 75" displays</div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

