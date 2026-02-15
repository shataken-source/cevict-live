/**
 * Plugin Registration
 * Drop in new odds sources here without modifying other code
 */

import { registerOddsSource } from './index';
import { DraftKingsPlugin } from './draftkings-plugin';
import { ApiSportsPlugin } from './api-sports-plugin';

// ==========================================
// ADD NEW ODDS SOURCES HERE
// Just import and register your plugin
// ==========================================

// Priority 1: Try DraftKings first (best odds quality)
registerOddsSource(DraftKingsPlugin);

// Priority 10: API-Sports as final fallback
registerOddsSource(ApiSportsPlugin);

// TO ADD A NEW SOURCE:
// 1. Create a new file: lib/odds-sources/your-source-plugin.ts
// 2. Implement the OddsSourcePlugin interface
// 3. Import it here: import { YourPlugin } from './your-source-plugin';
// 4. Register it: registerOddsSource(YourPlugin);
// That's it! No other code changes needed.

console.log('[OddsPluginRegistration] All odds sources registered successfully');
