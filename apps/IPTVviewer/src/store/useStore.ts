import { create } from 'zustand';
import { Channel, Playlist, PlayerState, ChannelHistory } from '@/types';

export interface AdConfig {
  enabled: boolean;
  volumeReductionPercent: number;
}

export interface SleepTimerConfig {
  enabled: boolean;
  durationMinutes: number;
  remainingSeconds: number;
}

export interface ChannelPosition {
  channelId: string;
  position: number;
}

interface AppState extends PlayerState {
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  favorites: string[];
  adConfig: AdConfig;
  epgUrl: string;
  sleepTimer: SleepTimerConfig;
  channelPositions: ChannelPosition[];
  epgLastRefresh: number | null;

  setCurrentChannel: (channel: Channel) => void;
  goToPreviousChannel: () => void;
  addToHistory: (channelId: string) => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  addPlaylist: (playlist: Playlist) => void;
  setCurrentPlaylist: (playlist: Playlist) => void;
  toggleFavorite: (channelId: string) => void;
  setFavorites: (favorites: string[]) => void;
  setAdConfig: (config: Partial<AdConfig>) => void;
  setEpgUrl: (url: string) => void;
  setSleepTimer: (config: Partial<SleepTimerConfig>) => void;
  setChannelPosition: (channelId: string, position: number) => void;
  setEpgLastRefresh: (timestamp: number) => void;
}

const MAX_HISTORY = 50;

export const useStore = create<AppState>((set, get) => ({
  currentChannel: null,
  previousChannel: null,
  channelHistory: [],
  isPlaying: false,
  volume: 50,
  isMuted: false,
  playlists: [],
  currentPlaylist: null,
  favorites: [],
  adConfig: { enabled: true, volumeReductionPercent: 90 },
  epgUrl: '',
  sleepTimer: { enabled: false, durationMinutes: 30, remainingSeconds: 0 },
  channelPositions: [],
  epgLastRefresh: null,

  setCurrentChannel: (channel: Channel) => {
    const state = get();
    const previous = state.currentChannel;

    set({
      currentChannel: channel,
      previousChannel: previous,
    });

    get().addToHistory(channel.id);
  },

  goToPreviousChannel: () => {
    const { previousChannel } = get();
    if (previousChannel) {
      get().setCurrentChannel(previousChannel);
    }
  },

  addToHistory: (channelId: string) => {
    set((state) => {
      const newHistory: ChannelHistory[] = [
        { channelId, timestamp: new Date() },
        ...state.channelHistory.filter(h => h.channelId !== channelId),
      ].slice(0, MAX_HISTORY);

      return { channelHistory: newHistory };
    });
  },

  setPlaying: (playing: boolean) => set({ isPlaying: playing }),

  setVolume: (volume: number) => set((state) => ({
    volume,
    // Only set isMuted based on volume if user is adjusting volume
    // If volume > 0, unmute. If volume === 0, mute (unless already muted for other reasons)
    isMuted: volume === 0 ? true : false
  })),

  toggleMute: () => set((state) => ({
    isMuted: !state.isMuted,
    // When unmuting, restore to a default volume if at 0
    volume: !state.isMuted && state.volume === 0 ? 50 : state.volume
  })),

  addPlaylist: (playlist: Playlist) => {
    set((state) => ({
      playlists: [...state.playlists, playlist],
    }));
  },

  setCurrentPlaylist: (playlist: Playlist) => set({ currentPlaylist: playlist }),

  toggleFavorite: (channelId: string) => {
    set((state) => {
      const isFavorite = state.favorites.includes(channelId);
      return {
        favorites: isFavorite
          ? state.favorites.filter(id => id !== channelId)
          : [...state.favorites, channelId],
      };
    });
  },

  setFavorites: (favorites: string[]) => set({ favorites }),

  setAdConfig: (config: Partial<AdConfig>) =>
    set((state) => ({
      adConfig: { ...state.adConfig, ...config },
    })),

  setEpgUrl: (url: string) => set({ epgUrl: url }),

  setSleepTimer: (config: Partial<SleepTimerConfig>) =>
    set((state) => ({
      sleepTimer: { ...state.sleepTimer, ...config },
    })),

  setChannelPosition: (channelId: string, position: number) =>
    set((state) => {
      const existing = state.channelPositions.find(p => p.channelId === channelId);
      if (existing) {
        return {
          channelPositions: state.channelPositions.map(p =>
            p.channelId === channelId ? { ...p, position } : p
          ),
        };
      }
      return {
        channelPositions: [...state.channelPositions, { channelId, position }],
      };
    }),

  setEpgLastRefresh: (timestamp: number) => set({ epgLastRefresh: timestamp }),
}));
