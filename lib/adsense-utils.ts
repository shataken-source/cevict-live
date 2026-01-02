/**
 * AdSense Utility Functions
 * 
 * Ensures AdSense ads only appear on pages with sufficient content
 * to comply with Google AdSense Program Policies
 */

/**
 * Pages that should NOT have AdSense ads (minimal content, navigation-only, errors)
 */
const EXCLUDED_PATHS = [
  '/404',
  '/not-found',
  '/error',
  '/admin', // Admin pages typically have minimal public content
  '/payment/success', // Minimal confirmation pages
  '/payment/cancel', // Minimal cancellation pages
];

/**
 * Check if a pathname should have AdSense ads
 * @param pathname - The current pathname
 * @returns true if ads should be shown, false otherwise
 */
export function shouldShowAds(pathname: string): boolean {
  // Normalize pathname
  const normalized = pathname.toLowerCase().trim();
  
  // Check if path is in excluded list
  for (const excluded of EXCLUDED_PATHS) {
    if (normalized.startsWith(excluded.toLowerCase())) {
      return false;
    }
  }
  
  // Allow ads on content pages (home, search, map, shop, etc.)
  return true;
}

/**
 * Check if current page has sufficient content for AdSense
 * This is a client-side check
 */
export function useContentPageCheck(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check pathname
  const pathname = window.location.pathname;
  if (!shouldShowAds(pathname)) {
    return false;
  }
  
  // Additional check: ensure page has substantial content
  // This is a basic check - you may want to enhance this
  const mainContent = document.querySelector('main') || document.querySelector('article') || document.body;
  if (mainContent) {
    const textContent = mainContent.textContent || '';
    // Require at least 300 characters of content
    if (textContent.trim().length < 300) {
      return false;
    }
  }
  
  return true;
}

