/**
 * Central place to store affiliate IDs. Fill in values per merchant when you get them.
 * Key format: lowercase name, alphanumeric + hyphens (e.g., "cbdistillery", "vaporfi").
 */
export const affiliateIds: Record<string, string> = {
  // Example:
  // cbdistillery: 'your-id',
  // vapordna: 'your-id',
  // amazon: 'your-amazon-tag',
};

/**
 * Apply a merchant affiliate ID to a URL if provided.
 * Supports:
 * - ref=... replacement (common pattern)
 * - YOUR_ID placeholder replacement
 * - tag=YOUR_ID for Amazon
 */
export function applyAffiliateId(url: string, id?: string | null): string {
  if (!id) return url;

  let next = url;
  next = next.replace(/ref=sr/gi, `ref=${id}`);
  next = next.replace(/ref=YOUR_ID/gi, `ref=${id}`);
  next = next.replace(/tag=YOUR_ID/gi, `tag=${id}`);
  next = next.replace(/YOUR_ID/gi, id);
  return next;
}

