// /packages/tokens/src/branding-manifest.ts

/**
 * ============================================
 * CEVICT ECOSYSTEM BRANDING & IP MANIFEST
 * ============================================
 * * This manifest defines the core entities, brand names, and primary domains
 * for all applications built on the Cevict AI-Native Platform.
 * * NOTE: This document is used by all apps (GCC, WTV) for consistent branding.
 */

export const IPManifest = {

  // --- PLATFORM CORE ---
  platform: {
    name: "Cevict",
    slogan: "Evicting Forgetfulness. The AI-Native Collaboration Platform.",
    purpose: "Provides the Persistent Context Layer (PCL) and AI Federation Protocol (AFP).",
    primaryDomain: "cevict.com",
    defensiveDomains: ["seevict.com", "seevict.co"],
    tech: "Rock Solid, Bulletproof AI Co-Architected Core."
  },

  // --- APPLICATION 1: TRANSACTION ENGINE ---
  gcc: {
    name: "Gulf Coast Charters",
    acronym: "GCC",
    primaryDomain: "gulfcoastcharters.com",
    longTermRenewal: true,
    mascot: "Fishy",
    targetAudience: "Charter Captains & B2B Logistics."
  },

  // --- APPLICATION 2: DISCOVERY & AFFILIATE ENGINE ---
  wtv: {
    name: "Where To Vacation",
    acronym: "WTV",
    primaryDomain: "wheretovacation.com",
    longTermRenewal: true,
    mascot: "Fishy",
    targetAudience: "Consumer Travel & Discovery."
  },

  // --- MASCOT & AI PERSONA ---
  mascot: {
    name: "Fishy",
    role: "Customer-Facing AI Assistant / Concierge.",
    primaryDomain: "fishyplatform.com",
    relatedDomains: [
      "askfishy.com",
      "tryfishy.com",
      "fishybookings.com",
      "fishy.yachts"
    ]
  }
};