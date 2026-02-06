/**
 * FINN AI - Personal Memory System
 *
 * The ultimate competitive moat that drives 80% repeat rate vs 30% industry.
 * FINN remembers everything about each customer to build lifelong relationships.
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
}

export interface FINNInteraction {
  id: string;
  userId: string;
  type: 'booking' | 'review' | 'purchase' | 'complaint' | 'preference' | 'anniversary' | 'birthday';
  timestamp: string;
  data: any;
  sentiment: 'positive' | 'negative' | 'neutral';
  context: string;
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

export class FINNAI {
  private static instance: FINNAI;
  private profiles: Map<string, FINNMemoryProfile> = new Map();
  private interactions: Map<string, FINNInteraction[]> = new Map();

  public static getInstance(): FINNAI {
    if (!FINNAI.instance) {
      FINNAI.instance = new FINNAI();
    }
    return FINNAI.instance;
  }

  /**
   * Log conversation for learning (alias for logInteraction for compatibility)
   */
  public async logConversation(
    userId: string,
    userMessage: string,
    finnResponse: string,
    intent?: string
  ): Promise<void> {
    const sentiment = this.analyzeSentimentFromMessage(userMessage);
    const detectedIntent = intent || this.detectIntentFromMessage(userMessage);

    await this.logInteraction(userId, {
      type: 'preference',
      data: {
        userMessage,
        finnResponse,
        intent: detectedIntent,
        extractedData: this.extractDataFromMessage(userMessage),
      },
      sentiment,
      context: 'conversation',
    });
  }

  /**
   * Log user interaction for learning
   */
  public async logInteraction(
    userId: string,
    interaction: {
      type: FINNInteraction['type'];
      data: any;
      sentiment: FINNInteraction['sentiment'];
      context: string;
    }
  ): Promise<void> {
    const finnInteraction: FINNInteraction = {
      id: crypto.randomUUID(),
      userId,
      type: interaction.type,
      timestamp: new Date().toISOString(),
      data: interaction.data,
      sentiment: interaction.sentiment,
      context: interaction.context,
    };

    if (!this.interactions.has(userId)) {
      this.interactions.set(userId, []);
    }

    this.interactions.get(userId)!.push(finnInteraction);
    await this.updateProfileFromInteraction(userId, finnInteraction);
  }

  /**
   * Analyze sentiment from message text
   */
  private analyzeSentimentFromMessage(message: string): 'positive' | 'negative' | 'neutral' {
    const lowerMessage = message.toLowerCase();

    const positiveWords = ['love', 'great', 'awesome', 'perfect', 'excellent', 'amazing', 'wonderful', 'thanks', 'thank you', 'yes', 'sure', 'good'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'worst', 'disappointed', 'frustrated', 'angry', 'no', 'never', 'cancel'];

    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Detect intent from message text
   */
  private detectIntentFromMessage(message: string): string {
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
   * Extract structured data from user message
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

    return data;
  }

  /**
   * Get personalized recommendations using FINN AI
   */
  public async getPersonalizedRecommendations(userId: string): Promise<PersonalizedRecommendation[]> {
    const profile = await this.getOrCreateProfile(userId);
    const recommendations: PersonalizedRecommendation[] = [];
    if (!profile) return recommendations;

    // Based on preferred locations
    if (profile.preferredLocations.length > 0) {
      recommendations.push({
        type: 'accommodation',
        title: `Vacation Rental in ${profile.preferredLocations[0]}`,
        description: `Based on your preference for ${profile.preferredLocations[0]}, here are great options!`,
        urgency: 'medium',
        value: 50,
        reasoning: `You've mentioned ${profile.preferredLocations[0]} in past conversations`,
        actionItems: ['View rentals', 'Check availability'],
      });
    }

    // Based on budget preferences
    if (profile.budgetRange) {
      recommendations.push({
        type: 'accommodation',
        title: `Best Value in $${profile.budgetRange.min}-$${profile.budgetRange.max} Range`,
        description: `Curated rentals that maximize experience within your preferred budget range.`,
        urgency: 'low',
        value: 40,
        reasoning: `Budget-conscious recommendations`,
        actionItems: ['Compare options', 'Check seasonal discounts'],
      });
    }

    return recommendations;
  }

  /**
   * Update profile based on interaction
   */
  private async updateProfileFromInteraction(userId: string, interaction: FINNInteraction): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    if (!profile) return;

    switch (interaction.type) {
      case 'booking':
        profile.recentBookings.push(interaction.data);
        if (profile.recentBookings.length > 10) {
          profile.recentBookings = profile.recentBookings.slice(-10);
        }
        break;

      case 'preference':
        if (interaction.data.extractedData?.location) {
          if (!profile.preferredLocations.includes(interaction.data.extractedData.location)) {
            profile.preferredLocations.push(interaction.data.extractedData.location);
          }
        }
        if (interaction.data.extractedData?.budget) {
          profile.budgetRange = {
            min: Math.min(profile.budgetRange.min, interaction.data.extractedData.budget),
            max: Math.max(profile.budgetRange.max, interaction.data.extractedData.budget),
          };
        }
        break;
    }

    profile.lastUpdated = new Date().toISOString();
    this.profiles.set(userId, profile);
  }

  /**
   * Get or create user profile
   */
  private async getOrCreateProfile(userId: string): Promise<FINNMemoryProfile | null> {
    if (!this.profiles.has(userId)) {
      return await this.initializeProfile(userId);
    }
    return this.profiles.get(userId) || null;
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
}

export default FINNAI;
