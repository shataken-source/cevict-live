/**
 * FINN AI - Personal Memory System for GCC
 * 
 * Cross-platform concierge that remembers everything about each customer
 * Learns from every interaction and question
 */

export interface FINNMemoryProfile {
  userId: string;
  anniversaries: Date[];
  birthdays: Date[];
  traditions: string[];
  preferredLocations: string[];
  avoidedIssues: string[];
  speciesPreferences: string[];
  boatTypePreferences: string[];
  captainPreferences: string[];
  weatherTolerance: 'low' | 'moderate' | 'high';
  budgetRange: { min: number; max: number };
  recentBookings: any[];
  gearPurchaseHistory: any[];
  familyMembers: string[];
  lastUpdated: string;
  // Learning data
  conversationHistory: ConversationEntry[];
  learnedPreferences: LearnedPreference[];
  questionPatterns: QuestionPattern[];
  interactionCount: number;
}

export interface ConversationEntry {
  id: string;
  timestamp: string;
  userMessage: string;
  finnResponse: string;
  intent: string;
  extractedData: Record<string, any>;
  sentiment: 'positive' | 'negative' | 'neutral';
  satisfaction?: number;
}

export interface LearnedPreference {
  category: string;
  value: string;
  confidence: number;
  source: 'explicit' | 'inferred' | 'pattern';
  lastUpdated: string;
}

export interface QuestionPattern {
  pattern: string;
  intent: string;
  frequency: number;
  lastSeen: string;
}

export interface PersonalizedRecommendation {
  type: 'charter' | 'gear' | 'accommodation' | 'restaurant' | 'activity' | 'reminder';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  value: number;
  reasoning: string;
  actionItems: string[];
  deadline?: string;
}

export class FINNAI {
  private static instance: FINNAI;
  private profiles: Map<string, FINNMemoryProfile> = new Map();

  public static getInstance(): FINNAI {
    if (!FINNAI.instance) {
      FINNAI.instance = new FINNAI();
    }
    return FINNAI.instance;
  }

  /**
   * Log every conversation interaction for learning
   */
  public async logConversation(
    userId: string,
    userMessage: string,
    finnResponse: string,
    intent?: string
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);

    // Extract data from conversation
    const extractedData = this.extractDataFromMessage(userMessage);
    const sentiment = this.analyzeSentiment(userMessage);
    const detectedIntent = intent || this.detectIntent(userMessage);

    const conversationEntry: ConversationEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userMessage,
      finnResponse,
      intent: detectedIntent,
      extractedData,
      sentiment,
    };

    profile.conversationHistory.push(conversationEntry);
    
    // Keep only last 100 conversations
    if (profile.conversationHistory.length > 100) {
      profile.conversationHistory = profile.conversationHistory.slice(-100);
    }

    profile.interactionCount++;
    profile.lastUpdated = new Date().toISOString();

    // Learn from this interaction
    await this.learnFromConversation(profile, conversationEntry);

    this.profiles.set(userId, profile);

    // Sync to Supabase (shared Finn memory for GCC + WTV)
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/finn/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...profile,
            anniversaries: profile.anniversaries.map((d) => (typeof d === 'string' ? d : d.toISOString())),
            birthdays: profile.birthdays.map((d) => (typeof d === 'string' ? d : d.toISOString())),
          }),
        });
      } catch {
        // ignore
      }
    }
  }

  /**
   * Extract structured data from user messages
   */
  private extractDataFromMessage(message: string): Record<string, any> {
    const data: Record<string, any> = {};
    const lowerMessage = message.toLowerCase();

    // Extract dates
    const datePatterns = [
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
      /\b(\d{1,2}-\d{1,2}-\d{4})\b/,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
      /\b(next week|this weekend|tomorrow|today)\b/i,
    ];

    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        data.date = match[0];
        break;
      }
    }

    // Extract numbers (guests, budget, etc.)
    const numberPatterns = [
      /\b(\d+)\s*(people|guests|persons?)\b/i,
      /\b(\d+)\s*(dollars?|bucks?|\$)\b/i,
      /\$\s*(\d+)/i,
    ];

    for (const pattern of numberPatterns) {
      const match = message.match(pattern);
      if (match) {
        if (message.toLowerCase().includes('people') || message.toLowerCase().includes('guests')) {
          data.guests = parseInt(match[1]);
        } else if (message.toLowerCase().includes('dollar') || message.toLowerCase().includes('$')) {
          data.budget = parseInt(match[1]);
        }
      }
    }

    // Extract locations
    const locations = ['gulf shores', 'orange beach', 'dauphin island', 'fort morgan', 'perdido key'];
    for (const location of locations) {
      if (lowerMessage.includes(location)) {
        data.location = location;
        break;
      }
    }

    // Extract activity types
    const activityTypes = ['fishing', 'charter', 'rental', 'activity', 'restaurant', 'beach', 'museum', 'zoo'];
    for (const type of activityTypes) {
      if (lowerMessage.includes(type)) {
        data.activityType = type;
        break;
      }
    }

    // Extract preferences
    if (lowerMessage.includes('prefer') || lowerMessage.includes('like') || lowerMessage.includes('want')) {
      data.hasPreferences = true;
    }

    return data;
  }

  /**
   * Analyze sentiment of user message
   */
  private analyzeSentiment(message: string): 'positive' | 'negative' | 'neutral' {
    const lowerMessage = message.toLowerCase();
    
    const positiveWords = ['love', 'great', 'awesome', 'perfect', 'excellent', 'amazing', 'wonderful', 'thanks', 'thank you'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'worst', 'disappointed', 'frustrated', 'angry'];

    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Detect intent from user message
   */
  private detectIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('book') || lowerMessage.includes('reserve')) return 'booking';
    if (lowerMessage.includes('weather') || lowerMessage.includes('rain')) return 'weather';
    if (lowerMessage.includes('activity') || lowerMessage.includes('do') || lowerMessage.includes('things to do')) return 'activity';
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) return 'pricing';
    if (lowerMessage.includes('cancel') || lowerMessage.includes('refund')) return 'cancellation';
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) return 'recommendation';
    if (lowerMessage.includes('question') || lowerMessage.includes('ask')) return 'question';
    
    return 'general';
  }

  /**
   * Learn from conversation and update preferences
   */
  private async learnFromConversation(
    profile: FINNMemoryProfile,
    entry: ConversationEntry
  ): Promise<void> {
    const { extractedData, userMessage, intent } = entry;

    // Learn explicit preferences
    if (extractedData.location) {
      this.updatePreference(profile, 'location', extractedData.location, 'explicit');
    }

    if (extractedData.guests) {
      this.updatePreference(profile, 'groupSize', extractedData.guests.toString(), 'explicit');
    }

    if (extractedData.budget) {
      const currentBudget = profile.budgetRange;
      if (extractedData.budget < currentBudget.min || extractedData.budget > currentBudget.max) {
        profile.budgetRange = {
          min: Math.min(currentBudget.min, extractedData.budget),
          max: Math.max(currentBudget.max, extractedData.budget),
        };
      }
    }

    if (extractedData.activityType) {
      this.updatePreference(profile, 'activityType', extractedData.activityType, 'explicit');
    }

    // Learn from patterns
    this.learnFromPatterns(profile, userMessage, intent);

    // Update question patterns
    this.updateQuestionPatterns(profile, userMessage, intent);
  }

  /**
   * Update or add a learned preference
   */
  private updatePreference(
    profile: FINNMemoryProfile,
    category: string,
    value: string,
    source: 'explicit' | 'inferred' | 'pattern'
  ): void {
    const existing = profile.learnedPreferences.find(
      p => p.category === category && p.value === value
    );

    if (existing) {
      existing.confidence = Math.min(100, existing.confidence + 5);
      existing.lastUpdated = new Date().toISOString();
    } else {
      profile.learnedPreferences.push({
        category,
        value,
        confidence: source === 'explicit' ? 80 : source === 'inferred' ? 50 : 30,
        source,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  /**
   * Learn from conversation patterns
   */
  private learnFromPatterns(
    profile: FINNMemoryProfile,
    message: string,
    intent: string
  ): void {
    const lowerMessage = message.toLowerCase();

    // Learn boat type preferences
    const boatTypes = ['center console', 'sportfisher', 'walkaround', 'pontoon', 'catamaran'];
    for (const type of boatTypes) {
      if (lowerMessage.includes(type)) {
        this.updatePreference(profile, 'boatType', type, 'inferred');
        if (!profile.boatTypePreferences.includes(type)) {
          profile.boatTypePreferences.push(type);
        }
      }
    }

    // Learn fishing preferences
    const fishingTypes = ['inshore', 'offshore', 'deep sea', 'fly fishing', 'light tackle'];
    for (const type of fishingTypes) {
      if (lowerMessage.includes(type)) {
        this.updatePreference(profile, 'fishingType', type, 'inferred');
      }
    }

    // Learn weather tolerance
    if (lowerMessage.includes('rain') || lowerMessage.includes('weather')) {
      if (lowerMessage.includes('okay') || lowerMessage.includes('fine') || lowerMessage.includes('no problem')) {
        profile.weatherTolerance = 'high';
      } else if (lowerMessage.includes('worried') || lowerMessage.includes('concerned')) {
        profile.weatherTolerance = 'low';
      }
    }

    // Learn family information
    if (lowerMessage.includes('family') || lowerMessage.includes('kids') || lowerMessage.includes('children')) {
      this.updatePreference(profile, 'hasFamily', 'true', 'inferred');
    }
  }

  /**
   * Update question patterns for better future responses
   */
  private updateQuestionPatterns(
    profile: FINNMemoryProfile,
    message: string,
    intent: string
  ): void {
    // Create a simplified pattern from the message
    const pattern = this.createPattern(message);

    const existing = profile.questionPatterns.find(p => p.pattern === pattern);
    if (existing) {
      existing.frequency++;
      existing.lastSeen = new Date().toISOString();
    } else {
      profile.questionPatterns.push({
        pattern,
        intent,
        frequency: 1,
        lastSeen: new Date().toISOString(),
      });
    }

    // Keep only top 50 patterns
    if (profile.questionPatterns.length > 50) {
      profile.questionPatterns.sort((a, b) => b.frequency - a.frequency);
      profile.questionPatterns = profile.questionPatterns.slice(0, 50);
    }
  }

  /**
   * Create a pattern from message (simplified for matching)
   */
  private createPattern(message: string): string {
    // Remove specific values and keep structure
    let pattern = message.toLowerCase()
      .replace(/\d+/g, 'NUMBER')
      .replace(/\$\d+/g, 'PRICE')
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, 'DATE')
      .replace(/\b(gulf shores|orange beach|dauphin island)\b/gi, 'LOCATION')
      .replace(/\b\d+\s*(people|guests)\b/gi, 'GUESTS');
    
    return pattern.substring(0, 100); // Limit length
  }

  /**
   * Get or create user profile (loads from Supabase via API when possible)
   */
  private async getOrCreateProfile(userId: string): Promise<FINNMemoryProfile> {
    if (this.profiles.has(userId)) {
      return this.profiles.get(userId)!;
    }
    if (typeof window !== 'undefined') {
      try {
        const r = await fetch('/api/finn/profile', { credentials: 'include' });
        if (r.ok) {
          const data = await r.json();
          if (data && data.userId) {
            let anniversaries: Date[] = [];
            let birthdays: Date[] = [];
            try {
              const sd = await fetch('/api/finn/special-dates?daysAhead=365', { credentials: 'include' });
              if (sd.ok) {
                const j = await sd.json();
                anniversaries = (j.anniversaries || []).map((a: any) => new Date(a.date));
                birthdays = (j.birthdays || []).map((b: any) => new Date(b.date));
              }
            } catch {
              // ignore
            }
            const profile: FINNMemoryProfile = {
              ...data,
              anniversaries,
              birthdays,
              budgetRange: data.budgetRange || { min: 200, max: 1000 },
            };
            this.profiles.set(userId, profile);
            return profile;
          }
        }
      } catch {
        // fall through to initializeProfile
      }
    }
    return await this.initializeProfile(userId);
  }

  /**
   * Get personalized recommendations using learned data
   */
  public async getPersonalizedRecommendations(userId: string): Promise<PersonalizedRecommendation[]> {
    const profile = await this.getOrCreateProfile(userId);
    const recommendations: PersonalizedRecommendation[] = [];

    // Use learned preferences for recommendations
    const topPreferences = profile.learnedPreferences
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    topPreferences.forEach(pref => {
      if (pref.category === 'location' && pref.confidence > 60) {
        recommendations.push({
          type: 'charter',
          title: `Charter in ${pref.value}`,
          description: `Based on your preference for ${pref.value}, here are great options!`,
          urgency: 'medium',
          value: 50,
          reasoning: `You've mentioned ${pref.value} ${profile.conversationHistory.filter(c => c.extractedData.location === pref.value).length} times`,
          actionItems: ['View charters', 'Check availability'],
        });
      }
    });

    // Recommend based on conversation patterns
    const frequentIntent = this.getMostFrequentIntent(profile);
    if (frequentIntent) {
      recommendations.push({
        type: 'activity',
        title: `More ${frequentIntent} options`,
        description: `You often ask about ${frequentIntent}. Here are some new options!`,
        urgency: 'low',
        value: 30,
        reasoning: `Based on your ${frequentIntent} questions`,
        actionItems: ['Explore options'],
      });
    }

    return recommendations;
  }

  /**
   * Get most frequent intent from conversation history
   */
  private getMostFrequentIntent(profile: FINNMemoryProfile): string | null {
    const intentCounts: Record<string, number> = {};
    
    profile.conversationHistory.forEach(entry => {
      intentCounts[entry.intent] = (intentCounts[entry.intent] || 0) + 1;
    });

    const sorted = Object.entries(intentCounts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : null;
  }

  /**
   * Initialize profile for new user
   */
  public async initializeProfile(userId: string, initialData?: any): Promise<FINNMemoryProfile> {
    const profile: FINNMemoryProfile = {
      userId,
      anniversaries: [],
      birthdays: [],
      traditions: [],
      preferredLocations: [],
      avoidedIssues: [],
      speciesPreferences: [],
      boatTypePreferences: [],
      captainPreferences: [],
      weatherTolerance: 'moderate',
      budgetRange: { min: 200, max: 1000 },
      recentBookings: [],
      gearPurchaseHistory: [],
      familyMembers: [],
      lastUpdated: new Date().toISOString(),
      conversationHistory: [],
      learnedPreferences: [],
      questionPatterns: [],
      interactionCount: 0,
    };

    this.profiles.set(userId, profile);
    return profile;
  }

  /**
   * Get user profile
   */
  public getProfile(userId: string): FINNMemoryProfile | null {
    return this.profiles.get(userId) || null;
  }

  /**
   * Get learning statistics
   */
  public getLearningStats(userId: string): {
    interactionCount: number;
    learnedPreferences: number;
    questionPatterns: number;
    topPreferences: LearnedPreference[];
    mostFrequentIntent: string | null;
  } {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return {
        interactionCount: 0,
        learnedPreferences: 0,
        questionPatterns: 0,
        topPreferences: [],
        mostFrequentIntent: null,
      };
    }

    return {
      interactionCount: profile.interactionCount,
      learnedPreferences: profile.learnedPreferences.length,
      questionPatterns: profile.questionPatterns.length,
      topPreferences: profile.learnedPreferences
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5),
      mostFrequentIntent: this.getMostFrequentIntent(profile),
    };
  }
}

export default FINNAI;
