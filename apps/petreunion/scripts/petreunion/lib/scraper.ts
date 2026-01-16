export async function createStealthContext() {
  // This project previously experimented with "stealth" browser automation via
  // `playwright-extra` + `puppeteer-extra-plugin-stealth`. Those dependencies are not
  // installed in the current repo, and `tsconfig.json` includes all `**/*.ts` files,
  // so keeping top-level imports here will break `next build`.
  //
  // If we need rendered scraping again, prefer the dedicated PawBoost rendered script
  // (`scripts/pawboost-scrape-rendered.js`) or add the missing deps explicitly.
  throw new Error(
    "[scraper] Stealth scraping is disabled (missing dependencies: playwright-extra / puppeteer-extra-plugin-stealth)."
  );
}
