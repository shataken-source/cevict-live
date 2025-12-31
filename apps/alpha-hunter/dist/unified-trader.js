"use strict";
/**
 * UNIFIED TRADER
 * Runs both Crypto and Kalshi traders with shared fund management
 * Links both accounts through the UnifiedFundManager
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const url_1 = require("url");
const __dirname = path.dirname((0, url_1.fileURLToPath)(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
const fund_manager_1 = require("./fund-manager");
console.log(`
╔══════════════════════════════════════════════════════════════════╗
║          🤖 UNIFIED TRADING SYSTEM - ALPHA HUNTER 🤖             ║
║                                                                  ║
║     Linked Accounts: Coinbase (Crypto) + Kalshi (Predictions)    ║
║     Shared Fund Pool • Intelligent Allocation • Auto-Rebalance   ║
╚══════════════════════════════════════════════════════════════════╝
`);
console.log('📋 CONFIGURATION:');
console.log('   Kalshi API:', process.env.KALSHI_API_KEY_ID ? '✅ Configured' : '⚠️ Not set');
console.log('   Coinbase API:', process.env.COINBASE_API_KEY ? '✅ Configured' : '⚠️ Not set');
console.log('   Claude AI:', process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '⚠️ Not set');
console.log('');
// Set initial allocation (can be customized)
const kalshiAlloc = parseInt(process.env.KALSHI_ALLOCATION || '40');
const cryptoAlloc = parseInt(process.env.CRYPTO_ALLOCATION || '50');
const reserveAlloc = parseInt(process.env.RESERVE_ALLOCATION || '10');
fund_manager_1.fundManager.setAllocation(kalshiAlloc, cryptoAlloc, reserveAlloc);
console.log('💰 FUND ALLOCATION:');
console.log(`   Kalshi: ${kalshiAlloc}%`);
console.log(`   Crypto: ${cryptoAlloc}%`);
console.log(`   Reserve: ${reserveAlloc}%`);
console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
console.log('🚀 TO RUN BOTH TRADERS:');
console.log('');
console.log('   Terminal 1 (Crypto):');
console.log('   > cd apps/alpha-hunter && pnpm train');
console.log('');
console.log('   Terminal 2 (Kalshi):');
console.log('   > cd apps/alpha-hunter && pnpm kalshi');
console.log('');
console.log('Both traders share the same fund manager.');
console.log('If one platform is over-allocated, trades will be reduced/skipped.');
console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');
console.log('📊 CURRENT FUND STATUS:');
console.log(fund_manager_1.fundManager.getStatus());
console.log('');
// Note: In a production system, you might run both traders in the same process
// using worker threads or async loops. For simplicity, they run separately
// but coordinate through the shared fund manager state.
console.log('💡 TIP: To change allocation, set env vars:');
console.log('   KALSHI_ALLOCATION=40');
console.log('   CRYPTO_ALLOCATION=50');
console.log('   RESERVE_ALLOCATION=10');
console.log('');
//# sourceMappingURL=unified-trader.js.map