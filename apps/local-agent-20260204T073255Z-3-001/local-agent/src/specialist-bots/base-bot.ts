/**
 * Base Bot Class
 * Foundation for all specialist AI bots
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export interface BotMemory {
  id: string;
  botName: string;
  topic: string;
  content: string;
  source: string;
  confidence: number;
  learnedAt: string;
  lastUsed?: string;
  useCount: number;
}

export interface LearningResult {
  topic: string;
  insights: string[];
  sources: string[];
  confidence: number;
}

export interface BotConfig {
  name: string;
  specialty: string;
  systemPrompt: string;
  learningTopics: string[];
  dailyTasks: string[];
}

export abstract class BaseBot {
  protected name: string;
  protected specialty: string;
  protected systemPrompt: string;
  protected learningTopics: string[];
  protected dailyTasks: string[];
  protected claude: Anthropic | null;
  protected supabase: any;
  protected memory: BotMemory[] = [];
  protected lastLearnDate: string = '';

  constructor(config: BotConfig) {
    this.name = config.name;
    this.specialty = config.specialty;
    this.systemPrompt = config.systemPrompt;
    this.learningTopics = config.learningTopics;
    this.dailyTasks = config.dailyTasks;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.claude = apiKey ? new Anthropic({ apiKey }) : null;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.supabase = supabaseUrl && supabaseKey 
      ? createClient(supabaseUrl, supabaseKey) 
      : null;
  }

  /**
   * Ask the bot a question
   */
  async ask(question: string, context?: string): Promise<string> {
    if (!this.claude) {
      return `${this.name} is not available (API key not configured)`;
    }

    // Include relevant memories
    const relevantMemories = this.getRelevantMemories(question);
    const memoryContext = relevantMemories.length > 0
      ? `\n\nRelevant knowledge from my memory:\n${relevantMemories.map(m => `- ${m.content}`).join('\n')}`
      : '';

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `${this.systemPrompt}${memoryContext}`,
      messages: [
        { role: 'user', content: context ? `Context: ${context}\n\nQuestion: ${question}` : question }
      ],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  /**
   * Daily learning routine
   */
  async dailyLearn(): Promise<LearningResult[]> {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastLearnDate === today) {
      console.log(`${this.name} already learned today`);
      return [];
    }

    console.log(`\n📚 ${this.name} starting daily learning...\n`);
    const results: LearningResult[] = [];

    for (const topic of this.learningTopics) {
      try {
        const result = await this.learnTopic(topic);
        results.push(result);
        console.log(`   ✅ Learned about: ${topic}`);
      } catch (error) {
        console.log(`   ❌ Failed to learn: ${topic}`);
      }
    }

    this.lastLearnDate = today;
    await this.saveMemories();

    return results;
  }

  /**
   * Learn about a specific topic
   */
  protected async learnTopic(topic: string): Promise<LearningResult> {
    if (!this.claude) {
      return { topic, insights: [], sources: [], confidence: 0 };
    }

    const prompt = `As ${this.name}, a specialist in ${this.specialty}, research and learn about: "${topic}"

Provide:
1. Key insights (3-5 bullet points)
2. Practical applications
3. Recent developments or trends
4. How this relates to my specialty

Format as JSON:
{
  "insights": ["insight1", "insight2", ...],
  "applications": ["app1", "app2", ...],
  "trends": ["trend1", "trend2", ...],
  "relevance": "how this relates to ${this.specialty}"
}`;

    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        // Store in memory
        const memory: BotMemory = {
          id: `${this.name}_${Date.now()}`,
          botName: this.name,
          topic,
          content: JSON.stringify(data),
          source: 'daily_learning',
          confidence: 0.8,
          learnedAt: new Date().toISOString(),
          useCount: 0,
        };
        this.memory.push(memory);

        return {
          topic,
          insights: [...(data.insights || []), ...(data.trends || [])],
          sources: ['Claude AI analysis'],
          confidence: 0.8,
        };
      }
    } catch {}

    return { topic, insights: [text.slice(0, 200)], sources: [], confidence: 0.5 };
  }

  /**
   * Execute daily tasks
   */
  async executeDailyTasks(): Promise<string[]> {
    console.log(`\n⚡ ${this.name} executing daily tasks...\n`);
    const results: string[] = [];

    for (const task of this.dailyTasks) {
      try {
        const result = await this.executeTask(task);
        results.push(`✅ ${task}: ${result.slice(0, 100)}`);
      } catch (error) {
        results.push(`❌ ${task}: Failed`);
      }
    }

    return results;
  }

  /**
   * Execute a specific task
   */
  protected abstract executeTask(task: string): Promise<string>;

  /**
   * Get relevant memories for a query
   */
  protected getRelevantMemories(query: string): BotMemory[] {
    const queryLower = query.toLowerCase();
    return this.memory
      .filter(m => {
        const content = m.content.toLowerCase();
        const topic = m.topic.toLowerCase();
        return content.includes(queryLower) || 
               topic.includes(queryLower) ||
               queryLower.split(' ').some(word => content.includes(word));
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  /**
   * Save memories to database
   */
  protected async saveMemories(): Promise<void> {
    if (!this.supabase) return;

    for (const memory of this.memory) {
      await this.supabase
        .from('bot_memories')
        .upsert(memory, { onConflict: 'id' })
        .catch(() => {});
    }
  }

  /**
   * Load memories from database
   */
  async loadMemories(): Promise<void> {
    if (!this.supabase) return;

    const { data } = await this.supabase
      .from('bot_memories')
      .select('*')
      .eq('botName', this.name)
      .order('learnedAt', { ascending: false })
      .limit(100);

    if (data) {
      this.memory = data;
    }
  }

  /**
   * Get bot status
   */
  getStatus(): object {
    return {
      name: this.name,
      specialty: this.specialty,
      memoriesCount: this.memory.length,
      lastLearned: this.lastLearnDate,
      isActive: !!this.claude,
      topics: this.learningTopics,
    };
  }

  getName(): string {
    return this.name;
  }

  getSpecialty(): string {
    return this.specialty;
  }
}

