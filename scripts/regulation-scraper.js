/**
 * SmokersRights Regulation Scraper
 * The Freedom Monitor - Tracks tobacco/vape regulations nationwide
 *
 * Targets: Government RSS/Atom feeds
 * Feature: Paul Revere Algorithm - Geo-targeted alerts
 */

const Parser = require('rss-parser');

const parser = new Parser({
  timeout: 10_000,
  headers: {
    'User-Agent': 'SmokersRightsBot/1.0 (+https://smokersrights.com)',
  },
});

// Configuration
const CONFIG = {
  // Keywords to monitor
  keywords: {
    high_priority: [
      'tobacco tax increase', 'vape ban', 'menthol ban', 'menthol prohibition',
      'flavored tobacco ban', 'nicotine limit', 'smoking age', 'tobacco 21',
      'vaping prohibition', 'e-cigarette ban', 'tobacco license'
    ],
    medium_priority: [
      'tobacco regulation', 'vape regulation', 'smoking restriction',
      'tobacco legislation', 'nicotine regulation', 'tobacco control',
      'cigar tax', 'cigarette tax', 'vaping tax'
    ],
    low_priority: [
      'tobacco industry', 'vape industry', 'smoking cessation',
      'tobacco company', 'nicotine products', 'smoking area'
    ]
  },
  
  // Government sources
  govSources: [
    { name: 'Congress.gov', url: 'congress.gov', type: 'federal' },
    { name: 'Federal Register', url: 'federalregister.gov', type: 'federal' },
    { name: 'FDA Tobacco', url: 'fda.gov/tobacco-products', type: 'federal' },
    { name: 'ATF', url: 'atf.gov', type: 'federal' }
  ],
  
  // State legislatures (real feeds for priority states; placeholders for others)
  stateSources: (() => {
    const priority = {
      CA: 'https://leginfo.legislature.ca.gov/faces/rssSearch.xhtml',
      NY: 'https://www.nysenate.gov/feed-bills',
      TX: 'https://capitol.texas.gov/rss/LegislatureRss.aspx',
      FL: 'https://www.myfloridahouse.gov/FileStores/Web/HouseContent/Lists/Bills/BillRSS.aspx',
      WA: 'https://app.leg.wa.gov/bi/RSS/RSS.ashx',
      MA: 'https://malegislature.gov/RSS/Bills',
      IL: 'https://ilga.gov/rss/rss.asp',
      NJ: 'https://www.njleg.state.nj.us/rss/bills',
      OH: 'https://www.legislature.ohio.gov/rss/bills',
      PA: 'https://www.legis.state.pa.us/WU01/LI/BI/RSS/BillRSS.aspx',
    };
    const allStates = US_STATES_FULL.map(s => s.code);
    const sources = [];
    for (const code of allStates) {
      if (priority[code]) {
        sources.push({ state: code, name: `${STATE_NAMES[code]} Legislature`, url: priority[code] });
      } else {
        sources.push({
          state: code,
          name: `${STATE_NAMES[code]} Legislature`,
          url: `${STATE_NAMES[code].toLowerCase().replace(/\s+/g, '')}.gov`,
        });
      }
    }
    return sources;
  })(),
  
  // Alert thresholds
  alerts: {
    immediate: ['ban', 'prohibition', 'emergency', 'effective immediately'],
    urgent: ['proposed', 'introduced', 'hearing scheduled', 'vote scheduled'],
    watch: ['study', 'review', 'consideration', 'discussion']
  },

  // Real RSS/Atom sources (keep this list small + reliable for serverless)
  rssFeeds: [
    {
      name: 'Federal Register (tobacco search)',
      url: 'https://www.federalregister.gov/documents/search.rss?conditions%5Bterm%5D=tobacco',
      type: 'federal',
    },
    {
      name: 'Federal Register (vaping search)',
      url: 'https://www.federalregister.gov/documents/search.rss?conditions%5Bterm%5D=vaping',
      type: 'federal',
    },
    {
      name: 'Congress.gov (tobacco search)',
      url: 'https://www.congress.gov/rss/search/?search=tobacco',
      type: 'federal',
    },
  ],
};

// State abbreviation to full name mapping + full list
const US_STATES_FULL = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const STATE_NAMES = US_STATES_FULL.reduce((acc, s) => ({ ...acc, [s.code]: s.name }), {});

/**
 * Analyze regulation priority level
 */
function analyzeRegulation(text) {
  const textLower = text.toLowerCase();
  let priority = 'low';
  let matchedKeywords = [];
  let alertLevel = 'watch';
  
  // Check high priority keywords
  for (const keyword of CONFIG.keywords.high_priority) {
    if (textLower.includes(keyword)) {
      priority = 'high';
      matchedKeywords.push(keyword);
    }
  }
  
  // Check medium priority if no high found
  if (priority !== 'high') {
    for (const keyword of CONFIG.keywords.medium_priority) {
      if (textLower.includes(keyword)) {
        priority = 'medium';
        matchedKeywords.push(keyword);
      }
    }
  }
  
  // Check low priority if nothing else found
  if (matchedKeywords.length === 0) {
    for (const keyword of CONFIG.keywords.low_priority) {
      if (textLower.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
  }
  
  // Determine alert level
  for (const word of CONFIG.alerts.immediate) {
    if (textLower.includes(word)) {
      alertLevel = 'immediate';
      break;
    }
  }
  
  if (alertLevel !== 'immediate') {
    for (const word of CONFIG.alerts.urgent) {
      if (textLower.includes(word)) {
        alertLevel = 'urgent';
        break;
      }
    }
  }
  
  return {
    priority,
    alertLevel,
    matchedKeywords,
    isPaulRevereAlert: alertLevel === 'immediate' || (alertLevel === 'urgent' && priority === 'high')
  };
}

/**
 * Extract geographic information from regulation
 */
function extractGeography(text) {
  const textLower = text.toLowerCase();
  const locations = {
    federal: false,
    states: [],
    cities: [],
    zipCodes: []
  };
  
  // Check for federal indicators
  if (textLower.includes('federal') || textLower.includes('nationwide') || 
      textLower.includes('national') || textLower.includes('fda') || 
      textLower.includes('congress')) {
    locations.federal = true;
  }
  
  // Check for state mentions
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    if (textLower.includes(name.toLowerCase()) || 
        new RegExp(`\\b${abbr}\\b`, 'i').test(text)) {
      locations.states.push(abbr);
    }
  }
  
  // Extract zip codes (5-digit pattern)
  const zipMatches = text.match(/\b\d{5}(?:-\d{4})?\b/g);
  if (zipMatches) {
    locations.zipCodes = [...new Set(zipMatches)];
  }
  
  return locations;
}

/**
 * Paul Revere Algorithm - Determine who to alert
 */
function paulRevereAlert(regulation) {
  const alerts = [];
  
  if (regulation.analysis.isPaulRevereAlert) {
    const geo = regulation.geography;
    
    if (geo.federal) {
      // Alert all users nationwide
      alerts.push({
        scope: 'national',
        urgency: regulation.analysis.alertLevel,
        message: `🚨 FEDERAL ALERT: ${regulation.headline}`,
        targetAudience: 'all_users'
      });
    }
    
    if (geo.states.length > 0) {
      // Alert users in affected states
      for (const state of geo.states) {
        alerts.push({
          scope: 'state',
          state: state,
          urgency: regulation.analysis.alertLevel,
          message: `⚠️ ${STATE_NAMES[state]} ALERT: ${regulation.headline}`,
          targetAudience: `users_in_${state}`
        });
      }
    }
    
    if (geo.zipCodes.length > 0) {
      // Alert users in specific zip codes
      for (const zip of geo.zipCodes) {
        alerts.push({
          scope: 'local',
          zipCode: zip,
          urgency: regulation.analysis.alertLevel,
          message: `📍 LOCAL ALERT (${zip}): ${regulation.headline}`,
          targetAudience: `users_in_${zip}`
        });
      }
    }
  }
  
  return alerts;
}

/**
 * Scrape regulation news
 */
async function scrapeRegulations() {
  console.log('🗽 SmokersRights Regulation Scraper Starting...');
  console.log('📡 Monitoring government sources for tobacco/vape regulations...\n');
  
  const regulations = [];

  for (const feed of CONFIG.rssFeeds) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = Array.isArray(parsed.items) ? parsed.items : [];

      for (const item of items.slice(0, 25)) {
        const headline = String(item.title || '').trim();
        const link = String(item.link || '').trim();
        const summary = String(item.contentSnippet || item.content || '').trim();
        if (!headline) continue;

        const id = String(item.guid || link || `${feed.name}:${headline}`).slice(0, 500);
        const timestamp = item.isoDate ? new Date(item.isoDate).toISOString() : new Date().toISOString();

        const fullText = `${headline} ${summary}`;
        const analysis = analyzeRegulation(fullText);
        const geography = extractGeography(fullText);

        const processedReg = {
          id,
          headline,
          summary,
          source: feed.name,
          type: feed.type,
          url: link,
          timestamp,
          analysis,
          geography,
        };

        processedReg.paulRevereAlerts = paulRevereAlert(processedReg);

        regulations.push(processedReg);
      }
    } catch (e) {
      console.warn('[regulation-scraper] feed failed:', feed.name);
    }
  }

  // Log a quick summary
  for (const reg of regulations.slice(0, 10)) {
    const analysis = reg.analysis || {};
    const geography = reg.geography || { states: [], federal: false };
    const priorityEmoji = analysis.priority === 'high' ? '🔴' :
                          analysis.priority === 'medium' ? '🟡' : '🟢';
    console.log(`${priorityEmoji} ${String(reg.headline).substring(0, 60)}...`);
    console.log(`   Priority: ${(analysis.priority || 'low').toUpperCase()}`);
    console.log(`   Alert Level: ${analysis.alertLevel || 'watch'}`);
    console.log(`   Scope: ${geography.federal ? 'Federal' : ''} ${(geography.states || []).join(', ')}`);
    if (reg.paulRevereAlerts && reg.paulRevereAlerts.length > 0) {
      console.log(`   🔔 PAUL REVERE: ${reg.paulRevereAlerts.length} alert(s) triggered!`);
    }
    console.log('');
  }
  
  return {
    success: true,
    timestamp: new Date().toISOString(),
    totalScraped: regulations.length,
    byPriority: {
      high: regulations.filter(r => r.analysis.priority === 'high').length,
      medium: regulations.filter(r => r.analysis.priority === 'medium').length,
      low: regulations.filter(r => r.analysis.priority === 'low').length
    },
    byAlertLevel: {
      immediate: regulations.filter(r => r.analysis.alertLevel === 'immediate').length,
      urgent: regulations.filter(r => r.analysis.alertLevel === 'urgent').length,
      watch: regulations.filter(r => r.analysis.alertLevel === 'watch').length
    },
    paulRevereTriggered: regulations.filter(r => r.paulRevereAlerts?.length > 0).length,
    totalAlerts: regulations.reduce((sum, r) => sum + (r.paulRevereAlerts?.length || 0), 0),
    regulations
  };
}

/**
 * Get users to alert based on geography
 */
async function getUsersToAlert(alerts) {
  // In production, this would query Supabase for users matching geography
  const userAlerts = [];
  
  for (const alert of alerts) {
    userAlerts.push({
      alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alert,
      // Would fetch actual users from database
      estimatedRecipients: alert.scope === 'national' ? 'All Users' : 
                           alert.scope === 'state' ? `Users in ${alert.state}` :
                           `Users in ${alert.zipCode}`,
      channels: ['email', 'sms', 'push'],
      scheduledFor: new Date().toISOString()
    });
  }
  
  return userAlerts;
}

// Main execution
async function main() {
  try {
    console.log('\n🗽 SMOKERSRIGHTS REGULATION SCRAPER 🗽');
    console.log('=====================================\n');
    
    const results = await scrapeRegulations();
    
    // Collect all Paul Revere alerts
    const allAlerts = results.regulations
      .flatMap(r => r.paulRevereAlerts || []);
    
    const userAlerts = await getUsersToAlert(allAlerts);
    
    console.log('\n📊 SCRAPE RESULTS:');
    console.log(`   Total Regulations: ${results.totalScraped}`);
    console.log(`   🔴 High Priority: ${results.byPriority.high}`);
    console.log(`   🟡 Medium Priority: ${results.byPriority.medium}`);
    console.log(`   🟢 Low Priority: ${results.byPriority.low}`);
    
    console.log('\n⚡ ALERT LEVELS:');
    console.log(`   🚨 Immediate: ${results.byAlertLevel.immediate}`);
    console.log(`   ⚠️ Urgent: ${results.byAlertLevel.urgent}`);
    console.log(`   👁️ Watch: ${results.byAlertLevel.watch}`);
    
    console.log('\n🔔 PAUL REVERE ALGORITHM:');
    console.log(`   Regulations triggering alerts: ${results.paulRevereTriggered}`);
    console.log(`   Total alerts generated: ${results.totalAlerts}`);
    
    if (userAlerts.length > 0) {
      console.log('\n📬 SCHEDULED ALERTS:');
      for (const alert of userAlerts) {
        console.log(`   ${alert.urgency === 'immediate' ? '🚨' : '⚠️'} ${alert.message.substring(0, 50)}...`);
        console.log(`      → ${alert.estimatedRecipients}`);
      }
    }
    
    // Output JSON for consumption
    console.log('\n--- JSON OUTPUT ---');
    console.log(JSON.stringify({ results, userAlerts }, null, 2));
    
    return { results, userAlerts };
  } catch (error) {
    console.error('❌ Scraper error:', error);
    process.exit(1);
  }
}

// Export for module use
module.exports = { scrapeRegulations, analyzeRegulation, extractGeography, paulRevereAlert };

// Run if called directly
if (require.main === module) {
  main();
}

