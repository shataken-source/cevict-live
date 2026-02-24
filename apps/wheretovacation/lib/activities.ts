/**
 * Canonical activity list for activity-first destination discovery.
 * Destinations.available_activities in DB should use these ids (e.g. ["scuba_diving", "eco_tour"]).
 */

export const ACTIVITY_IDS = [
  'scuba_diving',
  'snorkeling',
  'hang_gliding',
  'eco_tour',
  'fishing',
  'kayaking',
  'sailing',
  'hiking',
  'golf',
  'wildlife',
  'beach',
  'diving',
  'boat_charter',
  'jet_ski',
  'parasailing',
  'whale_watching',
  'dining',
  'nightlife',
  'cultural_tours',
  'zip_line',
  'surfing',
  'paddleboarding',
] as const;

export type ActivityId = (typeof ACTIVITY_IDS)[number];

/** English label for each activity (use t(lang, 'search.activity.' + id) when i18n is wired). */
export const ACTIVITY_LABELS: Record<ActivityId, string> = {
  scuba_diving: 'Scuba diving',
  snorkeling: 'Snorkeling',
  hang_gliding: 'Hang gliding',
  eco_tour: 'Eco tour',
  fishing: 'Fishing',
  kayaking: 'Kayaking',
  sailing: 'Sailing',
  hiking: 'Hiking',
  golf: 'Golf',
  wildlife: 'Wildlife viewing',
  beach: 'Beach',
  diving: 'Diving',
  boat_charter: 'Boat charter',
  jet_ski: 'Jet ski',
  parasailing: 'Parasailing',
  whale_watching: 'Whale watching',
  dining: 'Dining',
  nightlife: 'Nightlife',
  cultural_tours: 'Cultural tours',
  zip_line: 'Zip line',
  surfing: 'Surfing',
  paddleboarding: 'Paddleboarding',
};

export function getActivityLabel(id: string): string {
  return ACTIVITY_LABELS[id as ActivityId] ?? id.replace(/_/g, ' ');
}
