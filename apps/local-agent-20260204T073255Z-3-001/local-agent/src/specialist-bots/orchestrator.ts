/**
 * Bot Orchestrator
 * Manages and coordinates all specialist bots
 */

import { BaseBot } from './base-bot.js';
import { MarketingBot } from './marketing-bot.js';
import { LawBot } from './law-bot.js';
import { SecurityBot } from './security-bot.js';
import { DocumentationBot } from './documentation-bot.js';
import { OrganizerBot } from './organizer-bot.js';
import { FinanceBot } from './finance-bot.js';
import { HealthBot } from './health-bot.js';
import { SurvivalBot } from './survival-bot.js';
import { CampingBot } from './camping-bot.js';
import { SolarBot } from './solar-bot.js';
import { OffGridBot } from './offgrid-bot.js';
import { Printer3DBot } from './printer3d-bot.js';
import { ArchitectureBot } from './architecture-bot.js';
import { EngineerBot } from './engineer-bot.js';
import { ChipBot } from './chip-bot.js';
import { BargainBot } from './bargain-bot.js';
import { BluetoothBot } from './bluetooth-bot.js';
import { NetworkingBot } from './networking-bot.js';
import { MeshtasticBot } from './meshtastic-bot.js';
import { NetSecBot } from './netsec-bot.js';
import { PasswordFinderBot } from './password-finder-bot.js';
import { DerivativesBot } from './derivatives-bot.js';
import { OptionsBot } from './options-bot.js';
import { FuturesBot } from './futures-bot.js';
import { DataModelingBot } from './data-modeling-bot.js';
import { StatisticalAnalysisBot } from './statistical-analysis-bot.js';
import { ProbabilityModelingBot } from './probability-modeling-bot.js';
import { CodingBot } from './coding-bot.js';
import { BotAcademy } from './bot-academy.js';

interface BotResponse {
  bot: string;
  specialty: string;
  response: string;
}

export class BotOrchestrator {
  private bots: Map<string, BaseBot> = new Map();
  private academy: BotAcademy;
  private botCategories: Map<string, string> = new Map();

  constructor() {
    this.academy = new BotAcademy();
    // Initialize all bots with their categories
    this.bots.set('marketing', new MarketingBot());
    this.botCategories.set('marketing', 'marketing');
    
    this.bots.set('law', new LawBot());
    this.botCategories.set('law', 'law');
    
    this.bots.set('security', new SecurityBot());
    this.botCategories.set('security', 'security');
    
    this.bots.set('documentation', new DocumentationBot());
    this.botCategories.set('documentation', 'documentation');
    
    this.bots.set('organizer', new OrganizerBot());
    this.botCategories.set('organizer', 'organizer');
    
    this.bots.set('finance', new FinanceBot());
    this.botCategories.set('finance', 'finance');

    // New lifestyle/survival bots
    this.bots.set('health', new HealthBot());
    this.botCategories.set('health', 'health');

    this.bots.set('survival', new SurvivalBot());
    this.botCategories.set('survival', 'survival');

    this.bots.set('camping', new CampingBot());
    this.botCategories.set('camping', 'camping');

    this.bots.set('solar', new SolarBot());
    this.botCategories.set('solar', 'solar');

    this.bots.set('offgrid', new OffGridBot());
    this.botCategories.set('offgrid', 'offgrid');

    // Maker/tech bots
    this.bots.set('3dprinter', new Printer3DBot());
    this.botCategories.set('3dprinter', '3dprinting');

    this.bots.set('architecture', new ArchitectureBot());
    this.botCategories.set('architecture', 'architecture');

    this.bots.set('engineer', new EngineerBot());
    this.botCategories.set('engineer', 'engineering');

    this.bots.set('chip', new ChipBot());
    this.botCategories.set('chip', 'chip');

    this.bots.set('bargain', new BargainBot());
    this.botCategories.set('bargain', 'bargain');

    this.bots.set('bluetooth', new BluetoothBot());
    this.botCategories.set('bluetooth', 'bluetooth');

    this.bots.set('networking', new NetworkingBot());
    this.botCategories.set('networking', 'networking');

    this.bots.set('meshtastic', new MeshtasticBot());
    this.botCategories.set('meshtastic', 'meshtastic');

    this.bots.set('netsec', new NetSecBot());
    this.botCategories.set('netsec', 'netsec');

    this.bots.set('password', new PasswordFinderBot());
    this.botCategories.set('password', 'password');

    // Trading specialist bots
    this.bots.set('derivatives', new DerivativesBot());
    this.botCategories.set('derivatives', 'trading');

    this.bots.set('options', new OptionsBot());
    this.botCategories.set('options', 'trading');

    this.bots.set('futures', new FuturesBot());
    this.botCategories.set('futures', 'trading');

    // PROGNO Massager data modeling bots
    this.bots.set('datamodeling', new DataModelingBot());
    this.botCategories.set('datamodeling', 'data-modeling');

    this.bots.set('statistical', new StatisticalAnalysisBot());
    this.botCategories.set('statistical', 'data-modeling');

    this.bots.set('probability', new ProbabilityModelingBot());
    this.botCategories.set('probability', 'data-modeling');

    // Coding assistant bot
    this.bots.set('coder', new CodingBot());
    this.botCategories.set('coder', 'coding');

    console.log('\n🤖 Bot Orchestrator initialized with 28 specialist bots:');
    for (const [key, bot] of this.bots) {
      console.log(`   ${bot.getName()} - ${bot.getSpecialty()}`);
    }
    console.log('🎓 Bot Academy ready for weekly challenges!\n');
  }

  /**
   * Get a specific bot
   */
  getBot(name: string): BaseBot | undefined {
    return this.bots.get(name.toLowerCase());
  }

  /**
   * Ask a specific bot
   */
  async askBot(botName: string, question: string): Promise<string> {
    const bot = this.bots.get(botName.toLowerCase());
    if (!bot) {
      return `Bot "${botName}" not found. Available: ${Array.from(this.bots.keys()).join(', ')}`;
    }
    return bot.ask(question);
  }

  /**
   * Ask all bots and get their perspectives
   */
  async askAllBots(question: string): Promise<BotResponse[]> {
    console.log(`\n🤖 Asking all bots: "${question.slice(0, 50)}..."\n`);
    const responses: BotResponse[] = [];

    for (const [key, bot] of this.bots) {
      try {
        const response = await bot.ask(question);
        responses.push({
          bot: bot.getName(),
          specialty: bot.getSpecialty(),
          response,
        });
        console.log(`   ✅ ${bot.getName()} responded`);
      } catch (error) {
        console.log(`   ❌ ${bot.getName()} failed`);
      }
    }

    return responses;
  }

  /**
   * Route question to best bot
   */
  async routeQuestion(question: string): Promise<BotResponse> {
    const qLower = question.toLowerCase();

    // Determine best bot based on keywords
    let bestBot = 'organizer'; // Default

    if (qLower.includes('market') || qLower.includes('seo') || 
        qLower.includes('content') || qLower.includes('social')) {
      bestBot = 'marketing';
    } else if (qLower.includes('legal') || qLower.includes('law') || 
               qLower.includes('compliance') || qLower.includes('regulation')) {
      bestBot = 'law';
    } else if (qLower.includes('security') || qLower.includes('vulnerability') || 
               qLower.includes('hack') || qLower.includes('auth')) {
      bestBot = 'security';
    } else if (qLower.includes('document') || qLower.includes('readme') || 
               qLower.includes('api doc') || qLower.includes('comment')) {
      bestBot = 'documentation';
    } else if (qLower.includes('price') || qLower.includes('revenue') || 
               qLower.includes('money') || qLower.includes('cost')) {
      bestBot = 'finance';
    } else     if (qLower.includes('organiz') || qLower.includes('task') || 
               qLower.includes('project') || qLower.includes('todo')) {
      bestBot = 'organizer';
    } else if (qLower.includes('health') || qLower.includes('fitness') || 
               qLower.includes('nutrition') || qLower.includes('diet') ||
               qLower.includes('workout') || qLower.includes('exercise')) {
      bestBot = 'health';
    } else if (qLower.includes('surviv') || qLower.includes('emergency') || 
               qLower.includes('prepar') || qLower.includes('bug out') ||
               qLower.includes('disaster') || qLower.includes('shtf')) {
      bestBot = 'survival';
    } else if (qLower.includes('camp') || qLower.includes('hik') || 
               qLower.includes('backpack') || qLower.includes('tent') ||
               qLower.includes('outdoor') || qLower.includes('trail')) {
      bestBot = 'camping';
    } else if (qLower.includes('solar') || qLower.includes('battery') || 
               qLower.includes('inverter') || qLower.includes('panel') ||
               qLower.includes('watt') || qLower.includes('kwh')) {
      bestBot = 'solar';
    } else if (qLower.includes('off-grid') || qLower.includes('offgrid') || 
               qLower.includes('homestead') || qLower.includes('self-suff') ||
               qLower.includes('well') || qLower.includes('septic')) {
      bestBot = 'offgrid';
    } else if (qLower.includes('3d print') || qLower.includes('filament') || 
               qLower.includes('slicer') || qLower.includes('pla') ||
               qLower.includes('resin print') || qLower.includes('cura')) {
      bestBot = '3dprinter';
    } else if (qLower.includes('architect') || qLower.includes('building design') || 
               qLower.includes('floor plan') || qLower.includes('construction') ||
               qLower.includes('renovate') || qLower.includes('adu')) {
      bestBot = 'architecture';
    } else if (qLower.includes('engineer') || qLower.includes('mechanical') || 
               qLower.includes('electrical') || qLower.includes('motor') ||
               qLower.includes('prototype') || qLower.includes('cad')) {
      bestBot = 'engineer';
    } else if (qLower.includes('chip') || qLower.includes('microcontroller') || 
               qLower.includes('arduino') || qLower.includes('esp32') ||
               qLower.includes('eeprom') || qLower.includes('firmware') ||
               qLower.includes('embedded')) {
      bestBot = 'chip';
    } else if (qLower.includes('save') || qLower.includes('bargain') || 
               qLower.includes('cheap') || qLower.includes('deal') ||
               qLower.includes('coupon') || qLower.includes('discount') ||
               qLower.includes('frugal') || qLower.includes('budget')) {
      bestBot = 'bargain';
    } else if (qLower.includes('bluetooth') || qLower.includes('ble') ||
               qLower.includes('zigbee') || qLower.includes('z-wave') ||
               qLower.includes('antenna')) {
      bestBot = 'bluetooth';
    } else if (qLower.includes('network') || qLower.includes('tcp') || 
               qLower.includes('dns') || qLower.includes('firewall') ||
               qLower.includes('vpn') || qLower.includes('routing') ||
               qLower.includes('subnet')) {
      bestBot = 'networking';
    } else if (qLower.includes('meshtastic') || qLower.includes('lora') || 
               qLower.includes('mesh') || qLower.includes('off-grid comm')) {
      bestBot = 'meshtastic';
    } else if (qLower.includes('penetrat') || qLower.includes('intrusion') || 
               qLower.includes('ids') || qLower.includes('ips') ||
               qLower.includes('attack') || qLower.includes('vulnerab') ||
               qLower.includes('exploit')) {
      bestBot = 'netsec';
    } else if (qLower.includes('password') || qLower.includes('credential') || 
               qLower.includes('login') || qLower.includes('mfa') ||
               qLower.includes('2fa') || qLower.includes('passkey')) {
      bestBot = 'password';
    } else if (qLower.includes('derivative') || qLower.includes('swap') || 
               qLower.includes('forward') || qLower.includes('structured product')) {
      bestBot = 'derivatives';
    } else if (qLower.includes('option') || qLower.includes('call') || 
               qLower.includes('put') || qLower.includes('greeks') ||
               qLower.includes('straddle') || qLower.includes('spread')) {
      bestBot = 'options';
    } else if (qLower.includes('future') || qLower.includes('commodity') || 
               qLower.includes('contango') || qLower.includes('backwardation') ||
               qLower.includes('basis') || qLower.includes('roll')) {
      bestBot = 'futures';
    } else if (qLower.includes('data model') || qLower.includes('feature engineer') || 
               qLower.includes('predictive model') || qLower.includes('machine learn') ||
               qLower.includes('model validat') || qLower.includes('ensemble')) {
      bestBot = 'datamodeling';
    } else if (qLower.includes('statistic') || qLower.includes('hypothesis test') || 
               qLower.includes('regression') || qLower.includes('p-value') ||
               qLower.includes('confidence interval') || qLower.includes('significance')) {
      bestBot = 'statistical';
    } else if (qLower.includes('probability') || qLower.includes('bayesian') || 
               qLower.includes('calibrat') || qLower.includes('prior') ||
               qLower.includes('posterior') || qLower.includes('likelihood')) {
      bestBot = 'probability';
    } else if (qLower.includes('code') || qLower.includes('build') || 
               qLower.includes('compile') || qLower.includes('error') ||
               qLower.includes('typescript') || qLower.includes('fix bug')) {
      bestBot = 'coder';
    }

    const bot = this.bots.get(bestBot)!;
    const response = await bot.ask(question);

    return {
      bot: bot.getName(),
      specialty: bot.getSpecialty(),
      response,
    };
  }

  /**
   * Run daily learning for all bots
   */
  async dailyLearning(): Promise<void> {
    console.log('\n📚 DAILY BOT LEARNING SESSION\n');
    console.log('═'.repeat(50));

    for (const [key, bot] of this.bots) {
      console.log(`\n🤖 ${bot.getName()}`);
      try {
        const results = await bot.dailyLearn();
        console.log(`   Learned ${results.length} topics`);
      } catch (error) {
        console.log(`   ❌ Learning failed`);
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Daily learning complete!\n');
  }

  /**
   * Run daily tasks for all bots
   */
  async runDailyTasks(): Promise<Map<string, string[]>> {
    console.log('\n⚡ DAILY BOT TASKS\n');
    console.log('═'.repeat(50));

    const results = new Map<string, string[]>();

    for (const [key, bot] of this.bots) {
      console.log(`\n🤖 ${bot.getName()}`);
      try {
        const taskResults = await bot.executeDailyTasks();
        results.set(key, taskResults);
        taskResults.forEach(r => console.log(`   ${r.slice(0, 60)}`));
      } catch (error) {
        console.log(`   ❌ Tasks failed`);
        results.set(key, ['Failed']);
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Daily tasks complete!\n');

    return results;
  }

  /**
   * Get status of all bots
   */
  getStatus(): object[] {
    return Array.from(this.bots.values()).map(bot => bot.getStatus());
  }

  /**
   * Generate comprehensive report
   */
  async generateComprehensiveReport(topic: string): Promise<string> {
    console.log(`\n📊 Generating comprehensive report on: ${topic}\n`);

    const responses = await this.askAllBots(
      `Provide your expert analysis on: ${topic}
      Focus on your specialty area and provide actionable insights.`
    );

    let report = `# Comprehensive Report: ${topic}\n\n`;
    report += `*Generated: ${new Date().toISOString()}*\n\n`;

    for (const response of responses) {
      report += `## ${response.bot}\n`;
      report += `*Specialty: ${response.specialty}*\n\n`;
      report += response.response + '\n\n';
      report += '---\n\n';
    }

    return report;
  }

  /**
   * List all bots
   */
  listBots(): string[] {
    return Array.from(this.bots.keys());
  }

  /**
   * Run Bot Academy weekly challenge for one bot
   */
  async runAcademyChallenge(botKey: string): Promise<{
    challenge: any;
    learnings: string;
    summary: string;
  } | null> {
    const bot = this.bots.get(botKey);
    const category = this.botCategories.get(botKey);
    
    if (!bot || !category) {
      console.log(`Bot ${botKey} not found`);
      return null;
    }

    return this.academy.runWeeklySession(bot.getName(), category);
  }

  /**
   * Run Bot Academy for ALL bots and get SMS summary
   */
  async runFullAcademyDay(): Promise<string> {
    console.log('\n🎓 BOT ACADEMY - WEEKLY CHALLENGE DAY!\n');
    console.log('Each bot will learn ONE NEW thing they\'ve never done before.\n');
    console.log('═'.repeat(60));

    const botInfo = new Map<string, { name: string; category: string }>();
    
    for (const [key, bot] of this.bots) {
      const category = this.botCategories.get(key) || key;
      botInfo.set(key, { name: bot.getName(), category });
    }

    const summary = await this.academy.runAcademyDay(botInfo);
    
    console.log('\n📱 SMS SUMMARY:\n');
    console.log(summary);
    console.log('\n' + '═'.repeat(60));
    
    return summary;
  }

  /**
   * Get academy stats for a bot
   */
  async getAcademyStats(botKey: string): Promise<object> {
    const bot = this.bots.get(botKey);
    if (!bot) return { error: 'Bot not found' };
    return this.academy.getBotStats(bot.getName());
  }

  /**
   * Get academy leaderboard
   */
  async getAcademyLeaderboard(): Promise<any[]> {
    return this.academy.getLeaderboard();
  }

  /**
   * Get the academy instance
   */
  getAcademy(): BotAcademy {
    return this.academy;
  }
}

