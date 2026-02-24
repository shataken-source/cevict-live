/**
 * Anniversary Tracker
 * Detects anniversary patterns from bookings and manages reminders
 */

import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from './encryption';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export interface AnniversaryData {
  date: string;
  type: 'wedding' | 'dating' | 'other';
  partnerName?: string;
  notes?: string;
  originalBookingDate?: string;
}

export interface BirthdayData {
  date: string;
  name: string;
  relationship: 'self' | 'spouse' | 'child' | 'parent' | 'other';
  notes?: string;
}

/**
 * Extract anniversary/birthday information from conversation
 */
export function extractSpecialDates(message: string): {
  anniversaries: AnniversaryData[];
  birthdays: BirthdayData[];
} {
  const lowerMessage = message.toLowerCase();
  const anniversaries: AnniversaryData[] = [];
  const birthdays: BirthdayData[] = [];

  // Detect anniversary mentions
  const anniversaryPatterns = [
    /(?:our|my|our|we|wedding|dating)\s+(?:anniversary|anniv)\s+(?:is|on|was)?\s*(\w+\s+\d+|\d+\/\d+|\d+-\d+)/i,
    /(?:anniversary|anniv)\s+(?:is|on|was)?\s*(\w+\s+\d+|\d+\/\d+|\d+-\d+)/i,
    /(?:married|dating)\s+(?:on|since)?\s*(\w+\s+\d+|\d+\/\d+|\d+-\d+)/i,
  ];

  for (const pattern of anniversaryPatterns) {
    const match = message.match(pattern);
    if (match) {
      const dateStr = match[1];
      const date = parseDate(dateStr);
      if (date) {
        anniversaries.push({
          date: date.toISOString().split('T')[0],
          type: lowerMessage.includes('wedding') ? 'wedding' : 'dating',
          notes: extractNotes(message)
        });
      }
    }
  }

  // Detect birthday mentions
  const birthdayPatterns = [
    /(?:my|my\s+\w+|birthday|born)\s+(?:is|on|was)?\s*(\w+\s+\d+|\d+\/\d+|\d+-\d+)/i,
    /(?:birthday|bday)\s+(?:is|on|was)?\s*(\w+\s+\d+|\d+\/\d+|\d+-\d+)/i,
  ];

  for (const pattern of birthdayPatterns) {
    const match = message.match(pattern);
    if (match) {
      const dateStr = match[1];
      const date = parseDate(dateStr);
      if (date) {
        const name = extractName(message) || 'Birthday';
        birthdays.push({
          date: date.toISOString().split('T')[0],
          name,
          relationship: lowerMessage.includes('my') ? 'self' : 'other',
          notes: extractNotes(message)
        });
      }
    }
  }

  return { anniversaries, birthdays };
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): Date | null {
  try {
    // Try common formats
    const formats = [
      /(\w+)\s+(\d+)/, // "June 15" or "June 15, 2024"
      /(\d+)\/(\d+)/, // "6/15" or "06/15/2024"
      /(\d+)-(\d+)/, // "6-15" or "2024-06-15"
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        // Simple parsing - in production, use a proper date library
        const now = new Date();
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'];
        
        if (format === formats[0]) {
          // Month name format
          const monthName = match[1].toLowerCase();
          const month = monthNames.findIndex(m => m.startsWith(monthName));
          const day = parseInt(match[2]);
          if (month >= 0 && day > 0 && day <= 31) {
            return new Date(now.getFullYear(), month, day);
          }
        } else {
          // Numeric format
          const first = parseInt(match[1]);
          const second = parseInt(match[2]);
          
          if (first <= 12 && second <= 31) {
            // Assume MM/DD or MM-DD
            return new Date(now.getFullYear(), first - 1, second);
          } else if (first > 12 && second <= 12) {
            // Assume DD/MM
            return new Date(now.getFullYear(), second - 1, first);
          }
        }
      }
    }

    // Try direct Date parsing
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) {
    // Parsing failed
  }

  return null;
}

/**
 * Extract name from message
 */
function extractName(message: string): string | null {
  const namePatterns = [
    /(?:my|my\s+)(\w+)(?:\s+birthday)/i,
    /(\w+)(?:\s+birthday)/i,
  ];

  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract notes/context from message
 */
function extractNotes(message: string): string | undefined {
  // Extract any additional context after the date
  const notePattern = /(?:anniversary|birthday|on)\s+\w+\s+\d+[,\s]+(.+)/i;
  const match = message.match(notePattern);
  return match ? match[1].trim() : undefined;
}

/**
 * Check if user has upcoming anniversaries/birthdays
 */
export async function getUpcomingOccasions(userId: string, daysAhead: number = 60): Promise<{
  anniversaries: AnniversaryData[];
  birthdays: BirthdayData[];
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { anniversaries: [], birthdays: [] };
  }

  try {
    const { data } = await supabase
      .from('user_preferences')
      .select('anniversaries, birthdays')
      .eq('user_id', userId)
      .single();

    if (!data) {
      return { anniversaries: [], birthdays: [] };
    }

    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const upcomingAnniversaries: AnniversaryData[] = [];
    const upcomingBirthdays: BirthdayData[] = [];

    // Check anniversaries
    if (data.anniversaries) {
      for (const ann of data.anniversaries) {
        try {
          const annDate = new Date(ann.date);
          const thisYear = new Date(today.getFullYear(), annDate.getMonth(), annDate.getDate());
          
          if (thisYear < today) {
            thisYear.setFullYear(today.getFullYear() + 1);
          }

          if (thisYear <= futureDate) {
            upcomingAnniversaries.push({
              date: ann.date,
              type: ann.type || 'other',
              partnerName: ann.partner_name ? decrypt(ann.partner_name) : undefined,
              notes: ann.notes ? decrypt(ann.notes) : undefined,
              originalBookingDate: ann.original_booking_date
            });
          }
        } catch (e) {
          console.warn('[Anniversary Tracker] Error processing anniversary:', e);
        }
      }
    }

    // Check birthdays
    if (data.birthdays) {
      for (const bd of data.birthdays) {
        try {
          const bdDate = new Date(bd.date);
          const thisYear = new Date(today.getFullYear(), bdDate.getMonth(), bdDate.getDate());
          
          if (thisYear < today) {
            thisYear.setFullYear(today.getFullYear() + 1);
          }

          if (thisYear <= futureDate) {
            upcomingBirthdays.push({
              date: bd.date,
              name: bd.name ? decrypt(bd.name) : 'Birthday',
              relationship: bd.relationship || 'other',
              notes: bd.notes ? decrypt(bd.notes) : undefined
            });
          }
        } catch (e) {
          console.warn('[Anniversary Tracker] Error processing birthday:', e);
        }
      }
    }

    return {
      anniversaries: upcomingAnniversaries,
      birthdays: upcomingBirthdays
    };

  } catch (error) {
    console.error('[Anniversary Tracker] Error:', error);
    return { anniversaries: [], birthdays: [] };
  }
}

/**
 * Save special dates to user preferences
 */
export async function saveSpecialDates(
  userId: string,
  anniversaries: AnniversaryData[],
  birthdays: BirthdayData[]
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return false;
  }

  try {
    // Get existing preferences
    const { data: existing } = await supabase
      .from('user_preferences')
      .select('anniversaries, birthdays')
      .eq('user_id', userId)
      .single();

    const existingAnn = existing?.anniversaries || [];
    const existingBd = existing?.birthdays || [];

    // Merge new dates (avoid duplicates)
    const mergedAnn = [...existingAnn];
    for (const ann of anniversaries) {
      const exists = mergedAnn.some((a: any) => a.date === ann.date);
      if (!exists) {
        mergedAnn.push({
          date: ann.date,
          type: ann.type,
          partner_name: ann.partnerName ? encrypt(ann.partnerName) : null,
          notes: ann.notes ? encrypt(ann.notes) : null,
          original_booking_date: ann.originalBookingDate
        });
      }
    }

    const mergedBd = [...existingBd];
    for (const bd of birthdays) {
      const exists = mergedBd.some((b: any) => b.date === bd.date && b.name === encrypt(bd.name));
      if (!exists) {
        mergedBd.push({
          date: bd.date,
          name: encrypt(bd.name),
          relationship: bd.relationship,
          notes: bd.notes ? encrypt(bd.notes) : null
        });
      }
    }

    // Update preferences
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        anniversaries: mergedAnn,
        birthdays: mergedBd,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    return !error;

  } catch (error) {
    console.error('[Anniversary Tracker] Error saving dates:', error);
    return false;
  }
}

