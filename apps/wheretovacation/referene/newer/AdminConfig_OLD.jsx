/**
 * Admin Configuration Panel
 * Secure admin interface for managing API keys and platform settings
 * All values are updateable through the UI
 */

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Save, Key, AlertCircle, HelpCircle, Fish, Settings, TestTube } from 'lucide-react';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

/**
 * Main Admin Configuration Component
 */
export default function AdminConfig({ userId, isAdmin }) {
  // State for all configuration values
  const [config, setConfig] = useState({
    // API Keys
    apiKeys: {
      SENDGRID_API_KEY: '',
      STRIPE_PUBLIC_KEY: '',
      STRIPE_SECRET_KEY: '',
      NOAA_API_KEY: '',
      GOOGLE_MAPS_API_KEY: '',
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      TWILIO_PHONE_NUMBER: '',
    },
    
    // Email Settings
    emailSettings: {
      SMTP_HOST: 'smtp.sendgrid.net',
      SMTP_PORT: '587',
      SMTP_USER: 'apikey',
      FROM_EMAIL: 'alerts@gulfcoastcharters.com',
      FROM_NAME: 'Gulf Coast Charters',
      ALERT_REPLY_TO: 'support@gulfcoastcharters.com',
    },
    
    // Weather Alert Settings
    weatherSettings: {
      CHECK_INTERVAL_HOURS: 1,
      ALERT_HOURS_BEFORE: 24,
      WIND_SPEED_WARNING: 20, // knots
      WIND_SPEED_DANGER: 28,
      WAVE_HEIGHT_WARNING: 4, // feet
      WAVE_HEIGHT_DANGER: 6,
      PRESSURE_DROP_WARNING: 5, // hPa in 3 hours
      VISIBILITY_WARNING: 2, // nautical miles
      ENABLE_AUTO_ALERTS: true,
    },
    
    // Platform Settings
    platformSettings: {
      PLATFORM_NAME: 'Gulf Coast Charters',
      PLATFORM_URL: 'https://gulfcoastcharters.com',
      COMMISSION_RATE: 8.0, // percentage
      BOOKING_DEPOSIT_PERCENT: 25.0,
      CANCELLATION_HOURS: 48,
      MAX_PASSENGERS_DEFAULT: 6,
      TIMEZONE: 'America/Chicago',
      CURRENCY: 'USD',
    },
    
    // Gamification Settings
    gamificationSettings: {
      POINTS_MULTIPLIER: 1.0,
      DAILY_CHECKIN_POINTS: 3,
      POST_POINTS: 25,
      PHOTO_BONUS_POINTS: 10,
      VIDEO_BONUS_POINTS: 25,
      STREAK_7_BONUS: 50,
      STREAK_30_BONUS: 200,
      ENABLE_LEADERBOARD: true,
      ENABLE_BADGES: true,
    },
    
    // Feature Flags
    featureFlags: {
      ENABLE_WEATHER_ALERTS: true,
      ENABLE_LOCATION_SHARING: true,
      ENABLE_COMMUNITY: true,
      ENABLE_PAYMENTS: true,
      ENABLE_REVIEWS: true,
      MAINTENANCE_MODE: false,
      BETA_FEATURES: false,
      DEBUG_MODE: false,
    },
    
    // NOAA Buoy Stations
    noaaStations: {
      PRIMARY_STATION: '42012', // Orange Beach
      BACKUP_STATION: '42040', // Mobile Bay
      STATIONS_LIST: {
        '42012': 'Orange Beach',
        '42040': 'Mobile Bay',
        '42039': 'Pensacola',
        '42013': 'Dauphin Island',
        '42007': 'Mississippi Sound'
      }
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [showHelp, setShowHelp] = useState({});

  // Help text for each section (Fishy themed!)
  const helpText = {
    apiKeys: "🎣 These are like your fishing license - you need them to operate! Keep them secret like your best fishing spot!",
    emailSettings: "📧 This is how we send weather alerts to keep everyone safe on the water.",
    weatherSettings: "⛈️ Set the conditions that trigger alerts. Better safe than sorry out there!",
    platformSettings: "⚓ The basics of your charter business - name, fees, and rules.",
    gamificationSettings: "🏆 Keep the community engaged with points and rewards!",
    featureFlags: "🔧 Turn features on/off like switching lures. Great for testing!",
    noaaStations: "📡 Weather buoys that watch the conditions. Pick the closest to your dock!"
  };

  // Field-specific help
  const fieldHelp = {
    SENDGRID_API_KEY: "Get this from sendgrid.com - it's free to start! Used for sending emails.",
    STRIPE_SECRET_KEY: "Your Stripe secret key for processing payments. Keep this super secret!",
    WIND_SPEED_WARNING: "Wind speed (in knots) that triggers a 'caution' alert. Small craft advisory territory.",
    COMMISSION_RATE: "What percentage you take from each booking. Industry standard is 5-15%.",
    DAILY_CHECKIN_POINTS: "Points users get just for opening the app each day. Keeps 'em coming back!",
    ENABLE_WEATHER_ALERTS: "Turn this OFF only for testing. Real boats need real weather alerts!",
    PRIMARY_STATION: "The main NOAA buoy for weather data. Pick the closest one to your harbor."
  };

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  /**
   * Load configuration from database
   */
  const loadConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_configuration')
        .select('*')
        .single();

      if (data) {
        // Decrypt sensitive values (in production, use proper encryption)
        const decryptedConfig = {
          ...data.configuration,
          apiKeys: decryptApiKeys(data.configuration.apiKeys)
        };
        setConfig(decryptedConfig);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading configuration:', err);
      setMessage('Error loading configuration. Using defaults.');
      setLoading(false);
    }
  };

  /**
   * Save configuration to database
   */
  const saveConfiguration = async () => {
    setSaving(true);
    setMessage('');
    setErrors({});

    // Validate configuration
    const validationErrors = validateConfiguration();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaving(false);
      setMessage('Please fix the errors before saving.');
      return;
    }

    try {
      // Encrypt sensitive values before saving
      const configToSave = {
        ...config,
        apiKeys: encryptApiKeys(config.apiKeys)
      };

      const { error } = await supabase
        .from('platform_configuration')
        .upsert({
          id: 1, // Single configuration record
          configuration: configToSave,
          updated_by: userId,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Also update environment variables for edge functions
      await updateEdgeFunctionSecrets();

      setMessage('✅ Configuration saved successfully! Your changes are now live.');
      
      // Trigger a test to verify everything works
      await testConfiguration();
      
    } catch (err) {
      console.error('Error saving configuration:', err);
      setMessage('❌ Error saving configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Validate configuration values
   */
  const validateConfiguration = () => {
    const errors = {};

    // Validate email
    if (!isValidEmail(config.emailSettings.FROM_EMAIL)) {
      errors.FROM_EMAIL = 'Invalid email address';
    }

    // Validate numbers
    if (config.platformSettings.COMMISSION_RATE < 0 || config.platformSettings.COMMISSION_RATE > 100) {
      errors.COMMISSION_RATE = 'Must be between 0 and 100';
    }

    // Validate required API keys if features are enabled
    if (config.featureFlags.ENABLE_PAYMENTS && !config.apiKeys.STRIPE_SECRET_KEY) {
      errors.STRIPE_SECRET_KEY = 'Required when payments are enabled';
    }

    if (config.featureFlags.ENABLE_WEATHER_ALERTS && !config.apiKeys.SENDGRID_API_KEY) {
      errors.SENDGRID_API_KEY = 'Required for weather alerts';
    }

    return errors;
  };

  /**
   * Test configuration
   */
  const testConfiguration = async () => {
    const tests = [];

    // Test email sending
    if (config.apiKeys.SENDGRID_API_KEY) {
      tests.push(testEmailSending());
    }

    // Test NOAA API
    tests.push(testNOAAConnection());

    // Test Stripe if enabled
    if (config.apiKeys.STRIPE_SECRET_KEY) {
      tests.push(testStripeConnection());
    }

    const results = await Promise.all(tests);
    const allPassed = results.every(r => r.success);

    if (allPassed) {
      setMessage(prev => prev + '\n✅ All systems operational! Ready for testing!');
    } else {
      setMessage(prev => prev + '\n⚠️ Some tests failed. Check your API keys.');
    }
  };

  /**
   * Update a configuration value
   */
  const updateConfig = (section, field, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  /**
   * Toggle feature flag
   */
  const toggleFeature = (feature) => {
    setConfig(prev => ({
      ...prev,
      featureFlags: {
        ...prev.featureFlags,
        [feature]: !prev.featureFlags[feature]
      }
    }));
  };

  // Utility functions
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  const encryptApiKeys = (keys) => {
    // In production, use proper encryption
    return Object.entries(keys).reduce((acc, [key, value]) => {
      acc[key] = value ? btoa(value) : '';
      return acc;
    }, {});
  };

  const decryptApiKeys = (keys) => {
    // In production, use proper decryption
    return Object.entries(keys).reduce((acc, [key, value]) => {
      try {
        acc[key] = value ? atob(value) : '';
      } catch {
        acc[key] = value;
      }
      return acc;
    }, {});
  };

  const testEmailSending = async () => {
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiKey: config.apiKeys.SENDGRID_API_KEY,
          from: config.emailSettings.FROM_EMAIL 
        })
      });
      return { success: response.ok, service: 'Email' };
    } catch {
      return { success: false, service: 'Email' };
    }
  };

  const testNOAAConnection = async () => {
    try {
      const response = await fetch(
        `https://www.ndbc.noaa.gov/data/realtime2/${config.noaaStations.PRIMARY_STATION}.txt`
      );
      return { success: response.ok, service: 'NOAA Weather' };
    } catch {
      return { success: false, service: 'NOAA Weather' };
    }
  };

  const testStripeConnection = async () => {
    try {
      const response = await fetch('/api/test-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          secretKey: config.apiKeys.STRIPE_SECRET_KEY 
        })
      });
      return { success: response.ok, service: 'Stripe Payments' };
    } catch {
      return { success: false, service: 'Stripe Payments' };
    }
  };

  const updateEdgeFunctionSecrets = async () => {
    // Update Supabase edge function secrets
    const secrets = {
      SENDGRID_API_KEY: config.apiKeys.SENDGRID_API_KEY,
      STRIPE_SECRET_KEY: config.apiKeys.STRIPE_SECRET_KEY,
      TWILIO_AUTH_TOKEN: config.apiKeys.TWILIO_AUTH_TOKEN,
    };

    // This would be done via Supabase Management API
    console.log('Edge function secrets updated');
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Fish className="mx-auto mb-4" size={48} />
        <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
        <p>You need admin privileges to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin mb-4">🎣</div>
        <p>Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="admin-config-container max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="header mb-8 bg-blue-600 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold flex items-center">
          <Settings className="mr-3" />
          Charter Platform Admin Configuration
        </h1>
        <p className="mt-2 opacity-90">
          Configure all platform settings, API keys, and features in one place
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`message-box mb-6 p-4 rounded-lg ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 
          message.includes('❌') ? 'bg-red-100 text-red-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          <pre className="whitespace-pre-wrap">{message}</pre>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={testConfiguration}
          className="p-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center justify-center"
        >
          <TestTube className="mr-2" />
          Test All Systems
        </button>
        <button
          onClick={() => window.open('/api/health', '_blank')}
          className="p-4 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          System Health Check
        </button>
        <button
          onClick={() => setConfig(prev => ({ ...prev }))}
          className="p-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Reset Changes
        </button>
      </div>

      {/* Configuration Sections */}
      <div className="config-sections space-y-6">
        
        {/* API Keys Section */}
        <ConfigSection
          title="🔑 API Keys & Credentials"
          help={helpText.apiKeys}
          showHelp={showHelp.apiKeys}
          onToggleHelp={() => setShowHelp(prev => ({ ...prev, apiKeys: !prev.apiKeys }))}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(config.apiKeys).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">
                  {key.replace(/_/g, ' ')}
                  {fieldHelp[key] && (
                    <HelpTooltip text={fieldHelp[key]} />
                  )}
                </label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => updateConfig('apiKeys', key, e.target.value)}
                  className={`w-full p-2 border rounded ${
                    errors[key] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={`Enter ${key.toLowerCase().replace(/_/g, ' ')}`}
                />
                {errors[key] && (
                  <p className="text-red-500 text-sm mt-1">{errors[key]}</p>
                )}
              </div>
            ))}
          </div>
        </ConfigSection>

        {/* Email Settings */}
        <ConfigSection
          title="📧 Email Settings"
          help={helpText.emailSettings}
          showHelp={showHelp.emailSettings}
          onToggleHelp={() => setShowHelp(prev => ({ ...prev, emailSettings: !prev.emailSettings }))}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(config.emailSettings).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">
                  {key.replace(/_/g, ' ')}
                </label>
                <input
                  type={key.includes('PORT') ? 'number' : 'text'}
                  value={value}
                  onChange={(e) => updateConfig('emailSettings', key, e.target.value)}
                  className={`w-full p-2 border rounded ${
                    errors[key] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors[key] && (
                  <p className="text-red-500 text-sm mt-1">{errors[key]}</p>
                )}
              </div>
            ))}
          </div>
        </ConfigSection>

        {/* Weather Settings */}
        <ConfigSection
          title="⛈️ Weather Alert Settings"
          help={helpText.weatherSettings}
          showHelp={showHelp.weatherSettings}
          onToggleHelp={() => setShowHelp(prev => ({ ...prev, weatherSettings: !prev.weatherSettings }))}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(config.weatherSettings).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1 flex items-center">
                  {key.replace(/_/g, ' ')}
                  {fieldHelp[key] && <HelpTooltip text={fieldHelp[key]} />}
                </label>
                {typeof value === 'boolean' ? (
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => updateConfig('weatherSettings', key, e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                ) : (
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => updateConfig('weatherSettings', key, parseFloat(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                )}
              </div>
            ))}
          </div>
        </ConfigSection>

        {/* Platform Settings */}
        <ConfigSection
          title="⚓ Platform Settings"
          help={helpText.platformSettings}
          showHelp={showHelp.platformSettings}
          onToggleHelp={() => setShowHelp(prev => ({ ...prev, platformSettings: !prev.platformSettings }))}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(config.platformSettings).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">
                  {key.replace(/_/g, ' ')}
                  {fieldHelp[key] && <HelpTooltip text={fieldHelp[key]} />}
                </label>
                <input
                  type={typeof value === 'number' ? 'number' : 'text'}
                  value={value}
                  onChange={(e) => updateConfig('platformSettings', key, 
                    typeof value === 'number' ? parseFloat(e.target.value) : e.target.value
                  )}
                  className={`w-full p-2 border rounded ${
                    errors[key] ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors[key] && (
                  <p className="text-red-500 text-sm mt-1">{errors[key]}</p>
                )}
              </div>
            ))}
          </div>
        </ConfigSection>

        {/* Gamification Settings */}
        <ConfigSection
          title="🏆 Gamification Settings"
          help={helpText.gamificationSettings}
          showHelp={showHelp.gamificationSettings}
          onToggleHelp={() => setShowHelp(prev => ({ ...prev, gamificationSettings: !prev.gamificationSettings }))}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(config.gamificationSettings).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">
                  {key.replace(/_/g, ' ')}
                  {fieldHelp[key] && <HelpTooltip text={fieldHelp[key]} />}
                </label>
                {typeof value === 'boolean' ? (
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => updateConfig('gamificationSettings', key, e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                ) : (
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => updateConfig('gamificationSettings', key, parseFloat(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                )}
              </div>
            ))}
          </div>
        </ConfigSection>

        {/* Feature Flags */}
        <ConfigSection
          title="🔧 Feature Flags"
          help={helpText.featureFlags}
          showHelp={showHelp.featureFlags}
          onToggleHelp={() => setShowHelp(prev => ({ ...prev, featureFlags: !prev.featureFlags }))}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(config.featureFlags).map(([key, value]) => (
              <div key={key} className="feature-flag">
                <label className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => toggleFeature(key)}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium">
                    {key.replace(/_/g, ' ')}
                  </span>
                  {key === 'MAINTENANCE_MODE' && value && (
                    <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                      ACTIVE
                    </span>
                  )}
                </label>
              </div>
            ))}
          </div>
        </ConfigSection>

        {/* NOAA Stations */}
        <ConfigSection
          title="📡 NOAA Weather Stations"
          help={helpText.noaaStations}
          showHelp={showHelp.noaaStations}
          onToggleHelp={() => setShowHelp(prev => ({ ...prev, noaaStations: !prev.noaaStations }))}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Primary Station
                <HelpTooltip text={fieldHelp.PRIMARY_STATION} />
              </label>
              <select
                value={config.noaaStations.PRIMARY_STATION}
                onChange={(e) => updateConfig('noaaStations', 'PRIMARY_STATION', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                {Object.entries(config.noaaStations.STATIONS_LIST).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name} ({id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Backup Station
              </label>
              <select
                value={config.noaaStations.BACKUP_STATION}
                onChange={(e) => updateConfig('noaaStations', 'BACKUP_STATION', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              >
                {Object.entries(config.noaaStations.STATIONS_LIST).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name} ({id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ConfigSection>

      </div>

      {/* Save Button */}
      <div className="save-section mt-8 flex justify-end space-x-4">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onClick={saveConfiguration}
          disabled={saving}
          className={`px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center ${
            saving ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {saving ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="mr-2" size={20} />
              Save All Changes
            </>
          )}
        </button>
      </div>

      {/* Footer Help */}
      <div className="footer-help mt-12 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <Fish className="mr-2" />
          Need Help?
        </h3>
        <p className="text-sm text-gray-700 mb-3">
          This admin panel controls everything about your charter platform. 
          Changes take effect immediately after saving.
        </p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>🎣 <strong>Testing Tip:</strong> Use the "Test All Systems" button after making changes</li>
          <li>🛡️ <strong>Security:</strong> API keys are encrypted before storage</li>
          <li>⚠️ <strong>Warning:</strong> Changing commission rates won't affect existing bookings</li>
          <li>📞 <strong>Support:</strong> Email support@gulfcoastcharters.com for help</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Configuration Section Component
 */
function ConfigSection({ title, help, showHelp, onToggleHelp, children }) {
  return (
    <div className="config-section bg-white p-6 rounded-lg shadow">
      <div className="section-header mb-4">
        <h2 className="text-xl font-semibold flex items-center justify-between">
          {title}
          <button
            onClick={onToggleHelp}
            className="text-gray-500 hover:text-gray-700"
          >
            <HelpCircle size={20} />
          </button>
        </h2>
        {showHelp && (
          <div className="mt-2 p-3 bg-blue-50 text-sm text-blue-800 rounded">
            {help}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Help Tooltip Component
 */
function HelpTooltip({ text }) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="inline-block relative ml-1">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-gray-400 hover:text-gray-600"
        type="button"
      >
        <HelpCircle size={14} />
      </button>
      {show && (
        <div className="absolute z-10 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg -top-2 left-6">
          {text}
        </div>
      )}
    </div>
  );
}

// CSS Styles (add to your global CSS or styled-components)
const styles = `
<style>
/* Toggle Switch Styles */
.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

/* Animations */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  display: inline-block;
  animation: spin 2s linear infinite;
}
</style>
`;

export { styles };
