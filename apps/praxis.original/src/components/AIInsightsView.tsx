'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Brain, Send, Loader2, Sparkles, TrendingUp, TrendingDown,
  AlertTriangle, Lightbulb, BarChart2, MessageSquare, Zap
} from 'lucide-react';
import type { Trade, PortfolioStats } from '@/types';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';

interface AIInsightsViewProps {
  trades: Trade[];
  stats: PortfolioStats;
  apiKey?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Pre-built insight prompts
const QUICK_PROMPTS = [
  { icon: TrendingDown, label: 'Why did I lose money?', prompt: 'Analyze my losing trades and tell me what patterns you see. What am I doing wrong?' },
  { icon: TrendingUp, label: 'Best performing strategies', prompt: 'What patterns do you see in my winning trades? What should I do more of?' },
  { icon: AlertTriangle, label: 'Risk assessment', prompt: 'Assess my risk exposure. Am I over-leveraged? What are my biggest risks?' },
  { icon: Lightbulb, label: 'Position sizing advice', prompt: 'Based on my win rate and average returns, what position sizing should I use?' },
  { icon: BarChart2, label: 'Market selection', prompt: 'Which market categories am I best at? Where should I focus my trading?' },
  { icon: Zap, label: 'Improve my edge', prompt: 'What specific changes would improve my trading performance the most?' },
];

// Generate trade summary for AI context
function generateTradeSummary(trades: Trade[], stats: PortfolioStats): string {
  const settledTrades = trades.filter(t => t.status === 'settled');
  const openPositions = trades.filter(t => t.status === 'open');
  
  // Get market categories
  const marketCategories = new Map<string, { count: number; pnl: number }>();
  settledTrades.forEach(t => {
    const category = t.category || 'Unknown';
    const existing = marketCategories.get(category) || { count: 0, pnl: 0 };
    marketCategories.set(category, { 
      count: existing.count + 1, 
      pnl: existing.pnl + (t.pnl || 0) 
    });
  });
  
  // Best and worst trades
  const sortedByPnL = settledTrades
    .filter(t => t.pnl !== null)
    .sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
  
  const topWins = sortedByPnL.slice(0, 3);
  const topLosses = sortedByPnL.slice(-3).reverse();
  
  // Time analysis
  const dayOfWeekPerformance = new Array(7).fill(0).map(() => ({ trades: 0, pnl: 0 }));
  settledTrades.forEach(t => {
    const day = new Date(t.entry_time).getDay();
    dayOfWeekPerformance[day].trades++;
    dayOfWeekPerformance[day].pnl += t.pnl || 0;
  });
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bestDay = dayOfWeekPerformance.reduce((best, curr, i) => 
    curr.pnl > dayOfWeekPerformance[best].pnl ? i : best, 0);
  const worstDay = dayOfWeekPerformance.reduce((worst, curr, i) => 
    curr.pnl < dayOfWeekPerformance[worst].pnl ? i : worst, 0);
  
  return `
TRADER PORTFOLIO ANALYSIS
========================

OVERVIEW:
- Total Trades: ${stats.total_trades}
- Win Rate: ${stats.win_rate.toFixed(1)}%
- Total P&L: $${stats.total_pnl.toFixed(2)}
- Winning Trades: ${stats.winning_trades}, Losing Trades: ${stats.losing_trades}

RISK METRICS:
- Sharpe Ratio: ${stats.sharpe_ratio.toFixed(2)} (>1 is good, >2 is excellent)
- Sortino Ratio: ${stats.sortino_ratio.toFixed(2)}
- Profit Factor: ${stats.profit_factor === Infinity ? 'Infinite' : stats.profit_factor.toFixed(2)}
- Max Drawdown: $${stats.max_drawdown.toFixed(2)}

TRADE STATISTICS:
- Average Win: $${stats.avg_win.toFixed(2)}
- Average Loss: $${stats.avg_loss.toFixed(2)}
- Best Trade: $${stats.best_trade.toFixed(2)}
- Worst Trade: $${stats.worst_trade.toFixed(2)}
- Average Hold Time: ${stats.avg_hold_time_hours.toFixed(1)} hours

KELLY CRITERION:
- Optimal Bet Size: ${(stats.kelly_fraction * 100).toFixed(1)}% of bankroll

BY DIRECTION:
- YES trades: ${settledTrades.filter(t => t.direction === 'YES').length} (P&L: $${settledTrades.filter(t => t.direction === 'YES').reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)})
- NO trades: ${settledTrades.filter(t => t.direction === 'NO').length} (P&L: $${settledTrades.filter(t => t.direction === 'NO').reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)})

BY MARKET CATEGORY:
${Array.from(marketCategories.entries()).map(([cat, data]) => 
  `- ${cat}: ${data.count} trades, $${data.pnl.toFixed(2)} P&L`
).join('\n')}

TOP 3 WINNING TRADES:
${topWins.map(t => `- ${t.market_title.substring(0, 50)}: +$${(t.pnl || 0).toFixed(2)}`).join('\n')}

TOP 3 LOSING TRADES:
${topLosses.map(t => `- ${t.market_title.substring(0, 50)}: -$${Math.abs(t.pnl || 0).toFixed(2)}`).join('\n')}

TIMING ANALYSIS:
- Best Day: ${days[bestDay]} ($${dayOfWeekPerformance[bestDay].pnl.toFixed(2)})
- Worst Day: ${days[worstDay]} ($${dayOfWeekPerformance[worstDay].pnl.toFixed(2)})

OPEN POSITIONS: ${openPositions.length}
${openPositions.slice(0, 5).map(t => 
  `- ${t.market_title.substring(0, 40)}: ${t.direction} @ $${t.entry_price.toFixed(2)} (${t.quantity} contracts)`
).join('\n')}
`.trim();
}

// AI Chat Interface
function AIChat({ 
  trades, 
  stats,
  apiKey 
}: { 
  trades: Trade[]; 
  stats: PortfolioStats;
  apiKey?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    const userMessage: Message = { role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Generate context from trades
      const tradeSummary = generateTradeSummary(trades, stats);
      
      const systemPrompt = `You are PRAXIS AI, an expert trading analyst assistant built into a prediction market trading platform. You help traders understand their performance, identify patterns, and improve their strategies.

You have access to the trader's complete portfolio data below. Analyze it to provide specific, actionable insights. Be direct and data-driven. Reference specific numbers from their data.

${tradeSummary}

Guidelines:
- Be specific - reference actual numbers from their portfolio
- Be actionable - give concrete suggestions they can implement
- Be honest - if they're underperforming, tell them clearly
- Use prediction market terminology (YES/NO contracts, settlement, etc.)
- Keep responses concise but insightful`;

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content }
          ],
          systemPrompt,
          apiKey
        })
      });
      
      if (!response.ok) {
        throw new Error('AI request failed');
      }
      
      const data = await response.json();
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      // Fallback to local analysis if API fails
      const assistantMessage: Message = {
        role: 'assistant',
        content: generateLocalInsight(content, trades, stats),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="card flex flex-col h-[500px]">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-800">
        <Brain className="text-indigo-400" size={20} />
        <h3 className="font-semibold">AI Trading Analyst</h3>
        <span className="ml-auto text-xs text-zinc-500">Powered by Claude</span>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-zinc-500 py-8">
            <Sparkles className="mx-auto mb-3" size={32} />
            <p>Ask me anything about your trading performance</p>
            <p className="text-sm mt-1">I have access to all your trade data</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div 
              key={i} 
              className={cn(
                'p-3 rounded-lg',
                msg.role === 'user' 
                  ? 'bg-indigo-600 ml-8' 
                  : 'bg-zinc-800 mr-8'
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))
        )}
        {isLoading && (
          <div className="bg-zinc-800 p-3 rounded-lg mr-8 flex items-center gap-2">
            <Loader2 className="animate-spin" size={16} />
            <span className="text-sm text-zinc-400">Analyzing your trades...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask about your trading performance..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
          disabled={isLoading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={isLoading || !input.trim()}
          className="btn-primary p-2"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

// Local insight generation (fallback)
function generateLocalInsight(question: string, trades: Trade[], stats: PortfolioStats): string {
  const q = question.toLowerCase();
  
  if (q.includes('lose') || q.includes('losing') || q.includes('wrong')) {
    const losers = trades.filter(t => t.status === 'settled' && (t.pnl || 0) < 0);
    if (losers.length === 0) return "Looking at your data, you don't have any losing trades yet. Keep up the good work!";
    
    const avgLoss = losers.reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0) / losers.length;
    const yesLosses = losers.filter(t => t.direction === 'YES').length;
    const noLosses = losers.filter(t => t.direction === 'NO').length;
    
    return `Looking at your ${losers.length} losing trades:

📉 **Average Loss**: $${avgLoss.toFixed(2)}
📊 **Direction Split**: ${yesLosses} YES losses vs ${noLosses} NO losses

${yesLosses > noLosses * 1.5 ? "⚠️ You're losing more on YES bets - you might be too optimistic" : ""}
${stats.avg_loss > stats.avg_win * 1.5 ? "⚠️ Your average loss is bigger than your average win - consider tighter stop losses" : ""}
${stats.win_rate < 50 ? `⚠️ With a ${stats.win_rate.toFixed(1)}% win rate, you need your winners to be significantly larger than losers` : ""}

**Suggestions**:
1. Review your entry criteria - are you chasing prices?
2. Consider position sizing: Kelly suggests ${(stats.kelly_fraction * 100).toFixed(1)}% max per trade
3. Set mental stop losses and stick to them`;
  }
  
  if (q.includes('win') || q.includes('best') || q.includes('good')) {
    const winners = trades.filter(t => t.status === 'settled' && (t.pnl || 0) > 0);
    if (winners.length === 0) return "You don't have any winning trades yet. Keep analyzing and refining your strategy!";
    
    return `Analyzing your ${winners.length} winning trades:

📈 **Win Rate**: ${stats.win_rate.toFixed(1)}%
💰 **Average Win**: $${stats.avg_win.toFixed(2)}
🏆 **Best Trade**: $${stats.best_trade.toFixed(2)}

**Patterns I see**:
${stats.win_rate > 55 ? "✅ Above-average win rate - your edge selection is working" : ""}
${stats.profit_factor > 1.5 ? "✅ Solid profit factor - your wins outpace losses well" : ""}
${stats.sharpe_ratio > 1 ? "✅ Good risk-adjusted returns" : ""}

**To do more of what's working**:
1. Document what made your best trades successful
2. Size up on high-conviction plays
3. Your best day appears to be working in your favor - lean into it`;
  }
  
  if (q.includes('risk') || q.includes('exposure')) {
    return `Your risk profile analysis:

📊 **Sharpe Ratio**: ${stats.sharpe_ratio.toFixed(2)} ${stats.sharpe_ratio >= 1 ? '✅ Good' : '⚠️ Could improve'}
📉 **Max Drawdown**: $${stats.max_drawdown.toFixed(2)}
⚖️ **Sortino Ratio**: ${stats.sortino_ratio.toFixed(2)}

**Risk Assessment**:
${stats.max_drawdown > stats.total_pnl * 0.5 ? "⚠️ Your max drawdown is over 50% of total profits - consider reducing position sizes" : "✅ Drawdown is well-controlled"}
${stats.kelly_fraction > 0.25 ? "⚠️ Kelly suggests large bets - this indicates high edge but also high variance" : ""}

**Recommendations**:
1. Never risk more than ${Math.min(stats.kelly_fraction * 50, 10).toFixed(1)}% on a single trade
2. Keep total open exposure under 30% of bankroll
3. Diversify across uncorrelated markets`;
  }
  
  // Default response
  return `Based on your ${stats.total_trades} trades:

📈 **P&L**: ${stats.total_pnl >= 0 ? '+' : ''}$${stats.total_pnl.toFixed(2)}
📊 **Win Rate**: ${stats.win_rate.toFixed(1)}%
⚖️ **Risk-Adjusted**: Sharpe ${stats.sharpe_ratio.toFixed(2)}

What would you like to know specifically? Try asking:
- "Why am I losing money?"
- "What's my best strategy?"
- "How should I size my positions?"`;
}

// Quick Insights Panel
function QuickInsights({ stats, trades }: { stats: PortfolioStats; trades: Trade[] }) {
  const insights: { type: 'good' | 'warning' | 'critical'; message: string }[] = [];
  
  // Generate insights based on stats
  if (stats.win_rate >= 55) {
    insights.push({ type: 'good', message: `Strong ${stats.win_rate.toFixed(1)}% win rate - you're picking winners` });
  } else if (stats.win_rate < 45) {
    insights.push({ type: 'warning', message: `${stats.win_rate.toFixed(1)}% win rate needs improvement - focus on edge selection` });
  }
  
  if (stats.sharpe_ratio >= 2) {
    insights.push({ type: 'good', message: `Excellent ${stats.sharpe_ratio.toFixed(2)} Sharpe - professional-grade returns` });
  } else if (stats.sharpe_ratio < 0.5) {
    insights.push({ type: 'critical', message: `Low Sharpe ratio - returns don't justify the risk taken` });
  }
  
  if (stats.profit_factor >= 2) {
    insights.push({ type: 'good', message: `${stats.profit_factor.toFixed(2)}x profit factor - wins well exceed losses` });
  } else if (stats.profit_factor < 1) {
    insights.push({ type: 'critical', message: `Profit factor below 1 - you're losing money overall` });
  }
  
  if (Math.abs(stats.avg_loss) > stats.avg_win * 2) {
    insights.push({ type: 'warning', message: `Average loss ($${Math.abs(stats.avg_loss).toFixed(2)}) is 2x+ your average win - cut losers faster` });
  }
  
  const openTrades = trades.filter(t => t.status === 'open');
  if (openTrades.length > 10) {
    insights.push({ type: 'warning', message: `${openTrades.length} open positions - consider reducing exposure` });
  }
  
  if (insights.length === 0) {
    insights.push({ type: 'good', message: 'Portfolio looks healthy! Keep tracking your performance.' });
  }
  
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="text-yellow-400" size={20} />
        <h3 className="font-semibold">Quick Insights</h3>
      </div>
      
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div 
            key={i}
            className={cn(
              'p-3 rounded-lg flex items-start gap-3',
              insight.type === 'good' ? 'bg-green-500/10 border border-green-500/20' :
              insight.type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/20' :
              'bg-red-500/10 border border-red-500/20'
            )}
          >
            {insight.type === 'good' ? (
              <TrendingUp className="text-green-400 shrink-0" size={18} />
            ) : insight.type === 'warning' ? (
              <AlertTriangle className="text-yellow-400 shrink-0" size={18} />
            ) : (
              <TrendingDown className="text-red-400 shrink-0" size={18} />
            )}
            <p className="text-sm">{insight.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main AI Insights View
export default function AIInsightsView({ trades, stats, apiKey }: AIInsightsViewProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI Insights</h2>
        <p className="text-zinc-500">Get personalized analysis of your trading performance</p>
      </div>
      
      {/* Quick Prompts */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => setSelectedPrompt(prompt.prompt)}
            className="p-4 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 hover:border-indigo-500/50 transition-all text-left group"
          >
            <prompt.icon className="text-indigo-400 mb-2 group-hover:scale-110 transition-transform" size={20} />
            <p className="text-sm font-medium">{prompt.label}</p>
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AIChat 
            trades={trades} 
            stats={stats} 
            apiKey={apiKey}
          />
        </div>
        
        <div>
          <QuickInsights stats={stats} trades={trades} />
        </div>
      </div>
    </div>
  );
}
