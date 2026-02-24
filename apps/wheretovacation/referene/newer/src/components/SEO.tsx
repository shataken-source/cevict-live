import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  canonicalUrl?: string;
  structuredData?: object;
  ogSiteName?: string;
  twitterSite?: string;
}


export default function SEO({
  title = 'Gulf Charter Finder - Find & Book Charter Boats',
  description = 'Discover and book the best charter fishing boats, yacht charters, and boat tours across the Gulf Coast. Compare prices, read reviews, and book instantly.',
  keywords = 'charter boats, fishing charters, yacht rentals, boat tours, Gulf Coast, fishing trips, boat booking',
  image = '/og.jpg',
  type = 'website',
  canonicalUrl,
  structuredData,
  ogSiteName = 'Gulf Coast Charters',
  twitterSite = '@GulfCharters'
}: SEOProps) {

  const location = useLocation();
  const currentUrl = `https://gulfcoastcharters.com${location.pathname}`;
  const canonical = canonicalUrl || currentUrl;

  useEffect(() => {
    // Update title
    document.title = title;

    // Update or create meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    
    // Open Graph
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:type', type, 'property');
    updateMetaTag('og:url', currentUrl, 'property');
    updateMetaTag('og:image', image, 'property');
    updateMetaTag('og:site_name', ogSiteName, 'property');
    updateMetaTag('og:image:width', '1200', 'property');
    updateMetaTag('og:image:height', '630', 'property');
    
    // Twitter
    updateMetaTag('twitter:card', 'summary_large_image', 'name');
    updateMetaTag('twitter:title', title, 'name');
    updateMetaTag('twitter:description', description, 'name');
    updateMetaTag('twitter:image', image, 'name');
    updateMetaTag('twitter:site', twitterSite, 'name');


    // Canonical URL
    updateCanonicalLink(canonical);

    // Structured Data
    if (structuredData) {
      updateStructuredData(structuredData);
    }
  }, [title, description, keywords, image, type, currentUrl, canonical, structuredData]);

  return null;
}

function updateMetaTag(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let element = document.querySelector(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function updateCanonicalLink(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.href = url;
}

function updateStructuredData(data: object) {
  let script = document.querySelector('script[type="application/ld+json"]');
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}
