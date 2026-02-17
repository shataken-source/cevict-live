import { useStore } from '@/store/useStore';

export type SleepTimerCallback = () => void;

class SleepTimerServiceImpl {
  private timer: ReturnType<typeof setInterval> | null = null;
  private onTimerEnd: SleepTimerCallback | null = null;

  /**
   * Start sleep timer
   * @param durationMinutes - Duration in minutes
   * @param onEnd - Callback when timer ends
   */
  start(durationMinutes: number, onEnd?: SleepTimerCallback): void {
    this.stop();

    const totalSeconds = durationMinutes * 60;
    let remaining = totalSeconds;

    // Update store every second
    this.timer = setInterval(() => {
      remaining--;

      useStore.getState().setSleepTimer({
        enabled: true,
        durationMinutes,
        remainingSeconds: remaining,
      });

      if (remaining <= 0) {
        this.stop();
        if (onEnd) {
          onEnd();
        }
      }
    }, 1000);
  }

  /**
   * Stop sleep timer
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    useStore.getState().setSleepTimer({
      enabled: false,
      remainingSeconds: 0,
    });
  }

  /**
   * Pause sleep timer (keeps remaining time)
   */
  pause(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Resume sleep timer
   */
  resume(onEnd?: SleepTimerCallback): void {
    const { sleepTimer } = useStore.getState();
    if (sleepTimer.enabled && sleepTimer.remainingSeconds > 0) {
      const remainingMinutes = Math.ceil(sleepTimer.remainingSeconds / 60);
      this.start(remainingMinutes, onEnd);
    }
  }

  /**
   * Get remaining time formatted
   */
  getFormattedRemaining(): string {
    const { sleepTimer } = useStore.getState();
    if (!sleepTimer.enabled || sleepTimer.remainingSeconds <= 0) {
      return '';
    }

    const minutes = Math.floor(sleepTimer.remainingSeconds / 60);
    const seconds = sleepTimer.remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Check if timer is active
   */
  isActive(): boolean {
    return this.timer !== null;
  }
}

export const SleepTimerService = new SleepTimerServiceImpl();
