import {create} from 'zustand';
import {Channel, Playlist, PlayerState, ChannelHistory} from '@/types';

interface AppState extends PlayerState {
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  favorites: string[];
  
  setCurrentChannel: (channel: Channel) => void;
  goToPreviousChannel: () => void;
  addToHistory: (channelId: string) => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  
  addPlaylist: (playlist: Playlist) => void;
  setCurrentPlaylist: (playlist: Playlist) => void;
  toggleFavorite: (channelId: string) => void;
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
    const {previousChannel} = get();
    if (previousChannel) {
      get().setCurrentChannel(previousChannel);
    }
  },

  addToHistory: (channelId: string) => {
    set((state) => {
      const newHistory: ChannelHistory[] = [
        {channelId, timestamp: new Date()},
        ...state.channelHistory.filter(h => h.channelId !== channelId),
      ].slice(0, MAX_HISTORY);
      
      return {channelHistory: newHistory};
    });
  },

  setPlaying: (playing: boolean) => set({isPlaying: playing}),
  
  setVolume: (volume: number) => set({volume, isMuted: volume === 0}),
  
  toggleMute: () => set((state) => ({isMuted: !state.isMuted})),

  addPlaylist: (playlist: Playlist) => {
    set((state) => ({
      playlists: [...state.playlists, playlist],
    }));
  },

  setCurrentPlaylist: (playlist: Playlist) => set({currentPlaylist: playlist}),

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
}));
