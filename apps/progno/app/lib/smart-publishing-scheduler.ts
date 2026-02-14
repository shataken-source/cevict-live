/**
 * Smart Publishing Scheduler
 * Manages wave releases of picks at optimal times
 */

export interface PublishWave {
  tier: 'elite' | 'pro' | 'free';
  scheduledTime: string;
  picks: string[];
  status: 'pending' | 'published' | 'failed';
  publishedAt?: string;
  error?: string;
}

export interface PublishingSchedule {
  date: string;
  waves: PublishWave[];
  timezone: string;
  autoPublish: boolean;
}

export class SmartPublishingScheduler {
  private readonly DEFAULT_TIMES = {
    elite: '06:00',
    pro: '08:00',
    free: '10:00',
  };

  private schedules: Map<string, PublishingSchedule> = new Map();

  /**
   * Create publishing schedule for a date
   */
  createSchedule(
    date: string,
    picksByTier: Record<string, string[]>,
    customTimes?: Partial<typeof this.DEFAULT_TIMES>
  ): PublishingSchedule {
    const times = { ...this.DEFAULT_TIMES, ...customTimes };
    
    const waves: PublishWave[] = [
      {
        tier: 'elite',
        scheduledTime: times.elite,
        picks: picksByTier.elite || [],
        status: 'pending',
      },
      {
        tier: 'pro',
        scheduledTime: times.pro,
        picks: picksByTier.pro || [],
        status: 'pending',
      },
      {
        tier: 'free',
        scheduledTime: times.free,
        picks: picksByTier.free || [],
        status: 'pending',
      },
    ];

    const schedule: PublishingSchedule = {
      date,
      waves,
      timezone: 'America/Chicago',
      autoPublish: true,
    };

    this.schedules.set(date, schedule);
    return schedule;
  }

  /**
   * Check if any waves are ready to publish
   */
  checkPendingWaves(date: string): PublishWave[] {
    const schedule = this.schedules.get(date);
    if (!schedule) return [];

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return schedule.waves.filter(wave => 
      wave.status === 'pending' && wave.scheduledTime <= currentTime
    );
  }

  /**
   * Mark wave as published
   */
  markPublished(date: string, tier: string): void {
    const schedule = this.schedules.get(date);
    if (!schedule) return;

    const wave = schedule.waves.find(w => w.tier === tier);
    if (wave) {
      wave.status = 'published';
      wave.publishedAt = new Date().toISOString();
    }
  }

  /**
   * Get schedule for a date
   */
  getSchedule(date: string): PublishingSchedule | undefined {
    return this.schedules.get(date);
  }

  /**
   * Calculate optimal publish time based on game times
   */
  calculateOptimalTime(gameTimes: string[]): string {
    if (gameTimes.length === 0) return this.DEFAULT_TIMES.elite;

    // Convert to dates
    const dates = gameTimes.map(t => new Date(t));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));

    // Publish 6 hours before earliest game
    const publishTime = new Date(earliest.getTime() - 6 * 60 * 60 * 1000);
    
    // But not before 6 AM
    if (publishTime.getHours() < 6) {
      publishTime.setHours(6, 0, 0, 0);
    }

    return `${String(publishTime.getHours()).padStart(2, '0')}:00`;
  }
}

export default SmartPublishingScheduler;
