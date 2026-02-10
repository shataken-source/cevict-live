import {Channel} from '@/types';

export interface WatchSession {
  channelId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  dayOfWeek: number;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface ViewingInsights {
  mostWatched: Array<{channelId: string; count: number; totalMinutes: number}>;
  avgSessionDuration: number;
  peakHours: Array<{hour: number; sessions: number}>;
  genrePreferences: Record<string, number>;
  watchStreak: number;
  totalWatchTime: number;
}

export class AnalyticsService {
  private sessions: WatchSession[] = [];
  private currentSession: WatchSession | null = null;
  
  startSession(channelId: string) {
    const now = new Date();
    this.currentSession = {
      channelId,
      startTime: now,
      duration: 0,
      dayOfWeek: now.getDay(),
      timeOfDay: this.getTimeOfDay(now),
    };
  }
  
  endSession() {
    if (this.currentSession) {
      const now = new Date();
      this.currentSession.endTime = now;
      this.currentSession.duration = 
        (now.getTime() - this.currentSession.startTime.getTime()) / 1000 / 60; // minutes
      
      this.sessions.push(this.currentSession);
      this.currentSession = null;
    }
  }
  
  getInsights(): ViewingInsights {
    const channelCounts = new Map<string, {count: number; totalMinutes: number}>();
    const hourCounts = new Map<number, number>();
    const genreCounts = new Map<string, number>();
    
    let totalDuration = 0;
    
    this.sessions.forEach(session => {
      // Most watched
      const current = channelCounts.get(session.channelId) || {count: 0, totalMinutes: 0};
      channelCounts.set(session.channelId, {
        count: current.count + 1,
        totalMinutes: current.totalMinutes + session.duration,
      });
      
      // Peak hours
      const hour = session.startTime.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      
      totalDuration += session.duration;
    });
    
    return {
      mostWatched: Array.from(channelCounts.entries())
        .map(([channelId, stats]) => ({channelId, ...stats}))
        .sort((a, b) => b.totalMinutes - a.totalMinutes)
        .slice(0, 10),
      avgSessionDuration: totalDuration / this.sessions.length || 0,
      peakHours: Array.from(hourCounts.entries())
        .map(([hour, sessions]) => ({hour, sessions}))
        .sort((a, b) => b.sessions - a.sessions),
      genrePreferences: Object.fromEntries(genreCounts),
      watchStreak: this.calculateStreak(),
      totalWatchTime: totalDuration,
    };
  }
  
  getRecommendations(allChannels: Channel[], currentChannel: Channel): Channel[] {
    const insights = this.getInsights();
    const topGenres = Object.keys(insights.genrePreferences)
      .sort((a, b) => insights.genrePreferences[b] - insights.genrePreferences[a])
      .slice(0, 3);
    
    // Recommend channels from favorite genres that haven't been watched much
    const watchedIds = new Set(insights.mostWatched.map(w => w.channelId));
    
    return allChannels
      .filter(ch => 
        !watchedIds.has(ch.id) && 
        ch.id !== currentChannel.id &&
        topGenres.some(genre => ch.group?.toLowerCase().includes(genre.toLowerCase()))
      )
      .slice(0, 10);
  }
  
  private getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }
  
  private calculateStreak(): number {
    // Calculate consecutive days of watching
    const uniqueDays = new Set(
      this.sessions.map(s => s.startTime.toDateString())
    );
    
    let streak = 0;
    let currentDate = new Date();
    
    while (uniqueDays.has(currentDate.toDateString())) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  }
}
