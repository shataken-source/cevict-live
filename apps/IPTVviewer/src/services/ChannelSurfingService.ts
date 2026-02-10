import {Channel} from '@/types';

export type SurfingSpeed = 'slow' | 'medium' | 'fast' | 'ludicrous';

export class ChannelSurfingService {
  private surfingInterval: NodeJS.Timeout | null = null;
  private currentIndex: number = 0;
  
  private readonly SPEEDS = {
    slow: 5000,     // 5 seconds per channel
    medium: 2000,   // 2 seconds
    fast: 1000,     // 1 second
    ludicrous: 500, // 0.5 seconds (90s cable vibes!)
  };
  
  startSurfing(
    channels: Channel[],
    speed: SurfingSpeed,
    onChannelChange: (channel: Channel) => void
  ) {
    this.stopSurfing();
    this.currentIndex = 0;
    
    const interval = this.SPEEDS[speed];
    
    this.surfingInterval = setInterval(() => {
      if (this.currentIndex >= channels.length) {
        this.currentIndex = 0;
      }
      
      onChannelChange(channels[this.currentIndex]);
      this.currentIndex++;
    }, interval);
  }
  
  stopSurfing() {
    if (this.surfingInterval) {
      clearInterval(this.surfingInterval);
      this.surfingInterval = null;
    }
  }
  
  // Mosaic view - show 9 channels at once
  getMosaicLayout(channels: Channel[]): Channel[][] {
    const grid: Channel[][] = [];
    const gridSize = 3; // 3x3 grid
    
    for (let i = 0; i < gridSize; i++) {
      grid[i] = [];
      for (let j = 0; j < gridSize; j++) {
        const index = i * gridSize + j;
        if (index < channels.length) {
          grid[i][j] = channels[index];
        }
      }
    }
    
    return grid;
  }
  
  // Random channel (shake to randomize)
  getRandomChannel(channels: Channel[], excludeCurrent?: string): Channel {
    const available = channels.filter(ch => ch.id !== excludeCurrent);
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
  }
  
  // Channel preview mode (like old TV Guide channel)
  startPreviewMode(
    channels: Channel[],
    onPreview: (channel: Channel, duration: number) => void
  ) {
    // Show mini preview of each channel for 3 seconds
    const PREVIEW_DURATION = 3000;
    let index = 0;
    
    const previewInterval = setInterval(() => {
      if (index >= channels.length) {
        clearInterval(previewInterval);
        return;
      }
      
      onPreview(channels[index], PREVIEW_DURATION);
      index++;
    }, PREVIEW_DURATION);
  }
}
