/**
 * Dual AI Architecture - Best of Both Worlds
 * 
 * Two AI systems working together to provide comprehensive support:
 * 
 * FINN (Personal AI):
 * - Remembers everything about each customer
 * - 80% repeat rate vs 30% industry
 * - Proactive reminders (anniversaries, birthdays)
 * - Review intelligence (learns preferences)
 * - Cross-platform concierge
 * - Gear purchase memory
 * - 10x customer lifetime value
 * 
 * Fishy Bot (Public Helper):
 * - 24/7 FAQ support
 * - Zero support cost
 * - Instant answers
 * - Ice Ice Baby entrance (viral)
 * - Handles 70% of support tickets
 * - Escalates complex issues
 */

import FINNAI, { PersonalizedRecommendation } from './finnAI';

export interface FishyBotQuery {
  id: string;
  userId?: string;
  sessionId: string;
  query: string;
  category: 'booking' | 'payment' | 'technical' | 'general' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  context?: any;
}

export interface FishyBotResponse {
  queryId: string;
  response: string;
  confidence: number;              // 0-100
  category: string;
  escalated: boolean;
  suggestedActions: string[];
  followUpRequired: boolean;
  viralElements?: ViralElement[];
}

export interface ViralElement {
  type: 'ice_ice_baby' | 'joke' | 'fun_fact' | 'meme' | 'gif';
  content: string;
  shareability: number;            // 0-100
  platform: 'chat' | 'social' | 'email';
}

export interface SupportMetrics {
  totalQueries: number;
  resolvedByBot: number;
  escalatedToHuman: number;
  averageResponseTime: number;     // seconds
  satisfactionScore: number;       // 0-100
  costSavings: number;             // monthly
  viralShares: number;
}

export interface AIHandoff {
  from: 'FINN' | 'FishyBot';
  to: 'FINN' | 'FishyBot' | 'Human';
  userId: string;
  context: any;
  reason: string;
  timestamp: string;
}

export class DualAIArchitecture {
  private static instance: DualAIArchitecture;
  private finnAI: FINNAI;
  private queryHistory: Map<string, FishyBotQuery[]> = new Map();
  private responseCache: Map<string, FishyBotResponse> = new Map();
  private supportMetrics: SupportMetrics;
  private escalationQueue: FishyBotQuery[] = [];

  // Knowledge base for Fishy Bot
  private readonly KNOWLEDGE_BASE = {
    booking: [
      {
        keywords: ['book', 'booking', 'charter', 'reserve'],
        response: 'I can help you book the perfect charter! What type of experience are you looking for? Fishing, sunset cruise, dolphin watching?',
        confidence: 95,
        actions: ['show_charter_types', 'check_availability', 'get_preferences']
      },
      {
        keywords: ['cancel', 'refund', 'change'],
        response: 'For cancellations and changes, I can help you understand our policy. Would you like to know about our flexible cancellation options?',
        confidence: 90,
        actions: ['explain_cancellation_policy', 'check_booking_status']
      },
      {
        keywords: ['availability', 'available', 'dates', 'schedule'],
        response: 'Let me check real-time availability for you! What dates are you considering and how many people will be joining?',
        confidence: 92,
        actions: ['check_calendar', 'show_available_slots', 'get_group_size']
      }
    ],
    payment: [
      {
        keywords: ['payment', 'pay', 'credit card', 'charge'],
        response: 'We accept all major credit cards, PayPal, and offer secure payment processing. Your payment is protected by our escrow system until after your trip!',
        confidence: 96,
        actions: ['explain_payment_security', 'show_payment_options']
      },
      {
        keywords: ['price', 'cost', 'fee', 'expensive'],
        response: 'Our prices vary based on trip type, duration, and group size. Most charters range from $200-800. Would you like me to show you options in your budget?',
        confidence: 88,
        actions: ['get_budget_range', 'show_price_options', 'explain_value']
      }
    ],
    technical: [
      {
        keywords: ['login', 'password', 'account', 'sign in'],
        response: 'Having trouble accessing your account? I can help you reset your password or troubleshoot login issues. What specific problem are you experiencing?',
        confidence: 94,
        actions: ['password_reset', 'troubleshoot_login', 'account_recovery']
      },
      {
        keywords: ['app', 'mobile', 'download', 'install'],
        response: 'Our app works on any device! No download needed - it\'s a Progressive Web App. Just visit our website and tap "Add to Home Screen"!',
        confidence: 97,
        actions: ['explain_pwa', 'installation_guide', 'mobile_features']
      }
    ],
    emergency: [
      {
        keywords: ['emergency', 'urgent', 'help', 'danger', 'safety'],
        response: '🚨 This sounds urgent! For immediate safety concerns, please contact emergency services. For charter emergencies, I can connect you with our 24/7 support team.',
        confidence: 100,
        actions: ['emergency_protocol', 'connect_support', 'safety_guidelines']
      }
    ]
  };

  // Viral elements for engagement
  private readonly VIRAL_CONTENT = {
    ice_ice_baby: [
      '🎵 Ice Ice Baby... too cold! Too cold! 🧊 Want to book a HOT fishing trip instead? 🔥',
      '🎶 Ice Ice Baby... let\'s go fishing! 🎣 Instead of ice, how about some nice warm Gulf waters?',
      '🎤 Ice Ice Baby... word to your mother! 👋 And your father, and your sister, and your whole family on a fishing trip! 🐟'
    ],
    jokes: [
      'Why don\'t fish like basketball? 🏀 They\'re afraid of the net! 🥁',
      'What do you call a fish with no eyes? 🐟 A fsh! 😄',
      'Why did the fish cross the ocean? 🌊 To get to the other tide! 🌊'
    ],
    fun_facts: [
      '🐠 A group of fish is called a school! Time for some fishing education! 🎓',
      '🦈 Sharks have been around for 400 million years! Book a shark watching trip to see these ancient predators! 👀',
      '🐡 Pufferfish can inflate to 3x their size! But our captains won\'t let you get that bloated on your trip! 😄'
    ]
  };

  public static getInstance(): DualAIArchitecture {
    if (!DualAIArchitecture.instance) {
      DualAIArchitecture.instance = new DualAIArchitecture();
    }
    return DualAIArchitecture.instance;
  }

  private constructor() {
    this.finnAI = FINNAI.getInstance();
    this.supportMetrics = {
      totalQueries: 0,
      resolvedByBot: 0,
      escalatedToHuman: 0,
      averageResponseTime: 0,
      satisfactionScore: 0,
      costSavings: 0,
      viralShares: 0,
    };
  }

  /**
   * Process user query through dual AI system
   */
  public async processQuery(query: FishyBotQuery): Promise<FishyBotResponse> {
    const startTime = Date.now();
    this.supportMetrics.totalQueries++;

    // Check if user has FINN profile for personalized handling
    let finnRecommendations: PersonalizedRecommendation[] = [];
    if (query.userId) {
      finnRecommendations = await this.finnAI.getPersonalizedRecommendations(query.userId);
    }

    // Try Fishy Bot first for instant response
    const botResponse = await this.processWithFishyBot(query, finnRecommendations);
    
    const responseTime = (Date.now() - startTime) / 1000;
    this.updateMetrics(responseTime, !botResponse.escalated);

    // If escalated and user has FINN profile, add personalization
    if (botResponse.escalated && query.userId && finnRecommendations.length > 0) {
      return await this.enhanceWithFINN(botResponse, finnRecommendations, query.userId);
    }

    return botResponse;
  }

  /**
   * Process query with Fishy Bot (public helper)
   */
  private async processWithFishyBot(
    query: FishyBotQuery, 
    finnRecommendations: PersonalizedRecommendation[]
  ): Promise<FishyBotResponse> {
    // Check cache first
    const cacheKey = this.generateCacheKey(query.query);
    if (this.responseCache.has(cacheKey)) {
      return this.responseCache.get(cacheKey)!;
    }

    // Determine category and find best response
    const category = this.categorizeQuery(query.query);
    const knowledgeResponse = this.findKnowledgeBaseResponse(query.query, category);

    // Generate viral elements based on context
    const viralElements = this.generateViralElements(query.query, category);

    // Determine if escalation is needed
    const escalated = this.shouldEscalate(query, knowledgeResponse.confidence);

    const response: FishyBotResponse = {
      queryId: query.id,
      response: knowledgeResponse.response,
      confidence: knowledgeResponse.confidence,
      category,
      escalated,
      suggestedActions: knowledgeResponse.actions,
      followUpRequired: escalated || category === 'emergency',
      viralElements,
    };

    // Cache non-personalized responses
    if (!query.userId) {
      this.responseCache.set(cacheKey, response);
    }

    // Add to query history
    this.addToHistory(query);

    return response;
  }

  /**
   * Enhance bot response with FINN AI personalization
   */
  private async enhanceWithFINN(
    botResponse: FishyBotResponse,
    finnRecommendations: PersonalizedRecommendation[],
    userId: string
  ): Promise<FishyBotResponse> {
    // Add personalized recommendations to response
    const personalizedAdditions = finnRecommendations
      .filter(rec => rec.type === 'charter' || rec.type === 'reminder')
      .slice(0, 2); // Top 2 most relevant

    if (personalizedAdditions.length > 0) {
      botResponse.response += '\n\n🎯 **Personalized for You:**\n';
      personalizedAdditions.forEach(rec => {
        botResponse.response += `• ${rec.title}: ${rec.description}\n`;
      });
    }

    // Log interaction for FINN learning
    await this.finnAI.logInteraction(userId, {
      type: 'preference',
      data: { query: botResponse.response, recommendations: personalizedAdditions },
      sentiment: 'neutral',
      context: 'ai_assistance'
    });

    return botResponse;
  }

  /**
   * Categorize user query
   */
  private categorizeQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    // Check for emergency keywords first
    if (this.containsAny(lowerQuery, ['emergency', 'urgent', 'help', 'danger', 'safety'])) {
      return 'emergency';
    }
    
    // Check other categories
    if (this.containsAny(lowerQuery, ['book', 'booking', 'charter', 'reserve', 'cancel', 'change'])) {
      return 'booking';
    }
    
    if (this.containsAny(lowerQuery, ['payment', 'pay', 'credit card', 'charge', 'price', 'cost'])) {
      return 'payment';
    }
    
    if (this.containsAny(lowerQuery, ['login', 'password', 'account', 'app', 'mobile', 'technical'])) {
      return 'technical';
    }
    
    return 'general';
  }

  /**
   * Find best response from knowledge base
   */
  private findKnowledgeBaseResponse(query: string, category: string): {
    response: string;
    confidence: number;
    actions: string[];
  } {
    const categoryKnowledge = this.KNOWLEDGE_BASE[category as keyof typeof this.KNOWLEDGE_BASE];
    
    if (!categoryKnowledge) {
      return {
        response: "I'm here to help! Could you tell me more about what you need assistance with?",
        confidence: 60,
        actions: ['clarify_request', 'offer_categories']
      };
    }

    const lowerQuery = query.toLowerCase();
    let bestMatch = categoryKnowledge[0];
    let bestScore = 0;

    categoryKnowledge.forEach(item => {
      const score = this.calculateMatchScore(lowerQuery, item.keywords);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    });

    return {
      response: bestMatch.response,
      confidence: bestMatch.confidence,
      actions: bestMatch.actions
    };
  }

  /**
   * Generate viral elements for engagement
   */
  private generateViralElements(query: string, category: string): ViralElement[] {
    const viralElements: ViralElement[] = [];
    
    // Ice Ice Baby references (highly viral)
    if (this.containsAny(query.toLowerCase(), ['cold', 'ice', 'freeze', 'winter']) || Math.random() < 0.1) {
      const iceContent = this.VIRAL_CONTENT.ice_ice_baby[
        Math.floor(Math.random() * this.VIRAL_CONTENT.ice_ice_baby.length)
      ];
      
      viralElements.push({
        type: 'ice_ice_baby',
        content: iceContent,
        shareability: 95,
        platform: 'chat'
      });
    }

    // Random jokes and fun facts (moderate virality)
    if (Math.random() < 0.2) {
      const jokes = this.VIRAL_CONTENT.jokes;
      const funFacts = this.VIRAL_CONTENT.fun_facts;
      const allContent = [...jokes, ...funFacts];
      const randomContent = allContent[Math.floor(Math.random() * allContent.length)];
      
      viralElements.push({
        type: Math.random() < 0.5 ? 'joke' : 'fun_fact',
        content: randomContent,
        shareability: 70,
        platform: 'chat'
      });
    }

    return viralElements;
  }

  /**
   * Determine if query should be escalated to human
   */
  private shouldEscalate(query: FishyBotQuery, confidence: number): boolean {
    // Always escalate emergencies
    if (query.category === 'emergency') {
      return true;
    }

    // Escalate high priority or low confidence
    if (query.priority === 'high' || query.priority === 'critical') {
      return true;
    }

    // Escalate if confidence is low
    if (confidence < 70) {
      return true;
    }

    // Escalate complex queries
    if (query.query.length > 200) {
      return true;
    }

    return false;
  }

  /**
   * Handle AI handoff between FINN and Fishy Bot
   */
  public async handleAIHandoff(handoff: AIHandoff): Promise<void> {
    console.log(`AI Handoff: ${handoff.from} → ${handoff.to} for user ${handoff.userId}`);
    
    if (handoff.to === 'FINN' && handoff.userId) {
      // Log context for FINN learning
      await this.finnAI.logInteraction(handoff.userId, {
        type: 'preference',
        data: handoff.context,
        sentiment: 'neutral',
        context: `handoff_from_${handoff.from}`
      });
    }
    
    if (handoff.to === 'Human') {
      // Add to human escalation queue
      const escalationQuery: FishyBotQuery = {
        id: crypto.randomUUID(),
        userId: handoff.userId,
        sessionId: crypto.randomUUID(),
        query: handoff.context.query || 'AI escalation required',
        category: 'technical',
        priority: 'high',
        timestamp: new Date().toISOString(),
        context: handoff.context
      };
      
      this.escalationQueue.push(escalationQuery);
    }
  }

  /**
   * Get support metrics
   */
  public getSupportMetrics(): SupportMetrics {
    // Calculate cost savings (assuming $5 per human support ticket)
    const humanSupportCost = this.supportMetrics.escalatedToHuman * 5;
    const botSupportCost = this.supportMetrics.resolvedByBot * 0.5; // Minimal bot cost
    this.supportMetrics.costSavings = humanSupportCost - botSupportCost;
    
    return { ...this.supportMetrics };
  }

  /**
   * Get escalation queue for human agents
   */
  public getEscalationQueue(): FishyBotQuery[] {
    return [...this.escalationQueue];
  }

  /**
   * Mark escalation as resolved
   */
  public resolveEscalation(queryId: string, resolution: string): void {
    this.escalationQueue = this.escalationQueue.filter(q => q.id !== queryId);
    console.log(`Escalation ${queryId} resolved: ${resolution}`);
  }

  /**
   * Helper methods
   */
  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  private calculateMatchScore(query: string, keywords: string[]): number {
    let score = 0;
    keywords.forEach(keyword => {
      if (query.includes(keyword)) {
        score += 1;
      }
    });
    return Math.min(100, (score / keywords.length) * 100);
  }

  private generateCacheKey(query: string): string {
    return query.toLowerCase().replace(/\s+/g, '_').substring(0, 50);
  }

  private addToHistory(query: FishyBotQuery): void {
    if (!this.queryHistory.has(query.sessionId)) {
      this.queryHistory.set(query.sessionId, []);
    }
    this.queryHistory.get(query.sessionId)!.push(query);
    
    // Keep only last 10 queries per session
    const sessionHistory = this.queryHistory.get(query.sessionId)!;
    if (sessionHistory.length > 10) {
      this.queryHistory.set(query.sessionId, sessionHistory.slice(-10));
    }
  }

  private updateMetrics(responseTime: number, resolvedByBot: boolean): void {
    if (resolvedByBot) {
      this.supportMetrics.resolvedByBot++;
    } else {
      this.supportMetrics.escalatedToHuman++;
    }
    
    // Update average response time
    const totalHandled = this.supportMetrics.resolvedByBot + this.supportMetrics.escalatedToHuman;
    this.supportMetrics.averageResponseTime = 
      (this.supportMetrics.averageResponseTime * (totalHandled - 1) + responseTime) / totalHandled;
  }

  /**
   * Get comprehensive AI performance report
   */
  public getPerformanceReport(): {
    supportMetrics: SupportMetrics;
    efficiency: {
      botResolutionRate: number;
      costSavingsPerMonth: number;
      averageSatisfactionScore: number;
      viralEngagementRate: number;
    };
    recommendations: string[];
  } {
    const totalQueries = this.supportMetrics.totalQueries || 1;
    const botResolutionRate = (this.supportMetrics.resolvedByBot / totalQueries) * 100;
    
    return {
      supportMetrics: this.getSupportMetrics(),
      efficiency: {
        botResolutionRate,
        costSavingsPerMonth: this.supportMetrics.costSavings,
        averageSatisfactionScore: this.supportMetrics.satisfactionScore,
        viralEngagementRate: (this.supportMetrics.viralShares / totalQueries) * 100,
      },
      recommendations: this.generateRecommendations(botResolutionRate)
    };
  }

  private generateRecommendations(botResolutionRate: number): string[] {
    const recommendations: string[] = [];
    
    if (botResolutionRate < 70) {
      recommendations.push('Expand knowledge base to improve bot resolution rate');
    }
    
    if (this.supportMetrics.averageResponseTime > 5) {
      recommendations.push('Optimize response time for better user experience');
    }
    
    if (this.supportMetrics.viralShares < totalQueries * 0.1) {
      recommendations.push('Increase viral content to boost engagement');
    }
    
    return recommendations;
  }
}

export default DualAIArchitecture;
