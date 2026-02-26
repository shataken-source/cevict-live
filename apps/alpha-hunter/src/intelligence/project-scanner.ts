/**
 * Project Scanner
 * Scans your existing projects and finds ways to monetize/improve them
 * Based on breaking news and trends
 */

import { DataPoint, Opportunity } from '../types';

interface Project {
  name: string;
  type: 'sports' | 'ai' | 'news' | 'pet' | 'legal' | 'other';
  url: string;
  monetization: string[];
  opportunities: string[];
}

const PROJECTS: Project[] = [
  {
    name: 'PROGNO',
    type: 'sports',
    url: 'https://prognoultimatev2-cevict-projects.vercel.app',
    monetization: ['subscriptions', 'premium_picks', 'affiliate'],
    opportunities: [
      'sports_betting_tips',
      'arbitrage_alerts',
      'sharp_money_notifications',
    ],
  },
  {
    name: 'Prognostication',
    type: 'sports',
    url: 'https://prognostication-cevict-projects.vercel.app',
    monetization: ['subscriptions', 'ads'],
    opportunities: ['premium_content', 'email_list', 'courses'],
  },
  {
    name: 'PROGNO Massager',
    type: 'ai',
    url: 'localhost:8501',
    monetization: ['data_services', 'api_access'],
    opportunities: ['data_processing', 'analysis_reports'],
  },
  {
    name: 'PopThePopcorn',
    type: 'news',
    url: 'https://popthepopcorn-cevict-projects.vercel.app',
    monetization: ['ads', 'affiliate'],
    opportunities: ['trending_content', 'viral_articles', 'sponsored_content'],
  },
  {
    name: 'SmokersRights',
    type: 'legal',
    url: 'https://smokersrights-cevict-projects.vercel.app',
    monetization: ['ads', 'affiliate', 'donations'],
    opportunities: ['legislation_updates', 'legal_resources', 'community'],
  },
  {
    name: 'PetReunion',
    type: 'pet',
    url: 'https://petreunion-cevict-projects.vercel.app',
    monetization: ['premium_listings', 'donations'],
    opportunities: ['lost_pet_alerts', 'reunification_services'],
  },
  {
    name: 'Cevict/Forge',
    type: 'ai',
    url: 'https://cevict-cevict-projects.vercel.app',
    monetization: ['subscriptions', 'api_access'],
    opportunities: ['ai_content_generation', 'custom_models'],
  },
];

export class ProjectScanner {
  private projects: Project[] = PROJECTS;

  async scanForOpportunities(news: any[]): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    for (const project of this.projects) {
      const projectOpps = await this.analyzeProjectOpportunities(project, news);
      opportunities.push(...projectOpps);
    }

    return opportunities.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  private async analyzeProjectOpportunities(
    project: Project,
    news: any[]
  ): Promise<Opportunity[]> {
    const opportunities: Opportunity[] = [];

    // Check news relevance to project
    const relevantNews = news.filter(item => {
      const text = `${item.title} ${item.summary}`.toLowerCase();

      switch (project.type) {
        case 'sports':
          return ['sports', 'betting', 'nfl', 'nba', 'gambling', 'odds'].some(k => text.includes(k));
        case 'ai':
          return ['ai', 'artificial intelligence', 'chatgpt', 'claude', 'machine learning'].some(k => text.includes(k));
        case 'news':
          return ['trending', 'viral', 'breaking', 'entertainment'].some(k => text.includes(k));
        case 'pet':
          return ['pet', 'dog', 'cat', 'animal', 'lost'].some(k => text.includes(k));
        case 'legal':
          return ['law', 'legislation', 'smoking', 'rights', 'regulation'].some(k => text.includes(k));
        default:
          return false;
      }
    });

    // Generate opportunities based on relevant news
    for (const newsItem of relevantNews.slice(0, 3)) {
      const opp = this.createProjectOpportunity(project, newsItem);
      if (opp) opportunities.push(opp);
    }

    // Add general monetization opportunities
    const monetizationOpp = this.analyzeMonetizationPotential(project);
    if (monetizationOpp) opportunities.push(monetizationOpp);

    return opportunities;
  }

  private createProjectOpportunity(project: Project, news: any): Opportunity | null {
    const actionMap: Record<string, string[]> = {
      sports: [
        'Create content about this news for PROGNO blog',
        'Send push notification to subscribers',
        'Update betting recommendations based on this',
      ],
      ai: [
        'Create AI-powered analysis of this topic',
        'Offer premium report generation',
        'Cross-promote with related services',
      ],
      news: [
        'Create viral article on this topic',
        'Update trending section',
        'Boost ad placement for high-traffic topic',
      ],
      pet: [
        'Create awareness campaign',
        'Partner with related organizations',
        'Boost visibility for related services',
      ],
      legal: [
        'Create legal update article',
        'Send alert to subscribers',
        'Update legislation tracker',
      ],
    };

    const actions = actionMap[project.type] || ['Review and take action'];

    return {
      id: `project_${project.name}_${Date.now()}`,
      type: 'news_play',
      source: 'Project Scanner',
      title: `${project.name}: Capitalize on "${news.title.substring(0, 40)}..."`,
      description: `Relevant news for ${project.name} - potential monetization opportunity`,
      confidence: 65, // Fixed baseline — no real signal to vary on
      expectedValue: this.estimateValue(project, news),
      riskLevel: 'low',
      timeframe: 'Within 24-48 hours',
      requiredCapital: 0, // Time investment, not capital
      potentialReturn: this.estimateValue(project, news),
      reasoning: [
        `News item relevant to ${project.type} vertical`,
        `${project.name} can leverage this for ${project.monetization.join(', ')}`,
        'Timely action increases engagement',
      ],
      dataPoints: [{
        source: news.source,
        metric: 'News Relevance',
        value: 'High',
        relevance: 80,
        timestamp: new Date().toISOString(),
      }],
      action: {
        platform: 'manual',
        actionType: 'bet', // "Betting" on content/action
        amount: 0,
        target: project.name,
        instructions: actions,
        autoExecute: false,
      },
      expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  private analyzeMonetizationPotential(project: Project): Opportunity | null {
    const potentialByType: Record<string, number> = {
      sports: 50, // High potential with betting affiliate
      ai: 40, // Good potential with subscriptions
      news: 20, // Ad-based revenue
      pet: 10, // Donation/premium based
      legal: 15, // Niche but dedicated audience
      other: 5,
    };

    const dailyPotential = potentialByType[project.type] || 5;

    // Only return if there's meaningful potential
    if (dailyPotential < 10) return null;

    return {
      id: `monetize_${project.name}_${Date.now()}`,
      type: 'event',
      source: 'Project Scanner',
      title: `Optimize ${project.name} for $${dailyPotential}/day`,
      description: `Untapped monetization potential in ${project.name}`,
      confidence: 70,
      expectedValue: dailyPotential,
      riskLevel: 'low',
      timeframe: 'Ongoing',
      requiredCapital: 0,
      potentialReturn: dailyPotential * 30, // Monthly
      reasoning: [
        `${project.name} has ${project.monetization.length} monetization channels`,
        `Type: ${project.type} - estimated $${dailyPotential}/day potential`,
        'Optimization can increase revenue',
      ],
      dataPoints: [],
      action: {
        platform: 'manual',
        actionType: 'bet',
        amount: 0,
        target: project.name,
        instructions: [
          `Review ${project.monetization.join(', ')} on ${project.name}`,
          'Identify conversion optimization opportunities',
          'A/B test pricing or ad placements',
          'Analyze user behavior for drop-off points',
        ],
        autoExecute: false,
      },
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  private estimateValue(project: Project, _news: any): number {
    // Estimate potential dollar value of acting on this news
    const baseValues: Record<string, number> = {
      sports: 25, // Sports betting content can drive affiliate revenue
      ai: 15, // AI services can generate leads
      news: 10, // Ad impressions from trending content
      pet: 5, // Lower direct monetization
      legal: 8, // Niche but engaged audience
      other: 3,
    };

    return baseValues[project.type] || 3;
  }

  async getDailyProjectSuggestion(): Promise<string> {
    let suggestion = `📊 PROJECT OPPORTUNITIES\n\n`;

    for (const project of this.projects.slice(0, 4)) {
      const potential = this.analyzeMonetizationPotential(project);
      if (potential) {
        suggestion += `${project.name}:\n`;
        suggestion += `  💰 Potential: $${potential.expectedValue}/day\n`;
        suggestion += `  📋 Actions: ${potential.action.instructions[0]}\n\n`;
      }
    }

    const totalDaily = this.projects.reduce((sum, p) => {
      const pot = this.analyzeMonetizationPotential(p);
      return sum + (pot?.expectedValue || 0);
    }, 0);

    suggestion += `\n💵 Total Daily Potential: $${totalDaily}`;
    suggestion += `\n📈 Monthly Potential: $${totalDaily * 30}`;

    return suggestion;
  }

  getProjectStats(): { name: string; type: string; monetization: string[]; dailyPotential: number }[] {
    return this.projects.map(p => ({
      name: p.name,
      type: p.type,
      monetization: p.monetization,
      dailyPotential: this.analyzeMonetizationPotential(p)?.expectedValue || 0,
    }));
  }
}

