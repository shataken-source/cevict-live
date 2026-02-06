/**
 * Anniversary & Birthday Tracker
 * Extracts and tracks special dates from conversations
 */

export interface SpecialDate {
  type: 'anniversary' | 'birthday';
  date: Date;
  name?: string;
  years?: number;
  originalBookingDate?: string;
}

export interface UpcomingOccasions {
  anniversaries: SpecialDate[];
  birthdays: SpecialDate[];
}

/**
 * Extract special dates (anniversaries, birthdays) from text
 */
export function extractSpecialDates(text: string): {
  anniversaries: SpecialDate[];
  birthdays: SpecialDate[];
} {
  const anniversaries: SpecialDate[] = [];
  const birthdays: SpecialDate[] = [];
  const lowerText = text.toLowerCase();

  // Anniversary patterns
  const anniversaryPatterns = [
    /\b(anniversary|wedding anniversary|dating anniversary)\s+(?:on\s+)?(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2})/i,
    /\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})\s+(?:is\s+)?(?:our|my|the)\s+anniversary/i,
  ];

  for (const pattern of anniversaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[2] || match[1];
      const date = parseDate(dateStr);
      if (date) {
        anniversaries.push({
          type: 'anniversary',
          date,
        });
      }
    }
  }

  // Birthday patterns
  const birthdayPatterns = [
    /\b(birthday|bday)\s+(?:of\s+)?(\w+)?\s*(?:on\s+)?(\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}|(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2})/i,
    /\b(\w+)(?:'s)?\s+birthday\s+(?:is\s+)?(?:on\s+)?(\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2})/i,
  ];

  for (const pattern of birthdayPatterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1] || match[2];
      const dateStr = match[3] || match[2];
      const date = parseDate(dateStr);
      if (date) {
        birthdays.push({
          type: 'birthday',
          date,
          name: name && name !== 'birthday' ? name : undefined,
        });
      }
    }
  }

  return { anniversaries, birthdays };
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date | null {
  try {
    // Try MM/DD/YYYY or MM-DD-YYYY
    if (/\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(dateStr)) {
      return new Date(dateStr);
    }
    // Try MM/DD or MM-DD (assume current year)
    if (/\d{1,2}[\/-]\d{1,2}/.test(dateStr)) {
      const [month, day] = dateStr.split(/[\/-]/);
      const year = new Date().getFullYear();
      return new Date(parseInt(year.toString()), parseInt(month) - 1, parseInt(day));
    }
    // Try month name format
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const lowerDateStr = dateStr.toLowerCase();
    for (let i = 0; i < monthNames.length; i++) {
      if (lowerDateStr.includes(monthNames[i])) {
        const dayMatch = dateStr.match(/\d{1,2}/);
        if (dayMatch) {
          const year = new Date().getFullYear();
          return new Date(year, i, parseInt(dayMatch[0]));
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Save special dates for a user
 */
export async function saveSpecialDates(
  userId: string,
  anniversaries: SpecialDate[],
  birthdays: SpecialDate[]
): Promise<void> {
  // In production, this would save to Supabase
  // For now, we'll use localStorage as a fallback
  try {
    const stored = localStorage.getItem(`finn_dates_${userId}`);
    const existing = stored ? JSON.parse(stored) : { anniversaries: [], birthdays: [] };
    
    existing.anniversaries.push(...anniversaries.map(a => ({
      ...a,
      date: a.date.toISOString(),
    })));
    existing.birthdays.push(...birthdays.map(b => ({
      ...b,
      date: b.date.toISOString(),
    })));

    localStorage.setItem(`finn_dates_${userId}`, JSON.stringify(existing));
  } catch (error) {
    console.error('Failed to save special dates:', error);
  }
}

/**
 * Get upcoming occasions for a user
 */
export async function getUpcomingOccasions(
  userId: string,
  daysAhead: number = 45
): Promise<UpcomingOccasions> {
  try {
    const stored = localStorage.getItem(`finn_dates_${userId}`);
    if (!stored) {
      return { anniversaries: [], birthdays: [] };
    }

    const data = JSON.parse(stored);
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const upcoming: UpcomingOccasions = {
      anniversaries: [],
      birthdays: [],
    };

    // Check anniversaries
    for (const ann of data.anniversaries || []) {
      const annDate = new Date(ann.date);
      const thisYear = new Date(today.getFullYear(), annDate.getMonth(), annDate.getDate());
      if (thisYear >= today && thisYear <= futureDate) {
        upcoming.anniversaries.push({
          ...ann,
          date: thisYear,
        });
      }
    }

    // Check birthdays
    for (const bd of data.birthdays || []) {
      const bdDate = new Date(bd.date);
      const thisYear = new Date(today.getFullYear(), bdDate.getMonth(), bdDate.getDate());
      if (thisYear >= today && thisYear <= futureDate) {
        upcoming.birthdays.push({
          ...bd,
          date: thisYear,
        });
      }
    }

    // Sort by date
    upcoming.anniversaries.sort((a, b) => a.date.getTime() - b.date.getTime());
    upcoming.birthdays.sort((a, b) => a.date.getTime() - b.date.getTime());

    return upcoming;
  } catch (error) {
    console.error('Failed to get upcoming occasions:', error);
    return { anniversaries: [], birthdays: [] };
  }
}
