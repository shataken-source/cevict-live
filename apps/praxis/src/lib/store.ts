import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  Trade, Position, Market, Alert, AIInsight, ChatMessage,
  FilterState, ViewMode, TimeRange, Platform, UserSettings 
} from '@/types';

/** Revive trades from localStorage: entry_time/exit_time are stored as ISO strings. */
function reviveTrades(trades: Trade[]): Trade[] {
  if (!Array.isArray(trades)) return [];
  return trades.map((t) => ({
    ...t,
    entry_time: t.entry_time instanceof Date ? t.entry_time : new Date(t.entry_time as unknown as string),
    exit_time: t.exit_time != null
      ? (t.exit_time instanceof Date ? t.exit_time : new Date(t.exit_time as unknown as string))
      : undefined,
  }));
}

interface TradingStore {
  // Data
  trades: Trade[];
  positions: Position[];
  markets: Market[];
  alerts: Alert[];
  insights: AIInsight[];
  chatMessages: ChatMessage[];
  
  // UI State
  viewMode: ViewMode;
  filterState: FilterState;
  selectedTimeRange: TimeRange;
  isLoading: boolean;
  error: string | null;
  
  // Settings
  settings: UserSettings;
  
  // Actions - Data
  setTrades: (trades: Trade[]) => void;
  addTrades: (trades: Trade[]) => void;
  updateTrade: (id: string, updates: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  clearTrades: () => void;
  
  setPositions: (positions: Position[]) => void;
  setMarkets: (markets: Market[]) => void;
  
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: string) => void;
  clearAlerts: () => void;
  
  addInsight: (insight: AIInsight) => void;
  clearInsights: () => void;
  
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  
  // Actions - UI
  setViewMode: (mode: ViewMode) => void;
  setFilterState: (filter: Partial<FilterState>) => void;
  setTimeRange: (range: TimeRange) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Actions - Settings
  updateSettings: (settings: Partial<UserSettings>) => void;
}

const defaultFilterState: FilterState = {
  platform: 'all',
  status: 'all',
  direction: 'all',
  dateRange: '1M',
  searchQuery: '',
  tags: [],
};

const defaultSettings: UserSettings = {
  theme: 'dark',
  currency: 'USD',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notifications: {
    email: false,
    push: true,
    sms: false,
  },
  risk_limits: {
    max_position_size: 1000,
    max_daily_loss: 500,
    max_drawdown: 2000,
  },
  api_keys: {},
};

export const useTradingStore = create<TradingStore>()(
  persist(
    (set) => ({
      // Initial Data
      trades: [],
      positions: [],
      markets: [],
      alerts: [],
      insights: [],
      chatMessages: [],
      
      // Initial UI State
      viewMode: 'dashboard',
      filterState: defaultFilterState,
      selectedTimeRange: '1M',
      isLoading: false,
      error: null,
      
      // Initial Settings
      settings: defaultSettings,
      
      // Data Actions
      setTrades: (trades) => set({ trades }),
      addTrades: (newTrades) => set((state) => ({ 
        trades: [...state.trades, ...newTrades] 
      })),
      updateTrade: (id, updates) => set((state) => ({
        trades: state.trades.map((t) => 
          t.id === id ? { ...t, ...updates } : t
        ),
      })),
      deleteTrade: (id) => set((state) => ({
        trades: state.trades.filter((t) => t.id !== id),
      })),
      clearTrades: () => set({ trades: [] }),
      
      setPositions: (positions) => set({ positions }),
      setMarkets: (markets) => set({ markets }),
      
      addAlert: (alert) => set((state) => ({
        alerts: [alert, ...state.alerts].slice(0, 100),
      })),
      acknowledgeAlert: (id) => set((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === id ? { ...a, acknowledged: true } : a
        ),
      })),
      clearAlerts: () => set({ alerts: [] }),
      
      addInsight: (insight) => set((state) => ({
        insights: [insight, ...state.insights].slice(0, 50),
      })),
      clearInsights: () => set({ insights: [] }),
      
      addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, message],
      })),
      clearChat: () => set({ chatMessages: [] }),
      
      // UI Actions
      setViewMode: (viewMode) => set({ viewMode }),
      setFilterState: (filter) => set((state) => ({
        filterState: { ...state.filterState, ...filter },
      })),
      setTimeRange: (selectedTimeRange) => set({ selectedTimeRange }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      
      // Settings Actions
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings },
      })),
    }),
    {
      name: 'praxis-trading-store',
      partialize: (state) => ({
        trades: state.trades,
        settings: state.settings,
      }),
      storage: {
        getItem: (name) => {
          const str = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
          if (!str) return null;
          try {
            const parsed = JSON.parse(str);
            if (parsed?.state?.trades) parsed.state.trades = reviveTrades(parsed.state.trades);
            return parsed;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          if (typeof localStorage !== 'undefined') localStorage.setItem(name, typeof value === 'string' ? value : JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof localStorage !== 'undefined') localStorage.removeItem(name);
        },
      },
    }
  )
);

// Selector hooks for performance
export const useFilteredTrades = () => {
  const trades = useTradingStore((state) => state.trades);
  const filter = useTradingStore((state) => state.filterState);
  
  return trades.filter((trade) => {
    if (filter.platform !== 'all' && trade.platform !== filter.platform) return false;
    if (filter.status !== 'all' && trade.status !== filter.status) return false;
    if (filter.direction !== 'all' && trade.direction !== filter.direction) return false;
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      if (!trade.market_title.toLowerCase().includes(query) &&
          !trade.ticker.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });
};
