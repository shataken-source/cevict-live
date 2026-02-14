/**
 * Solunar Tables Calculation System
 * 
 * Solunar theory predicts peak fish feeding times based on moon position and phase.
 * Major and minor periods indicate when fish are most active.
 * 
 * Calculation Method:
 * - Major Periods (90-120 minutes): When moon is overhead or underfoot
 * - Minor Periods (30-60 minutes): Moon rise and moon set
 * - Best Days: New moon and full moon (±3 days)
 * - Rating Boost: +20% activity during major periods, +10% during minor
 */

export interface MoonPosition {
  azimuth: number;        // degrees
  altitude: number;       // degrees
  distance: number;       // Earth radii
  phase: number;          // 0-1 (0 = new moon, 0.5 = full moon)
  phaseName: MoonPhaseName;
  illumination: number;   // percentage (0-100)
}

export interface MoonTimes {
  rise: string;
  set: string;
  transit: string;        // moon overhead (major period)
  underfoot: string;      // moon underfoot (major period)
}

export interface SolunarPeriod {
  type: 'major' | 'minor';
  start: string;
  end: string;
  peak: string;
  rating: number;         // 0-100
  description: string;
}

export interface SolunarDay {
  date: string;
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  moon: MoonPosition;
  moonTimes: MoonTimes;
  periods: SolunarPeriod[];
  dayRating: {
    score: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    description: string;
  };
  nextDayRating: number;
  calculatedAt: string;
}

export type MoonPhaseName = 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' | 'full' | 'waning_gibbous' | 'third_quarter' | 'waning_crescent';

export class SolunarTables {
  private static instance: SolunarTables;
  
  // Moon phase calculation constants
  private readonly LUNAR_CYCLE = 29.53058867; // days
  private readonly NEW_MOON_REF = new Date('2000-01-06T18:14:00Z'); // Known new moon
  
  // Period durations (in minutes)
  private readonly MAJOR_PERIOD_DURATION = 90;
  private readonly MINOR_PERIOD_DURATION = 45;

  public static getInstance(): SolunarTables {
    if (!SolunarTables.instance) {
      SolunarTables.instance = new SolunarTables();
    }
    return SolunarTables.instance;
  }

  /**
   * Calculate solunar data for a specific date and location
   */
  public async calculateSolunarDay(
    date: Date,
    latitude: number,
    longitude: number,
    timezone: string
  ): Promise<SolunarDay> {
    // Calculate moon position and phase
    const moonPosition = this.calculateMoonPosition(date, latitude, longitude);
    
    // Calculate moon times (rise, set, transit, underfoot)
    const moonTimes = this.calculateMoonTimes(date, latitude, longitude, timezone);
    
    // Calculate solunar periods
    const periods = this.calculateSolunarPeriods(date, moonTimes, timezone);
    
    // Calculate day rating
    const dayRating = this.calculateDayRating(moonPosition.phase, periods);
    
    // Calculate next day rating for comparison
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDayRating = this.calculateDayRating(
      this.calculateMoonPosition(tomorrow, latitude, longitude).phase,
      []
    ).score;

    return {
      date: date.toISOString().split('T')[0],
      location: { latitude, longitude, timezone },
      moon: moonPosition,
      moonTimes,
      periods,
      dayRating,
      nextDayRating,
      calculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate moon position for given date and location
   */
  private calculateMoonPosition(date: Date, latitude: number, longitude: number): MoonPosition {
    // Simplified moon position calculation
    // In production, use a proper astronomical library
    
    const julianDate = this.getJulianDate(date);
    const daysSinceNewMoon = this.getDaysSinceNewMoon(julianDate);
    
    // Calculate moon phase (0-1)
    const phase = (daysSinceNewMoon % this.LUNAR_CYCLE) / this.LUNAR_CYCLE;
    
    // Calculate moon's position in its orbit
    const moonAge = daysSinceNewMoon % this.LUNAR_CYCLE;
    const moonElongation = (moonAge / this.LUNAR_CYCLE) * 360;
    
    // Approximate moon altitude and azimuth
    const hourAngle = this.getMoonHourAngle(date, longitude);
    const declination = this.getMoonDeclination(moonElongation);
    
    const altitude = this.calculateAltitude(declination, latitude, hourAngle);
    const azimuth = this.calculateAzimuth(declination, latitude, hourAngle);
    
    // Calculate illumination
    const illumination = Math.abs(Math.cos(moonElongation * Math.PI / 180)) * 100;
    
    return {
      azimuth,
      altitude,
      distance: 60, // Approximate (Earth radii)
      phase,
      phaseName: this.getMoonPhaseName(phase),
      illumination,
    };
  }

  /**
   * Calculate moon times for given date and location
   */
  private calculateMoonTimes(
    date: Date,
    latitude: number,
    longitude: number,
    timezone: string
  ): MoonTimes {
    // Simplified moon time calculations
    // In production, use precise astronomical calculations
    
    const moonPosition = this.calculateMoonPosition(date, latitude, longitude);
    const moonAge = this.getMoonAge(date);
    
    // Approximate moonrise and moonset
    const moonrise = new Date(date);
    moonrise.setHours(6, 0, 0, 0);
    moonrise.setMinutes(moonrise.getMinutes() + Math.round(moonAge * 50)); // Rough approximation
    
    const moonset = new Date(date);
    moonset.setHours(18, 0, 0, 0);
    moonset.setMinutes(moonset.getMinutes() + Math.round(moonAge * 50));
    
    // Transit (moon overhead) - approximately 6 hours after moonrise
    const transit = new Date(moonrise);
    transit.setHours(transit.getHours() + 6);
    
    // Underfoot - approximately 12 hours after transit
    const underfoot = new Date(transit);
    underfoot.setHours(underfoot.getHours() + 12);
    
    return {
      rise: this.formatTime(moonrise, timezone),
      set: this.formatTime(moonset, timezone),
      transit: this.formatTime(transit, timezone),
      underfoot: this.formatTime(underfoot, timezone),
    };
  }

  /**
   * Calculate solunar periods (major and minor)
   */
  private calculateSolunarPeriods(
    date: Date,
    moonTimes: MoonTimes,
    timezone: string
  ): SolunarPeriod[] {
    const periods: SolunarPeriod[] = [];
    
    // Major periods around moon transit and underfoot
    const transit = this.parseTime(moonTimes.transit, timezone);
    const underfoot = this.parseTime(moonTimes.underfoot, timezone);
    
    periods.push(this.createPeriod('major', transit, 95, 'Moon overhead - peak feeding time'));
    periods.push(this.createPeriod('major', underfoot, 90, 'Moon underfoot - peak feeding time'));
    
    // Minor periods around moonrise and moonset
    const moonrise = this.parseTime(moonTimes.rise, timezone);
    const moonset = this.parseTime(moonTimes.set, timezone);
    
    periods.push(this.createPeriod('minor', moonrise, 70, 'Moonrise - increased activity'));
    periods.push(this.createPeriod('minor', moonset, 70, 'Moonset - increased activity'));
    
    // Sort by start time
    return periods.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  /**
   * Create a solunar period
   */
  private createPeriod(
    type: 'major' | 'minor',
    peakTime: Date,
    rating: number,
    description: string
  ): SolunarPeriod {
    const duration = type === 'major' ? this.MAJOR_PERIOD_DURATION : this.MINOR_PERIOD_DURATION;
    const start = new Date(peakTime.getTime() - (duration * 60 * 1000) / 2);
    const end = new Date(peakTime.getTime() + (duration * 60 * 1000) / 2);
    
    return {
      type,
      start: start.toISOString(),
      end: end.toISOString(),
      peak: peakTime.toISOString(),
      rating,
      description,
    };
  }

  /**
   * Calculate day rating based on moon phase and periods
   */
  private calculateDayRating(moonPhase: number, periods: SolunarPeriod[]): {
    score: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    description: string;
  } {
    let score = 50; // Base score
    
    // Moon phase influence
    const phaseDistance = Math.min(moonPhase, 1 - moonPhase);
    if (phaseDistance <= 0.1) {
      // New moon or full moon (±3 days)
      score += 30;
    } else if (phaseDistance <= 0.2) {
      score += 20;
    } else if (phaseDistance <= 0.3) {
      score += 10;
    }
    
    // Period quality
    const majorPeriods = periods.filter(p => p.type === 'major');
    const minorPeriods = periods.filter(p => p.type === 'minor');
    
    if (majorPeriods.length >= 2) {
      score += 20;
    } else if (majorPeriods.length >= 1) {
      score += 15;
    }
    
    if (minorPeriods.length >= 2) {
      score += 10;
    } else if (minorPeriods.length >= 1) {
      score += 5;
    }
    
    // Determine quality
    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    let description: string;
    
    if (score >= 85) {
      quality = 'excellent';
      description = 'Exceptional day - prime fishing conditions';
    } else if (score >= 70) {
      quality = 'good';
      description = 'Very good day - above average activity';
    } else if (score >= 55) {
      quality = 'fair';
      description = 'Average day - normal activity expected';
    } else {
      quality = 'poor';
      description = 'Below average day - challenging conditions';
    }
    
    return { score: Math.max(0, Math.min(100, score)), quality, description };
  }

  /**
   * Get moon phase name from phase value
   */
  private getMoonPhaseName(phase: number): MoonPhaseName {
    const phaseNames: MoonPhaseName[] = [
      'new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
      'full', 'waning_gibbous', 'third_quarter', 'waning_crescent'
    ];
    
    const index = Math.floor(phase * 8) % 8;
    return phaseNames[index];
  }

  /**
   * Get Julian date for a given date
   */
  private getJulianDate(date: Date): number {
    return date.getTime() / (1000 * 60 * 60 * 24) + 2440587.5;
  }

  /**
   * Get days since known new moon
   */
  private getDaysSinceNewMoon(julianDate: number): number {
    const newMoonJulian = this.getJulianDate(this.NEW_MOON_REF);
    return julianDate - newMoonJulian;
  }

  /**
   * Get moon age in days
   */
  private getMoonAge(date: Date): number {
    const julianDate = this.getJulianDate(date);
    return this.getDaysSinceNewMoon(julianDate) % this.LUNAR_CYCLE;
  }

  /**
   * Calculate moon hour angle
   */
  private getMoonHourAngle(date: Date, longitude: number): number {
    // Simplified calculation
    const hoursSinceNoon = (date.getUTCHours() - 12 + date.getUTCMinutes() / 60);
    return (hoursSinceNoon * 15 + longitude) % 360;
  }

  /**
   * Calculate moon declination
   */
  private getMoonDeclination(moonElongation: number): number {
    // Simplified calculation - moon's orbital inclination is ~5.1°
    return 5.1 * Math.sin(moonElongation * Math.PI / 180);
  }

  /**
   * Calculate altitude
   */
  private calculateAltitude(declination: number, latitude: number, hourAngle: number): number {
    const latRad = latitude * Math.PI / 180;
    const decRad = declination * Math.PI / 180;
    const haRad = hourAngle * Math.PI / 180;
    
    const altitude = Math.asin(
      Math.sin(latRad) * Math.sin(decRad) +
      Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
    );
    
    return altitude * 180 / Math.PI;
  }

  /**
   * Calculate azimuth
   */
  private calculateAzimuth(declination: number, latitude: number, hourAngle: number): number {
    const latRad = latitude * Math.PI / 180;
    const decRad = declination * Math.PI / 180;
    const haRad = hourAngle * Math.PI / 180;
    
    const azimuth = Math.atan2(
      -Math.sin(haRad),
      Math.tan(decRad) * Math.cos(latRad) - Math.sin(latRad) * Math.cos(haRad)
    );
    
    return (azimuth * 180 / Math.PI + 360) % 360;
  }

  /**
   * Format time for timezone
   */
  private formatTime(date: Date, timezone: string): string {
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /**
   * Parse time string to Date object
   */
  private parseTime(timeString: string, timezone: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Get current solunar period
   */
  public getCurrentPeriod(solunarDay: SolunarDay): SolunarPeriod | null {
    const now = new Date();
    
    for (const period of solunarDay.periods) {
      const start = new Date(period.start);
      const end = new Date(period.end);
      
      if (now >= start && now <= end) {
        return period;
      }
    }
    
    return null;
  }

  /**
   * Get next solunar period
   */
  public getNextPeriod(solunarDay: SolunarDay): SolunarPeriod | null {
    const now = new Date();
    
    for (const period of solunarDay.periods) {
      const start = new Date(period.start);
      
      if (start > now) {
        return period;
      }
    }
    
    return null;
  }

  /**
   * Get solunar rating display info
   */
  public getRatingDisplay(rating: number): {
    color: string;
    stars: string;
    label: string;
  } {
    if (rating >= 85) {
      return { color: '#10b981', stars: '⭐⭐⭐⭐⭐', label: 'Excellent' };
    } else if (rating >= 70) {
      return { color: '#3b82f6', stars: '⭐⭐⭐⭐', label: 'Good' };
    } else if (rating >= 55) {
      return { color: '#f59e0b', stars: '⭐⭐⭐', label: 'Fair' };
    } else {
      return { color: '#ef4444', stars: '⭐⭐', label: 'Poor' };
    }
  }

  /**
   * Calculate best fishing times for a week
   */
  public async getWeeklySolunar(
    startDate: Date,
    latitude: number,
    longitude: number,
    timezone: string
  ): Promise<SolunarDay[]> {
    const week: SolunarDay[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const solunarDay = await this.calculateSolunarDay(date, latitude, longitude, timezone);
      week.push(solunarDay);
    }
    
    return week;
  }

  /**
   * Get peak fishing days for a month
   */
  public async getMonthlyPeakDays(
    year: number,
    month: number,
    latitude: number,
    longitude: number,
    timezone: string
  ): Promise<{
    date: string;
    rating: number;
    quality: string;
  }[]> {
    const peakDays: {
      date: string;
      rating: number;
      quality: string;
    }[] = [];
    
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const solunarDay = await this.calculateSolunarDay(date, latitude, longitude, timezone);
      
      if (solunarDay.dayRating.score >= 70) {
        peakDays.push({
          date: solunarDay.date,
          rating: solunarDay.dayRating.score,
          quality: solunarDay.dayRating.quality,
        });
      }
    }
    
    return peakDays.sort((a, b) => b.rating - a.rating);
  }
}

export default SolunarTables;
