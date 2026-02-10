export interface SleepTimerConfig {
  enabled: boolean;
  duration: number;
  fadeOutDuration: number;
  action: 'pause' | 'stop' | 'exit';
}

export interface WakeUpConfig {
  enabled: boolean;
  time: string;
  channelId: string;
  volume: number;
  fadeInDuration: number;
  days: number[];
}

export class SleepTimerService {
  private sleepTimer: NodeJS.Timeout | null = null;
  private wakeUpTimer: NodeJS.Timeout | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  
  setSleepTimer(minutes: number, onComplete: () => void) {
    this.clearSleepTimer();
    
    console.log(`Sleep timer set for ${minutes} minutes`);
    
    this.sleepTimer = setTimeout(() => {
      this.fadeOutAndStop(onComplete);
    }, minutes * 60 * 1000);
  }
  
  private async fadeOutAndStop(onComplete: () => void) {
    console.log('Sleep timer triggered - fading out...');
    // Gradually reduce volume over 30 seconds
    // Then pause/stop playback
    // Show notification
    
    onComplete();
    
    // Optional: Show "Sweet dreams!" message
  }
  
  clearSleepTimer() {
    if (this.sleepTimer) {
      clearTimeout(this.sleepTimer);
      this.sleepTimer = null;
    }
  }
  
  setWakeUpTimer(time: string, channelId: string, onWakeUp: (channelId: string) => void) {
    this.clearWakeUpTimer();
    
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const wakeUpTime = new Date();
    wakeUpTime.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, set for tomorrow
    if (wakeUpTime <= now) {
      wakeUpTime.setDate(wakeUpTime.getDate() + 1);
    }
    
    const msUntilWakeUp = wakeUpTime.getTime() - now.getTime();
    
    console.log(`Wake up alarm set for ${time}`);
    
    this.wakeUpTimer = setTimeout(() => {
      this.fadeInAndStart(channelId, onWakeUp);
    }, msUntilWakeUp);
  }
  
  private async fadeInAndStart(channelId: string, onWakeUp: (channelId: string) => void) {
    console.log('Good morning! Starting channel...');
    // Gradually increase volume over 60 seconds
    // Start playing specified channel
    
    onWakeUp(channelId);
    
    // Optional: Show "Good morning!" message
  }
  
  clearWakeUpTimer() {
    if (this.wakeUpTimer) {
      clearTimeout(this.wakeUpTimer);
      this.wakeUpTimer = null;
    }
  }
  
  startInactivityDetection(timeoutMinutes: number, onInactive: () => void) {
    this.resetInactivityTimer(timeoutMinutes, onInactive);
  }
  
  resetInactivityTimer(timeoutMinutes: number, onInactive: () => void) {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    
    this.inactivityTimer = setTimeout(() => {
      console.log('Inactivity detected - pausing...');
      onInactive();
    }, timeoutMinutes * 60 * 1000);
  }
  
  stopInactivityDetection() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }
  
  // Quick presets
  getQuickTimers() {
    return [
      {label: '15 minutes', value: 15},
      {label: '30 minutes', value: 30},
      {label: '45 minutes', value: 45},
      {label: '1 hour', value: 60},
      {label: '2 hours', value: 120},
    ];
  }
}
