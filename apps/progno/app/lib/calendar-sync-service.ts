/**
 * Calendar Sync Service
 * Add picks to Google/Outlook calendars with game times and reminders
 */

import { createClient } from '@supabase/supabase-js';

export interface CalendarEvent {
  pickId: string;
  title: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  pick: string;
  sport: string;
  odds: number;
  confidence: number;
  reminderMinutes: number;
}

export interface CalendarSyncOptions {
  provider: 'google' | 'outlook' | 'apple';
  userEmail: string;
  reminderMinutes: number;
  includeAllPicks: boolean;
  tiers: ('elite' | 'pro' | 'free')[];
}

export class CalendarSyncService {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials required');
    }
    this.supabase = createClient(url, key);
  }

  /**
   * Generate Google Calendar URL for a pick
   */
  generateGoogleCalendarUrl(event: CalendarEvent): string {
    const startTime = new Date(event.gameTime);
    const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours later

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `🎯 ${event.pick} (${event.sport})`,
      details: this.generateEventDescription(event),
      location: `${event.awayTeam} @ ${event.homeTeam}`,
      dates: `${this.formatDate(startTime)}/${this.formatDate(endTime)}`,
      reminders: `PT${event.reminderMinutes}M`,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /**
   * Generate Outlook Calendar URL
   */
  generateOutlookCalendarUrl(event: CalendarEvent): string {
    const startTime = new Date(event.gameTime);
    const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      subject: `🎯 ${event.pick} (${event.sport})`,
      body: this.generateEventDescription(event),
      location: `${event.awayTeam} @ ${event.homeTeam}`,
      startdt: startTime.toISOString(),
      enddt: endTime.toISOString(),
      allday: 'false',
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  }

  /**
   * Generate iCalendar (.ics) file content
   */
  generateICalContent(event: CalendarEvent): string {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const startTime = new Date(event.gameTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endTime = new Date(new Date(event.gameTime).getTime() + 3 * 60 * 60 * 1000)
      .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PROGNO//Betting Picks//EN
BEGIN:VEVENT
UID:${event.pickId}@progno.ai
DTSTAMP:${now}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:🎯 ${event.pick} (${event.sport})
DESCRIPTION:${this.escapeICal(this.generateEventDescription(event))}
LOCATION:${event.awayTeam} @ ${event.homeTeam}
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Game starting soon!
TRIGGER:-PT${event.reminderMinutes}M
END:VALARM
END:VEVENT
END:VCALENDAR`;
  }

  /**
   * Sync multiple picks to calendar
   */
  async syncPicksToCalendar(
    picks: CalendarEvent[],
    options: CalendarSyncOptions
  ): Promise<{ success: boolean; urls: string[]; errors: string[] }> {
    const urls: string[] = [];
    const errors: string[] = [];

    // Filter by tier if specified
    const filteredPicks = options.tiers && options.tiers.length > 0
      ? picks // In real implementation, would filter by pick tier
      : picks;

    for (const pick of filteredPicks) {
      try {
        let url: string;

        switch (options.provider) {
          case 'google':
            url = this.generateGoogleCalendarUrl({ ...pick, reminderMinutes: options.reminderMinutes });
            break;
          case 'outlook':
            url = this.generateOutlookCalendarUrl({ ...pick, reminderMinutes: options.reminderMinutes });
            break;
          case 'apple':
            // Apple Calendar uses .ics files
            url = `data:text/calendar;charset=utf8,${encodeURIComponent(
              this.generateICalContent({ ...pick, reminderMinutes: options.reminderMinutes })
            )}`;
            break;
          default:
            url = this.generateGoogleCalendarUrl({ ...pick, reminderMinutes: options.reminderMinutes });
        }

        urls.push(url);

        // Store sync record
        await this.storeSyncRecord({
          pickId: pick.pickId,
          userEmail: options.userEmail,
          provider: options.provider,
          syncedAt: new Date().toISOString(),
          reminderMinutes: options.reminderMinutes,
        });
      } catch (error) {
        errors.push(`Failed to sync pick ${pick.pickId}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      urls,
      errors,
    };
  }

  /**
   * Generate batch .ics file for multiple picks
   */
  generateBatchICal(picks: CalendarEvent[]): string {
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PROGNO//Betting Picks//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH`;

    for (const event of picks) {
      const startTime = new Date(event.gameTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endTime = new Date(new Date(event.gameTime).getTime() + 3 * 60 * 60 * 1000)
        .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      ical += `
BEGIN:VEVENT
UID:${event.pickId}@progno.ai
DTSTAMP:${now}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:🎯 ${event.pick} (${event.sport})
DESCRIPTION:${this.escapeICal(this.generateEventDescription(event))}
LOCATION:${event.awayTeam} @ ${event.homeTeam}
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Game starting soon!
TRIGGER:-PT${event.reminderMinutes}M
END:VALARM
END:VEVENT`;
    }

    ical += '\nEND:VCALENDAR';
    return ical;
  }

  /**
   * Get upcoming games with picks for calendar sync
   */
  async getUpcomingPicksForCalendar(
    userId: string,
    days: number = 7
  ): Promise<CalendarEvent[]> {
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from('saved_picks')
      .select(`
        id,
        pick,
        sport,
        odds,
        confidence,
        game_time,
        games:game_id (home_team, away_team)
      `)
      .eq('user_id', userId)
      .gte('game_time', startDate)
      .lte('game_time', endDate)
      .order('game_time', { ascending: true });

    if (error || !data) {
      console.error('[Calendar] Error fetching picks:', error);
      return [];
    }

    return data.map((item: any) => ({
      pickId: item.id,
      title: item.pick,
      gameTime: item.game_time,
      homeTeam: item.games?.home_team || 'TBD',
      awayTeam: item.games?.away_team || 'TBD',
      pick: item.pick,
      sport: item.sport,
      odds: item.odds,
      confidence: item.confidence,
      reminderMinutes: 30, // Default reminder
    }));
  }

  /**
   * Schedule automatic reminders for high-confidence picks
   */
  async scheduleHighConfidenceReminders(
    userId: string,
    minConfidence: number = 75
  ): Promise<{ scheduled: number; picks: CalendarEvent[] }> {
    const picks = await this.getUpcomingPicksForCalendar(userId, 3);
    
    const highConfPicks = picks.filter(p => p.confidence >= minConfidence);

    // In a real implementation, this would integrate with a notification service
    // like Firebase Cloud Messaging or email service
    
    return {
      scheduled: highConfPicks.length,
      picks: highConfPicks,
    };
  }

  private generateEventDescription(event: CalendarEvent): string {
    const parts = [
      `PROGNO Pick: ${event.pick}`,
      ``,
      `Sport: ${event.sport}`,
      `Game: ${event.awayTeam} @ ${event.homeTeam}`,
      `Odds: ${event.odds > 0 ? '+' : ''}${event.odds}`,
      `Confidence: ${event.confidence}%`,
      ``,
      `Good luck! 🍀`,
    ];

    return parts.join('\n');
  }

  private formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private escapeICal(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }

  private async storeSyncRecord(record: {
    pickId: string;
    userEmail: string;
    provider: string;
    syncedAt: string;
    reminderMinutes: number;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('calendar_syncs')
      .insert({
        pick_id: record.pickId,
        user_email: record.userEmail,
        provider: record.provider,
        synced_at: record.syncedAt,
        reminder_minutes: record.reminderMinutes,
      });

    if (error) {
      console.error('[Calendar] Error storing sync record:', error);
    }
  }

  /**
   * Generate calendar widget for embedding
   */
  generateCalendarWidget(picks: CalendarEvent[]): string {
    const events = picks.map(p => ({
      title: `${p.pick} (${p.sport})`,
      start: p.gameTime,
      end: new Date(new Date(p.gameTime).getTime() + 3 * 60 * 60 * 1000).toISOString(),
      color: p.confidence >= 80 ? '#4CAF50' : p.confidence >= 65 ? '#FF9800' : '#f44336',
    }));

    return JSON.stringify(events);
  }
}

export default CalendarSyncService;
