export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvgId?: string;
  country?: string;
  channelNumber?: string;
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
  channels: Channel[];
  lastUpdated: Date;
  expiresAt?: Date;
}

export interface EPGProgram {
  start: Date;
  end: Date;
  title: string;
  description?: string;
  channelId: string;
  genre?: string;
  episode?: string;
  rating?: string;
}

export interface EPGChannel {
  channel: Channel;
  currentProgram: EPGProgram | null;
  upcomingPrograms: EPGProgram[];
}

export interface EPGGenreColor {
  [genre: string]: string;
}

export const EPG_GENRES: EPGGenreColor = {
  'News': '#FF6B6B',
  'Sports': '#4ECDC4',
  'Movie': '#9B59B6',
  'Entertainment': '#F39C12',
  'Kids': '#3498DB',
  'Music': '#E74C3C',
  'Documentary': '#1ABC9C',
  'Default': '#95A5A6',
};

// EPG Grid configuration
export interface EPGConfig {
  timeSlotWidth: number;
  channelRowHeight: number;
  headerHeight: number;
  sidebarWidth: number;
  programMinWidth: number;
  backgroundColor: string;
  textColor: string;
  highlightColor: string;
  currentTimeColor: string;
}

export const EPG_CONFIG: EPGConfig = {
  timeSlotWidth: 120,
  channelRowHeight: 80,
  headerHeight: 60,
  sidebarWidth: 140,
  programMinWidth: 60,
  backgroundColor: '#1a1a1a',
  textColor: '#FFFFFF',
  highlightColor: '#007AFF',
  currentTimeColor: '#FF3B30',
};

export interface ChannelHistory {
  channelId: string;
  timestamp: Date;
}

export interface PlayerState {
  currentChannel: Channel | null;
  previousChannel: Channel | null;
  channelHistory: ChannelHistory[];
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
}
