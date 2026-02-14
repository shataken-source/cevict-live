import { Page } from 'puppeteer';

export interface PetData {
  name: string;
  imageUrl?: string | null;
  profileUrl?: string | null;
  breed?: string;
  age?: string;
  gender?: string;
  size?: string;
  description?: string;
  source: string;
  sourceUrl: string;
  scrapedAt: string;
  [key: string]: any; // Allow additional fields
}

export interface ScraperConfig {
  name: string;
  baseUrl: string;
  searchUrl?: string;
  selectors: {
    pet: string;
    name: string[];
    image: string[];
    link: string[];
    breed?: string[];
    age?: string[];
    gender?: string[];
    size?: string[];
    description?: string[];
    [key: string]: any; // Allow additional selectors
  };
  waitForSelector?: string;
  pagination?: {
    type?: 'infinite' | 'numbered' | 'load-more';
    selector?: string;
    maxPages?: number;
  };
  transform?: (pet: PetData) => PetData;
}

export abstract class BaseScraper {
  protected config: ScraperConfig;
  protected page: Page;

  constructor(page: Page, config: ScraperConfig) {
    this.page = page;
    this.config = config;
  }

  async navigateToSearchPage(): Promise<void> {
    const { baseUrl, searchUrl } = this.config;
    const url = searchUrl || baseUrl;
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    if (this.config.waitForSelector) {
      await this.page.waitForSelector(this.config.waitForSelector, { timeout: 30000 })
        .catch(() => console.log(`Warning: Could not find waitForSelector: ${this.config.waitForSelector}`));
    }
  }

  async scrape(): Promise<PetData[]> {
    try {
      await this.navigateToSearchPage();
      return await this.extractPets();
    } catch (error) {
      console.error(`Error scraping ${this.config.name}:`, error);
      return [];
    }
  }

  protected async extractPets(): Promise<PetData[]> {
    const { selectors } = this.config;
    
    return await this.page.evaluate((sel) => {
      const getFirstMatchingText = (element: Element, selectors: string[]): string | null => {
        for (const selector of selectors) {
          const el = element.querySelector(selector);
          if (el?.textContent?.trim()) return el.textContent.trim();
        }
        return null;
      };

      const getFirstMatchingAttribute = (element: Element, selectors: string[], attr: string): string | null => {
        for (const selector of selectors) {
          const el = element.querySelector(selector);
          const value = el?.getAttribute(attr);
          if (value) return value;
        }
        return null;
      };

      const petElements = Array.from(document.querySelectorAll(sel.pet));
      
      return petElements.map((petEl): PetData | null => {
        try {
          const name = getFirstMatchingText(petEl, sel.name);
          if (!name) return null;

          const imageUrl = getFirstMatchingAttribute(petEl, sel.image, 'src');
          const profileUrl = getFirstMatchingAttribute(petEl, sel.link, 'href');
          const breed = sel.breed ? getFirstMatchingText(petEl, sel.breed) : undefined;
          const age = sel.age ? getFirstMatchingText(petEl, sel.age) : undefined;
          const gender = sel.gender ? getFirstMatchingText(petEl, sel.gender) : undefined;
          const size = sel.size ? getFirstMatchingText(petEl, sel.size) : undefined;
          const description = sel.description ? getFirstMatchingText(petEl, sel.description) : undefined;

          return {
            name,
            imageUrl: imageUrl ? new URL(imageUrl, window.location.href).href : null,
            profileUrl: profileUrl ? new URL(profileUrl, window.location.href).href : null,
            breed,
            age,
            gender,
            size,
            description,
            source: 'Unknown', // Will be set by the specific scraper
            sourceUrl: window.location.href,
            scrapedAt: new Date().toISOString()
          };
        } catch (error) {
          console.error('Error processing pet element:', error);
          return null;
        }
      }).filter(Boolean) as PetData[];
    }, selectors);
  }

  // Helper method to get text content from an element
  protected async getText(selector: string): Promise<string | null> {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.textContent?.trim() || null : null;
    }, selector);
  }

  // Helper method to get attribute from an element
  protected async getAttribute(selector: string, attribute: string): Promise<string | null> {
    return this.page.evaluate((sel, attr) => {
      const el = document.querySelector(sel);
      return el ? el.getAttribute(attr) : null;
    }, selector, attribute);
  }
}
