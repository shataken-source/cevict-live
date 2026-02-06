export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvgId?: string;
  country?: string;
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
  channels: Channel[];
  lastUpdated: Date;
}

export interface EPGProgram {
  start: Date;
  end: Date;
  title: string;
  description?: string;
  channelId: string;
}

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
