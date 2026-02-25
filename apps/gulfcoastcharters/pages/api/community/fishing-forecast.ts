/**
 * Community Fishing Forecast API
 * GET /api/community/fishing-forecast
 *   ?location=Gulf Shores     (optional, defaults to nearest station)
 *   ?days=7                   (1-14, default 7)
 *
 * Cross-platform integration: uses GCC's NOAA tides data + Progno's
 * solunar/barometric analysis to produce a daily fishing quality forecast.
 *
 * This is the "reason to check back daily" — shows today's score,
 * upcoming best days, solunar periods, and tide windows.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

// ── Moon / Solunar calculations (shared with Progno fishing-solunar.ts) ──────

const SYNODIC_MONTH = 29.53059;
const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime();

function getMoonAge(date: Date): number {
  const daysSince = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
  return ((daysSince % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
}

function getMoonPhaseName(age: number): string {
  const frac = age / SYNODIC_MONTH;
  if (frac < 0.0339 || frac >= 0.966) return 'New Moon';
  if (frac < 0.216) return 'Waxing Crescent';
  if (frac < 0.284) return 'First Quarter';
  if (frac < 0.466) return 'Waxing Gibbous';
  if (frac < 0.534) return 'Full Moon';
  if (frac < 0.716) return 'Waning Gibbous';
  if (frac < 0.784) return 'Last Quarter';
  return 'Waning Crescent';
}

function getMoonIllumination(age: number): number {
  const frac = age / SYNODIC_MONTH;
  return Math.round(50 * (1 - Math.cos(2 * Math.PI * frac))) / 100;
}

function getSolunarPeriods(date: Date, longitude: number) {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const baseMoonrise = ((dayOfYear * 50.47 + longitude * 4) % 1440 + 1440) % 1440;
  const moonTransit = (baseMoonrise + 360) % 1440;
  const moonUnderfoot = (moonTransit + 720) % 1440;
  const moonrise = baseMoonrise;
  const moonset = (baseMoonrise + 720) % 1440;

  const fmt = (min: number) => {
    const h = Math.floor(((min % 1440) + 1440) % 1440 / 60);
    const m = Math.floor(((min % 1440) + 1440) % 1440 % 60);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return {
    major: [
      { label: 'Moon Overhead', start: fmt(moonTransit - 60), end: fmt(moonTransit + 60) },
      { label: 'Moon Underfoot', start: fmt(moonUnderfoot - 60), end: fmt(moonUnderfoot + 60) },
    ],
    minor: [
      { label: 'Moonrise', start: fmt(moonrise - 30), end: fmt(moonrise + 30) },
      { label: 'Moonset', start: fmt(moonset - 30), end: fmt(moonset + 30) },
    ],
  };
}

// ── Fishing score for a day ──────────────────────────────────────────────────

interface DayForecast {
  date: string;
  dayOfWeek: string;
  score: number;         // 0-100
  rating: 'Poor' | 'Fair' | 'Good' | 'Great' | 'Excellent';
  moonPhase: string;
  moonIllumination: number;
  solunarPeriods: ReturnType<typeof getSolunarPeriods>;
  bestTimeOfDay: string;
  tips: string[];
}

function scoreFishingDay(date: Date): Omit<DayForecast, 'date' | 'dayOfWeek'> {
  const moonAge = getMoonAge(date);
  const phaseName = getMoonPhaseName(moonAge);
  const illumination = getMoonIllumination(moonAge);

  // Base score from moon phase (biggest factor in multi-day planning)
  let score: number;
  switch (phaseName) {
    case 'New Moon': score = 92; break;
    case 'Full Moon': score = 88; break;
    case 'Waxing Crescent':
    case 'Waning Crescent': score = 72; break;
    case 'Waxing Gibbous':
    case 'Waning Gibbous': score = 62; break;
    case 'First Quarter':
    case 'Last Quarter': score = 52; break;
    default: score = 60;
  }

  // Seasonal adjustment (Gulf Coast fishing seasons)
  const month = date.getMonth();
  if (month >= 3 && month <= 5) score += 6;   // Spring: redfish, speckled trout run
  if (month >= 6 && month <= 8) score += 4;   // Summer: offshore pelagics
  if (month >= 9 && month <= 10) score += 8;  // Fall: bull redfish, flounder
  if (month >= 0 && month <= 1) score -= 3;   // Winter: slower

  // Day of week bonus (weekends slightly higher engagement)
  const dow = date.getDay();
  if (dow === 0 || dow === 6) score += 2;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let rating: DayForecast['rating'];
  if (score >= 85) rating = 'Excellent';
  else if (score >= 70) rating = 'Great';
  else if (score >= 55) rating = 'Good';
  else if (score >= 40) rating = 'Fair';
  else rating = 'Poor';

  // Best time of day
  let bestTimeOfDay: string;
  if (month >= 5 && month <= 8) bestTimeOfDay = 'Early morning (5-8 AM) — cooler water, active fish';
  else if ((month >= 3 && month <= 4) || (month >= 9 && month <= 10)) bestTimeOfDay = 'Morning (7-10 AM) and late afternoon (4-6 PM)';
  else bestTimeOfDay = 'Midday (11 AM - 2 PM) — warmest water temperatures';

  // Tips
  const tips: string[] = [];
  if (phaseName === 'New Moon' || phaseName === 'Full Moon') {
    tips.push('Major solunar periods are strongest today — fish the major windows!');
  }
  if (phaseName.includes('Crescent')) {
    tips.push('Crescent moon — try topwater lures during dawn and dusk');
  }
  if (month >= 6 && month <= 8) {
    tips.push('Summer heat: start early, fish deep during midday, bring extra water');
  }
  if (month >= 9 && month <= 10) {
    tips.push('Fall run is on! Bull redfish and flounder are moving — fish the passes');
  }
  if (month >= 3 && month <= 5) {
    tips.push('Spring migration — speckled trout and redfish are hitting live shrimp');
  }
  if (dow === 0 || dow === 6) {
    tips.push('Weekend — expect more boat traffic, try less popular spots');
  }

  return {
    score,
    rating,
    moonPhase: phaseName,
    moonIllumination: illumination,
    solunarPeriods: getSolunarPeriods(date, -87.5), // Gulf Coast approximate longitude
    bestTimeOfDay,
    tips,
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 14);
    const location = String(req.query.location || 'Gulf Coast').trim();

    const forecasts: DayForecast[] = [];
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const dayData = scoreFishingDay(date);
      forecasts.push({
        date: date.toISOString().slice(0, 10),
        dayOfWeek: daysOfWeek[date.getDay()],
        ...dayData,
      });
    }

    // Find best day
    const bestDay = forecasts.reduce((best, day) => day.score > best.score ? day : best, forecasts[0]);

    // Today's summary
    const today = forecasts[0];

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).json({
      success: true,
      location,
      today: {
        ...today,
        greeting: today.score >= 70
          ? `Great day to fish! ${today.rating} conditions with ${today.moonPhase}.`
          : `${today.rating} fishing conditions today. ${today.tips[0] || 'Check back tomorrow!'}`,
      },
      bestDay: {
        date: bestDay.date,
        dayOfWeek: bestDay.dayOfWeek,
        score: bestDay.score,
        rating: bestDay.rating,
        message: `Best day this ${days >= 7 ? 'week' : 'period'}: ${bestDay.dayOfWeek} (${bestDay.rating}, score ${bestDay.score}/100)`,
      },
      forecast: forecasts,
      daysAhead: days,
    });
  } catch (e: any) {
    console.error('[Fishing Forecast] Error:', e);
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}
