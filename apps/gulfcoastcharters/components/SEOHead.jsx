// components/SEOHead.jsx - ULTIMATE SEO OPTIMIZATION
// This makes search engines LOVE your site!

import Head from 'next/head'

export default function SEOHead({ 
  title = "Gulf Coast Fishing Charters | Book Charter Boats Texas to Florida",
  description = "Book verified fishing charters from Texas to Florida. Join 15,000+ anglers in our global fishing community. Deep sea, inshore, and bay fishing. Instant booking, GPS tracking, weather alerts.",
  keywords = "fishing charters, Gulf Coast fishing, Texas fishing charters, Florida fishing charters, deep sea fishing, charter boats, fishing trips, Orange Beach fishing, Destin fishing, Galveston fishing, sport fishing, offshore fishing, inshore fishing",
  image = "https://www.gulfcoastcharters.com/images/hero-fishing.jpg",
  url = "https://www.gulfcoastcharters.com",
  type = "website"
}) {
  
  // SCHEMA.ORG STRUCTURED DATA - Google LOVES this!
  const schemaData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.gulfcoastcharters.com/#organization",
        "name": "Gulf Coast Charters",
        "url": "https://www.gulfcoastcharters.com",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.gulfcoastcharters.com/logo.png",
          "width": 600,
          "height": 60
        },
        "sameAs": [
          "https://www.facebook.com/gulfcoastcharters",
          "https://www.instagram.com/gulfcoastcharters",
          "https://www.twitter.com/gulfcharters",
          "https://www.youtube.com/gulfcoastcharters",
          "https://www.linkedin.com/company/gulf-coast-charters",
          "https://www.tiktok.com/@gulfcoastcharters"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+1-800-FISHNOW",
          "contactType": "customer service",
          "availableLanguage": ["English", "Spanish"],
          "areaServed": ["US"],
          "contactOption": ["TollFree", "HearingImpairedSupported"]
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://www.gulfcoastcharters.com/#website",
        "url": "https://www.gulfcoastcharters.com",
        "name": "Gulf Coast Charters",
        "description": "Book fishing charters from Texas to Florida",
        "publisher": {
          "@id": "https://www.gulfcoastcharters.com/#organization"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://www.gulfcoastcharters.com/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "Service",
        "@id": "https://www.gulfcoastcharters.com/#service",
        "name": "Fishing Charter Booking",
        "provider": {
          "@id": "https://www.gulfcoastcharters.com/#organization"
        },
        "serviceType": "Fishing Charter Reservation",
        "areaServed": {
          "@type": "GeoShape",
          "name": "Gulf Coast",
          "address": "Texas, Louisiana, Mississippi, Alabama, Florida"
        },
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Fishing Charter Services",
          "itemListElement": [
            {
              "@type": "Offer",
              "name": "Deep Sea Fishing Charter",
              "price": "150.00",
              "priceCurrency": "USD"
            },
            {
              "@type": "Offer",
              "name": "Inshore Fishing Charter",
              "price": "125.00",
              "priceCurrency": "USD"
            }
          ]
        }
      }
    ]
  }

  // LOCAL BUSINESS SCHEMA - Crucial for local SEO!
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Gulf Coast Charters",
    "image": "https://www.gulfcoastcharters.com/images/storefront.jpg",
    "address": {
      "@type": "PostalAddress",
      "addressRegion": "Gulf Coast",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 29.6516,
      "longitude": -88.0856
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "2341"
    },
    "priceRange": "$$$"
  }

  // BREADCRUMB SCHEMA - Helps with navigation in search results
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.gulfcoastcharters.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Book Charter",
        "item": "https://www.gulfcoastcharters.com/booking"
      }
    ]
  }

  // FAQ SCHEMA - Gets rich snippets in Google!
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How much does a fishing charter cost?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Gulf Coast fishing charters range from $150-$500 per person depending on trip duration and type. Half-day trips start at $150, full-day offshore trips from $275."
        }
      },
      {
        "@type": "Question",
        "name": "What's the best time to fish the Gulf Coast?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Year-round fishing is excellent, but April-October offers the best weather and variety. Red Snapper season (June-July) is extremely popular."
        }
      }
    ]
  }

  return (
    <Head>
      {/* BASIC META TAGS */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Gulf Coast Charters" />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
      <link rel="canonical" href={url} />
      
      {/* MOBILE OPTIMIZATION */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Gulf Charters" />
      
      {/* OPEN GRAPH - Facebook, LinkedIn */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Gulf Coast Charters" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Gulf Coast Fishing Charters" />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="en_US" />
      <meta property="fb:app_id" content="YOUR_FB_APP_ID" />
      
      {/* TWITTER CARDS - Gets huge cards in tweets! */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@gulfcharters" />
      <meta name="twitter:creator" content="@gulfcharters" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content="Book Gulf Coast Fishing Charters" />
      
      {/* PINTEREST */}
      <meta name="pinterest-rich-pin" content="true" />
      <meta property="product:price:amount" content="150.00" />
      <meta property="product:price:currency" content="USD" />
      
      {/* GEO TAGS - Local SEO */}
      <meta name="geo.region" content="US-TX" />
      <meta name="geo.region" content="US-LA" />
      <meta name="geo.region" content="US-MS" />
      <meta name="geo.region" content="US-AL" />
      <meta name="geo.region" content="US-FL" />
      <meta name="geo.placename" content="Gulf Coast" />
      <meta name="geo.position" content="29.6516;-88.0856" />
      <meta name="ICBM" content="29.6516, -88.0856" />
      
      {/* MICROSOFT / BING */}
      <meta name="msapplication-TileColor" content="#0891b2" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      <meta name="theme-color" content="#0891b2" />
      
      {/* VERIFICATION TAGS - Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in env (see ADSENSE_VERIFICATION_SETUP.md) */}
      {typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && (
        <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION} />
      )}
      {typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BING_VERIFICATION && (
        <meta name="msvalidate.01" content={process.env.NEXT_PUBLIC_BING_VERIFICATION} />
      )}
      {typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_YANDEX_VERIFICATION && (
        <meta name="yandex-verification" content={process.env.NEXT_PUBLIC_YANDEX_VERIFICATION} />
      )}
      {typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_PINTEREST_VERIFICATION && (
        <meta name="p:domain_verify" content={process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION} />
      )}
      
      {/* FAVICONS */}
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />
      
      {/* RSS FEED - Gets indexed faster! */}
      <link rel="alternate" type="application/rss+xml" title="Gulf Coast Fishing Reports" href="/rss.xml" />
      
      {/* PRECONNECT - Speed optimization */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      
      {/* STRUCTURED DATA - The secret sauce! */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </Head>
  )
}
