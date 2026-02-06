/**
 * Bot Academy
 * Each bot learns one NEW random thing they've never done before each week
 * Sends daily summaries of what bots learned
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

interface LearningChallenge {
  id: string;
  botName: string;
  challenge: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  completedAt?: string;
  learnings?: string;
  rating?: number; // 1-10 how useful was this
}

interface AcademyRecord {
  botName: string;
  completedChallenges: string[];
  currentStreak: number;
  totalLearnings: number;
  lastChallengeDate: string;
  skillsGained: string[];
}

// Learning challenges by category - bots pick what they've NEVER done
const LEARNING_CHALLENGES: Record<string, string[]> = {
  marketing: [
    'Research TikTok marketing strategies for B2B',
    'Learn about podcast advertising ROI',
    'Study neuromarketing principles',
    'Analyze viral marketing case studies',
    'Research voice search optimization',
    'Learn about AR/VR marketing applications',
    'Study community-led growth strategies',
    'Research affiliate marketing for SaaS',
    'Learn about marketing attribution models',
    'Study influencer contract negotiations',
    'Research gamification in marketing',
    'Learn about account-based marketing',
    'Study marketing automation workflows',
    'Research interactive content marketing',
    'Learn about dark social marketing',
  ],
  law: [
    'Research smart contract legal implications',
    'Study international data transfer laws',
    'Learn about AI liability frameworks',
    'Research cryptocurrency tax regulations',
    'Study digital accessibility laws (ADA)',
    'Learn about right to repair legislation',
    'Research gig economy labor laws',
    'Study biometric data privacy laws',
    'Learn about content moderation liability',
    'Research antitrust in tech',
    'Study open source licensing nuances',
    'Learn about NFT intellectual property',
    'Research class action trends in tech',
    'Study children\'s online privacy (COPPA)',
    'Learn about algorithmic discrimination law',
  ],
  security: [
    'Research zero-trust architecture patterns',
    'Study supply chain attack prevention',
    'Learn about quantum-resistant cryptography',
    'Research container security best practices',
    'Study social engineering defense tactics',
    'Learn about security chaos engineering',
    'Research API gateway security patterns',
    'Study browser fingerprinting techniques',
    'Learn about honeypot deployment strategies',
    'Research memory-safe programming languages',
    'Study ransomware negotiation tactics',
    'Learn about security compliance automation',
    'Research threat modeling frameworks',
    'Study bug bounty program design',
    'Learn about security observability',
  ],
  documentation: [
    'Research documentation-as-code practices',
    'Study interactive documentation tools',
    'Learn about API changelog automation',
    'Research documentation localization',
    'Study documentation accessibility standards',
    'Learn about docs search optimization',
    'Research developer experience writing',
    'Study video documentation best practices',
    'Learn about documentation analytics',
    'Research AI-assisted documentation',
    'Study runbook best practices',
    'Learn about decision documentation (ADRs)',
    'Research documentation testing',
    'Study error message writing',
    'Learn about SDK documentation patterns',
  ],
  organizer: [
    'Research OKR implementation strategies',
    'Study technical debt quantification',
    'Learn about team topology patterns',
    'Research async communication best practices',
    'Study decision fatigue reduction',
    'Learn about energy management vs time management',
    'Research developer productivity metrics',
    'Study knowledge management systems',
    'Learn about technical roadmap creation',
    'Research capacity planning techniques',
    'Study incident retrospective formats',
    'Learn about feature flagging strategies',
    'Research technical interview processes',
    'Study onboarding documentation',
    'Learn about architecture decision records',
  ],
  finance: [
    'Research usage-based pricing models',
    'Study startup valuation methods',
    'Learn about revenue recognition rules',
    'Research crypto accounting standards',
    'Study venture debt structures',
    'Learn about SAFE notes vs convertible notes',
    'Research marketplace economics',
    'Study international payment rails',
    'Learn about subscription fatigue research',
    'Research freemium conversion benchmarks',
    'Study financial forecasting for startups',
    'Learn about revenue operations (RevOps)',
    'Research pricing psychology studies',
    'Study burn rate management',
    'Learn about secondary market transactions',
  ],
  health: [
    'Research gut microbiome and mental health connection',
    'Study zone 2 cardio training benefits',
    'Learn about circadian rhythm optimization',
    'Research peptide therapies and longevity',
    'Study cold exposure and heat therapy benefits',
    'Learn about continuous glucose monitoring insights',
    'Research NAD+ and cellular aging',
    'Study functional medicine approaches',
    'Learn about breathwork techniques for stress',
    'Research sleep architecture optimization',
    'Study resistance training for longevity',
    'Learn about fasting mimicking diets',
    'Research nootropics and cognitive enhancement',
    'Study inflammation markers and testing',
    'Learn about hormone optimization',
  ],
  survival: [
    'Research urban foraging techniques',
    'Study primitive fire starting methods',
    'Learn about water distillation in emergencies',
    'Research EMP preparedness strategies',
    'Study wild edible identification by region',
    'Learn about improvised shelter construction',
    'Research ham radio for emergencies',
    'Study medical preparedness without doctors',
    'Learn about navigation using natural signs',
    'Research food caching and hiding techniques',
    'Study gray man concepts for urban survival',
    'Learn about vehicle emergency modifications',
    'Research community defense strategies',
    'Study psychological aspects of survival',
    'Learn about post-disaster water procurement',
  ],
  camping: [
    'Research ultralight backpacking gear systems',
    'Study hammock camping in all seasons',
    'Learn about dispersed camping regulations',
    'Research camp cooking with Dutch ovens',
    'Study bear canister alternatives',
    'Learn about thru-hiking nutrition strategies',
    'Research winter camping sleep systems',
    'Study campsite selection for weather protection',
    'Learn about Leave No Trace advanced practices',
    'Research portable water filtration systems',
    'Study campfire cooking techniques',
    'Learn about wildlife photography while camping',
    'Research family camping with young children',
    'Study high altitude camping considerations',
    'Learn about kayak and canoe camping',
  ],
  solar: [
    'Research bifacial solar panel efficiency',
    'Study LiFePO4 battery management systems',
    'Learn about microinverter vs string inverter',
    'Research solar tracking systems ROI',
    'Study DIY Powerwall alternatives',
    'Learn about solar panel cleaning best practices',
    'Research portable solar generator comparisons',
    'Study RV electrical system upgrades',
    'Learn about solar charge controller programming',
    'Research off-grid refrigeration solutions',
    'Study solar hot water systems',
    'Learn about wind-solar hybrid systems',
    'Research battery monitoring and balancing',
    'Study solar panel degradation factors',
    'Learn about DC-DC charging for vehicles',
  ],
  offgrid: [
    'Research earthship building techniques',
    'Study permaculture food forest design',
    'Learn about rainwater harvesting legal issues',
    'Research composting toilet systems',
    'Study root cellar construction methods',
    'Learn about off-grid internet solutions (Starlink)',
    'Research small-scale animal husbandry',
    'Study seed saving and heirloom varieties',
    'Learn about greywater recycling systems',
    'Research alternative building materials',
    'Study off-grid heating solutions',
    'Learn about food preservation without electricity',
    'Research well drilling and maintenance',
    'Study off-grid laundry solutions',
    'Learn about building community in rural areas',
  ],
  '3dprinting': [
    'Research Klipper firmware advantages',
    'Study multi-material printing systems (AMS, MMU)',
    'Learn about carbon fiber composite filaments',
    'Research high-temp printing enclosures',
    'Study print-in-place mechanism design',
    'Learn about resin printing post-processing',
    'Research large format printer modifications',
    'Study functional hinge and snap-fit design',
    'Learn about silicone mold making from prints',
    'Research lost PLA casting techniques',
    'Study bed adhesion solutions comparison',
    'Learn about food-safe 3D printing',
    'Research parametric design in OpenSCAD',
    'Study direct drive vs Bowden extruders',
    'Learn about automatic bed leveling systems',
  ],
  architecture: [
    'Research passive house certification requirements',
    'Study container home design and codes',
    'Learn about mass timber construction',
    'Research biophilic design principles',
    'Study accessible design beyond ADA minimums',
    'Learn about historic tax credit requirements',
    'Research prefab and modular construction advances',
    'Study basement waterproofing systems',
    'Learn about natural ventilation strategies',
    'Research tiny house on wheels (THOW) design',
    'Study thermal bridging prevention',
    'Learn about daylighting analysis tools',
    'Research resilient design for climate change',
    'Study garage conversion to ADU process',
    'Learn about building envelope testing methods',
  ],
  engineering: [
    'Research topology optimization in design',
    'Study brushless motor control algorithms',
    'Learn about finite element analysis basics',
    'Research CNC machining for prototyping',
    'Study thermal management in electronics',
    'Learn about waterproof enclosure design (IP ratings)',
    'Research harmonic drive mechanisms',
    'Study PCB thermal relief and via stitching',
    'Learn about hydraulic system design',
    'Research compliant mechanism design',
    'Study bearing selection and calculation',
    'Learn about gear ratio optimization',
    'Research pneumatic system design',
    'Study vibration analysis and damping',
    'Learn about tolerance stack-up analysis',
  ],
  chip: [
    'Research RISC-V microcontroller ecosystem',
    'Study CAN bus protocol for automotive',
    'Learn about secure boot implementation',
    'Research ESP32 deep sleep optimization',
    'Study JTAG vs SWD debugging differences',
    'Learn about watchdog timer best practices',
    'Research NFC/RFID reader implementation',
    'Study PWM motor control techniques',
    'Learn about ADC calibration methods',
    'Research bootloader development',
    'Study interrupt handling optimization',
    'Learn about real-time clock (RTC) accuracy',
    'Research DMA usage for efficiency',
    'Study brown-out detection implementation',
    'Learn about chip decapping techniques (educational)',
  ],
  bargain: [
    'Research credit card churning strategies',
    'Study manufacturer coupon stacking rules',
    'Learn about price adjustment policies',
    'Research clearance timing by retailer',
    'Study cell phone plan optimization',
    'Learn about insurance bundling discounts',
    'Research property tax appeal process',
    'Study streaming service rotation strategy',
    'Learn about bulk buying vs unit price analysis',
    'Research car buying negotiation timing',
    'Study appliance repair vs replace calculations',
    'Learn about library resources beyond books',
    'Research government assistance programs',
    'Study meal planning for grocery savings',
    'Learn about free community resources mapping',
  ],
  bluetooth: [
    'Research Bluetooth 5.4 new features',
    'Study Matter protocol for smart home',
    'Learn about Bluetooth mesh networking',
    'Research WiFi 7 capabilities',
    'Study LoRa long-range IoT communication',
    'Learn about Thread protocol',
    'Research BLE beacon applications',
    'Study Bluetooth audio codec comparison (LDAC, aptX)',
    'Learn about Zigbee vs Z-Wave for home automation',
    'Research ESP32 Bluetooth projects',
    'Study antenna design fundamentals',
    'Learn about wireless security vulnerabilities',
    'Research Bluetooth direction finding (AoA/AoD)',
    'Study UWB (Ultra-Wideband) technology',
    'Learn about MQTT for IoT messaging',
  ],
  networking: [
    'Research SD-WAN implementations',
    'Study BGP routing and security',
    'Learn about network automation with Python',
    'Research SASE (Secure Access Service Edge)',
    'Study container networking (CNI plugins)',
    'Learn about network observability tools',
    'Research intent-based networking',
    'Study multicast networking',
    'Learn about MPLS and segment routing',
    'Research network function virtualization',
    'Study DNS security (DNSSEC, DoH, DoT)',
    'Learn about IPv6 deployment challenges',
    'Research network telemetry and streaming',
    'Study load balancer algorithms',
    'Learn about network troubleshooting methodologies',
  ],
  meshtastic: [
    'Research Meshtastic 2.x firmware features',
    'Study LoRa spreading factor optimization',
    'Learn about solar-powered node design',
    'Research mesh network topology best practices',
    'Study MQTT gateway configuration',
    'Learn about Meshtastic channel encryption',
    'Research DIY Meshtastic hardware builds',
    'Study position tracking and mapping features',
    'Learn about emergency mesh network deployment',
    'Research antenna selection for LoRa',
    'Study repeater node placement strategies',
    'Learn about Meshtastic Python API',
    'Research off-grid communication alternatives',
    'Study T-Beam vs RAK vs Heltec comparison',
    'Learn about mesh network scaling',
  ],
  netsec: [
    'Research zero-day vulnerability hunting',
    'Study adversarial machine learning attacks',
    'Learn about cloud security posture management',
    'Research lateral movement detection',
    'Study EDR evasion techniques (defensive)',
    'Learn about threat intelligence feeds',
    'Research purple team operations',
    'Study network traffic analysis for threats',
    'Learn about security orchestration (SOAR)',
    'Research wireless penetration testing',
    'Study memory forensics techniques',
    'Learn about deception technology (honeypots)',
    'Research supply chain security',
    'Study ransomware defense strategies',
    'Learn about attack surface management',
  ],
  password: [
    'Research passwordless authentication methods',
    'Study passkey implementation standards',
    'Learn about credential stuffing defense',
    'Research password manager security audits',
    'Study hardware security key protocols',
    'Learn about biometric authentication risks',
    'Research zero-knowledge proof authentication',
    'Study enterprise password management',
    'Learn about password spraying detection',
    'Research secure password reset flows',
    'Study emergency access mechanisms',
    'Learn about credential rotation automation',
    'Research phishing-resistant MFA',
    'Study SSO security best practices',
    'Learn about vault-based secret management',
  ],
};

// Random fun challenges that apply to all bots
const WILD_CARD_CHALLENGES = [
  'Learn about a completely unrelated field and find 3 ways it applies to your specialty',
  'Research how your specialty is handled in Japan vs USA',
  'Find the most innovative startup in your field and analyze their approach',
  'Learn about the history of your specialty - how has it evolved in 20 years?',
  'Research how AI is disrupting your specialty and what\'s next',
  'Find a podcast in your field and summarize the top 3 insights',
  'Learn about common misconceptions in your specialty',
  'Research how climate change affects your specialty',
  'Find the most controversial opinion in your field and analyze both sides',
  'Learn about accessibility and inclusion in your specialty',
  'Research how remote work changed your specialty',
  'Find emerging tools in your field released in the last 6 months',
  'Learn about the ethics debates in your specialty',
  'Research cross-industry applications of your specialty',
  'Find a research paper in your field and summarize it',
];

export class BotAcademy {
  private claude: Anthropic | null;
  private supabase: any;
  private records: Map<string, AcademyRecord> = new Map();

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.claude = apiKey ? new Anthropic({ apiKey }) : null;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = supabaseUrl && supabaseKey 
      ? createClient(supabaseUrl, supabaseKey) 
      : null;
  }

  /**
   * Get a NEW challenge for a bot (something they've never done)
   */
  async getNewChallenge(botName: string, category: string): Promise<LearningChallenge> {
    const record = await this.getRecord(botName);
    const completedChallenges = record?.completedChallenges || [];

    // Get challenges for this category
    const categoryChallenges = LEARNING_CHALLENGES[category] || [];
    
    // Filter out completed ones
    const availableChallenges = categoryChallenges.filter(
      c => !completedChallenges.includes(c)
    );

    // Add wild card challenges
    const availableWildCards = WILD_CARD_CHALLENGES.filter(
      c => !completedChallenges.includes(c)
    );

    // 20% chance of wild card challenge
    const useWildCard = Math.random() < 0.2 && availableWildCards.length > 0;
    const challengePool = useWildCard ? availableWildCards : availableChallenges;

    // If all challenges done, generate a new one!
    if (challengePool.length === 0) {
      return this.generateNewChallenge(botName, category);
    }

    // Pick random challenge
    const challenge = challengePool[Math.floor(Math.random() * challengePool.length)];

    return {
      id: `${botName}_${Date.now()}`,
      botName,
      challenge,
      category: useWildCard ? 'wild_card' : category,
      difficulty: this.assessDifficulty(challenge),
    };
  }

  /**
   * Generate a completely new challenge using AI
   */
  private async generateNewChallenge(botName: string, category: string): Promise<LearningChallenge> {
    if (!this.claude) {
      return {
        id: `${botName}_${Date.now()}`,
        botName,
        challenge: 'Research the latest trends in your specialty',
        category,
        difficulty: 'medium',
      };
    }

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Generate a unique learning challenge for an AI bot specializing in ${category}.
        
Requirements:
- Something specific and actionable
- Can be completed in 1-2 hours of research
- Will genuinely improve the bot's knowledge
- Should be something novel and interesting

Just respond with the challenge description, nothing else.`
      }],
    });

    const challenge = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'Research emerging trends';

    return {
      id: `${botName}_${Date.now()}`,
      botName,
      challenge,
      category: 'ai_generated',
      difficulty: 'hard',
    };
  }

  /**
   * Complete a challenge and record learnings
   */
  async completeChallenge(
    challenge: LearningChallenge,
    learnings: string
  ): Promise<void> {
    challenge.completedAt = new Date().toISOString();
    challenge.learnings = learnings;

    // Update record
    const record = await this.getRecord(challenge.botName) || {
      botName: challenge.botName,
      completedChallenges: [],
      currentStreak: 0,
      totalLearnings: 0,
      lastChallengeDate: '',
      skillsGained: [],
    };

    record.completedChallenges.push(challenge.challenge);
    record.totalLearnings++;
    record.lastChallengeDate = challenge.completedAt;

    // Check streak
    const lastDate = new Date(record.lastChallengeDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
    
    if (daysDiff <= 7) {
      record.currentStreak++;
    } else {
      record.currentStreak = 1;
    }

    // Extract skills from learnings
    const newSkills = this.extractSkills(learnings);
    record.skillsGained = [...new Set([...record.skillsGained, ...newSkills])];

    await this.saveRecord(record);
    await this.saveChallenge(challenge);
  }

  /**
   * Run weekly academy session for a bot
   */
  async runWeeklySession(botName: string, category: string): Promise<{
    challenge: LearningChallenge;
    learnings: string;
    summary: string;
  }> {
    console.log(`\n🎓 Bot Academy: ${botName} starting weekly challenge...\n`);

    // Get new challenge
    const challenge = await this.getNewChallenge(botName, category);
    console.log(`📚 Challenge: ${challenge.challenge}`);
    console.log(`   Category: ${challenge.category}`);
    console.log(`   Difficulty: ${challenge.difficulty}`);

    // Execute the challenge
    const learnings = await this.executeChallenge(challenge);
    console.log(`\n✅ Challenge completed!`);

    // Complete and record
    await this.completeChallenge(challenge, learnings);

    // Generate summary
    const summary = this.generateSummary(botName, challenge, learnings);

    return { challenge, learnings, summary };
  }

  /**
   * Execute a learning challenge
   */
  private async executeChallenge(challenge: LearningChallenge): Promise<string> {
    if (!this.claude) {
      return 'Learning challenge completed (AI unavailable for detailed analysis)';
    }

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are completing this learning challenge: "${challenge.challenge}"

Research this topic thoroughly and provide:

1. **Key Findings** (3-5 main points)
2. **Practical Applications** (how to apply this)
3. **Surprising Insights** (something unexpected you learned)
4. **Action Items** (specific things to implement)
5. **Resources** (where to learn more)

Be specific and actionable. This is for genuine learning.`
      }],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  /**
   * Generate SMS-friendly summary
   */
  private generateSummary(
    botName: string,
    challenge: LearningChallenge,
    learnings: string
  ): string {
    // Extract first key insight for SMS
    const insightMatch = learnings.match(/Key Finding[s]?:?\s*\n[-•*]?\s*([^\n]+)/i);
    const insight = insightMatch?.[1]?.slice(0, 100) || learnings.slice(0, 100);

    return `🎓 ${botName} Academy Update\n\n` +
      `📚 Learned: ${challenge.challenge.slice(0, 60)}...\n\n` +
      `💡 Key Insight: ${insight}...\n\n` +
      `⭐ Difficulty: ${challenge.difficulty}`;
  }

  /**
   * Run academy for all bots and generate combined summary
   */
  async runAcademyDay(bots: Map<string, { name: string; category: string }>): Promise<string> {
    console.log('\n🎓 BOT ACADEMY - DAILY SESSION\n');
    console.log('═'.repeat(50));

    const summaries: string[] = [];
    
    for (const [key, bot] of bots) {
      try {
        const result = await this.runWeeklySession(bot.name, bot.category);
        summaries.push(result.summary);
      } catch (error) {
        console.log(`❌ ${bot.name} failed academy session`);
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Academy day complete!\n');

    // Generate combined SMS summary
    return this.generateDailySummary(summaries);
  }

  /**
   * Generate daily SMS summary of all bot learnings
   */
  private generateDailySummary(summaries: string[]): string {
    const date = new Date().toLocaleDateString();
    
    let message = `🎓 BOT ACADEMY DAILY REPORT\n`;
    message += `📅 ${date}\n\n`;

    for (const summary of summaries) {
      // Extract just the bot name and key insight
      const lines = summary.split('\n');
      const botLine = lines[0];
      const insightLine = lines.find(l => l.includes('Key Insight'));
      
      message += `${botLine}\n`;
      if (insightLine) {
        message += `${insightLine.slice(0, 80)}...\n`;
      }
      message += '\n';
    }

    message += `📊 ${summaries.length} bots leveled up today!`;

    return message;
  }

  /**
   * Get academy record for a bot
   */
  private async getRecord(botName: string): Promise<AcademyRecord | null> {
    // Check cache first
    if (this.records.has(botName)) {
      return this.records.get(botName)!;
    }

    // Try database
    if (this.supabase) {
      const { data } = await this.supabase
        .from('bot_academy_records')
        .select('*')
        .eq('bot_name', botName)
        .single();

      if (data) {
        const record: AcademyRecord = {
          botName: data.bot_name,
          completedChallenges: data.completed_challenges || [],
          currentStreak: data.current_streak || 0,
          totalLearnings: data.total_learnings || 0,
          lastChallengeDate: data.last_challenge_date || '',
          skillsGained: data.skills_gained || [],
        };
        this.records.set(botName, record);
        return record;
      }
    }

    return null;
  }

  /**
   * Save academy record
   */
  private async saveRecord(record: AcademyRecord): Promise<void> {
    this.records.set(record.botName, record);

    if (this.supabase) {
      await this.supabase
        .from('bot_academy_records')
        .upsert({
          bot_name: record.botName,
          completed_challenges: record.completedChallenges,
          current_streak: record.currentStreak,
          total_learnings: record.totalLearnings,
          last_challenge_date: record.lastChallengeDate,
          skills_gained: record.skillsGained,
        }, { onConflict: 'bot_name' });
    }
  }

  /**
   * Save completed challenge
   */
  private async saveChallenge(challenge: LearningChallenge): Promise<void> {
    if (this.supabase) {
      await this.supabase
        .from('bot_academy_challenges')
        .insert({
          id: challenge.id,
          bot_name: challenge.botName,
          challenge: challenge.challenge,
          category: challenge.category,
          difficulty: challenge.difficulty,
          completed_at: challenge.completedAt,
          learnings: challenge.learnings,
        });
    }
  }

  /**
   * Extract skills from learnings text
   */
  private extractSkills(learnings: string): string[] {
    const skills: string[] = [];
    const skillPatterns = [
      /learn(?:ed|ing)?\s+(?:about\s+)?([^,.]+)/gi,
      /understand(?:ing)?\s+([^,.]+)/gi,
      /knowledge\s+of\s+([^,.]+)/gi,
    ];

    for (const pattern of skillPatterns) {
      const matches = learnings.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length < 50) {
          skills.push(match[1].trim());
        }
      }
    }

    return skills.slice(0, 5); // Top 5 skills
  }

  /**
   * Assess challenge difficulty
   */
  private assessDifficulty(challenge: string): 'easy' | 'medium' | 'hard' | 'expert' {
    const hardWords = ['analyze', 'design', 'architect', 'optimize', 'strategy'];
    const expertWords = ['quantum', 'advanced', 'complex', 'comprehensive', 'framework'];
    
    const lower = challenge.toLowerCase();
    
    if (expertWords.some(w => lower.includes(w))) return 'expert';
    if (hardWords.some(w => lower.includes(w))) return 'hard';
    if (challenge.length > 100) return 'medium';
    return 'easy';
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(): Promise<AcademyRecord[]> {
    const records = Array.from(this.records.values());
    return records.sort((a, b) => b.totalLearnings - a.totalLearnings);
  }

  /**
   * Get bot's academy stats
   */
  async getBotStats(botName: string): Promise<object> {
    const record = await this.getRecord(botName);
    if (!record) {
      return { message: 'No academy record found' };
    }

    return {
      botName: record.botName,
      totalLearnings: record.totalLearnings,
      currentStreak: record.currentStreak,
      skillsGained: record.skillsGained.length,
      topSkills: record.skillsGained.slice(0, 5),
      lastChallenge: record.lastChallengeDate,
      challengesCompleted: record.completedChallenges.length,
    };
  }
}

