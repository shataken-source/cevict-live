'use client';

import { Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import FINNAI from '../lib/finnAI';
import { t } from '@/lib/translations';

interface Message {
  id: string;
  role: 'user' | 'finn';
  content: string;
  timestamp: Date;
  type?: 'booking' | 'weather' | 'activity' | 'general';
}

export default function FinnConcierge({ userId, language = 'en' }: { userId?: string; language?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const finnAI = FINNAI.getInstance();
  const [sessionId] = useState(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `finn-${Date.now()}`
  );

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting: Message = {
        id: '1',
        role: 'finn',
        content: t(language, 'finn.greeting'),
        timestamp: new Date(),
        type: 'general',
      };
      setMessages([greeting]);
    }
  }, [isOpen, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setIsTyping(true);

    const response = await processMessage(userInput, userId);

    setIsTyping(false);

    const finnMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'finn',
      content: response.content,
      timestamp: new Date(),
      type: response.type,
    };

    // Extract and save special dates (anniversaries, birthdays) from conversation
    let proactiveMessage = '';
    if (userId) {
      try {
        const { extractSpecialDates, saveSpecialDates, getUpcomingOccasions } = await import('../lib/anniversary-tracker');

        // Extract dates from user message
        const { anniversaries, birthdays } = extractSpecialDates(userInput);
        if (anniversaries.length > 0 || birthdays.length > 0) {
          await saveSpecialDates(userId, anniversaries, birthdays);
        }

        // Check for upcoming occasions and add proactive reminder
        const occasions = await getUpcomingOccasions(userId, 45);
        if (occasions.anniversaries.length > 0) {
          const nextAnn = occasions.anniversaries[0];
          const annDate = new Date(nextAnn.date);
          const daysUntil = Math.ceil((annDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= 45 && daysUntil > 0) {
            proactiveMessage = `\n\n🎉 By the way, I noticed your anniversary is coming up in ${daysUntil} days! `;
            if (nextAnn.originalBookingDate) {
              proactiveMessage += `You booked a vacation around this time last year. Would you like me to help you rebook another special vacation for your anniversary? 🏖️`;
            } else {
              proactiveMessage += `Would you like to plan a special anniversary vacation? I can help you find the perfect rental or plan activities! 🏖️`;
            }
          }
        } else if (occasions.birthdays.length > 0) {
          const nextBd = occasions.birthdays[0];
          const bdDate = new Date(nextBd.date);
          const daysUntil = Math.ceil((bdDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= 30 && daysUntil > 0) {
            proactiveMessage = `\n\n🎂 I see ${nextBd.name || 'your'}'s birthday is coming up in ${daysUntil} days! Would you like to plan a special birthday celebration? I can help you find the perfect rental or activities! 🎉`;
          }
        }
      } catch (error) {
        console.error('Failed to process special dates:', error);
      }
    }

    const finnMessageWithReminder: Message = {
      ...finnMessage,
      content: response.content + proactiveMessage
    };

    setMessages((prev) => [...prev, finnMessageWithReminder]);

    // Log to backend for cross-platform memory
    try {
      await fetch('/api/chat/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bot: 'finn',
          platform: 'wtv',
          session_id: sessionId,
          message: userInput,
          response: finnMessageWithReminder.content,
          sentiment: null,
          confidence_score: null,
          escalated: false,
          metadata: { type: response.type },
        }),
      });
    } catch {
      // best-effort; ignore
    }

    // Log conversation for learning - EVERY interaction is logged
    if (userId || true) { // Log even for anonymous users
      const userIdToUse = userId || `anonymous-${Date.now()}`;
      try {
        if (finnAI.logConversation) {
          await finnAI.logConversation(
            userIdToUse,
            userInput,
            response.content,
            response.type
          );
        } else if (finnAI.logInteraction) {
          await finnAI.logInteraction(userIdToUse, {
            type: 'preference',
            data: { message: userInput, response: response.content },
            sentiment: 'neutral',
            context: 'conversation',
          });
        }
      } catch (error) {
        console.error('Failed to log conversation:', error);
      }
    }

    // Track booking for anniversary detection
    if (response.type === 'booking' && userId && (userInput.toLowerCase().includes('book') || userInput.toLowerCase().includes('reserve'))) {
      try {
        await fetch('/api/bookings/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            bookingDate: new Date().toISOString(),
            serviceType: userInput.toLowerCase().includes('rental') || userInput.toLowerCase().includes('condo') ? 'condo' : 'charter',
            specialOccasion: userInput.toLowerCase().includes('anniversary') ? 'anniversary' :
                           userInput.toLowerCase().includes('birthday') ? 'birthday' : null
          })
        });
      } catch (error) {
        console.error('Failed to track booking:', error);
      }
    }
  };

  const processMessage = async (message: string, userId?: string): Promise<{
    content: string;
    type?: 'booking' | 'weather' | 'activity' | 'general';
  }> => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('book') || lowerMessage.includes('rental') || lowerMessage.includes('vacation')) {
      return await startBookingFlow();
    }

    if (lowerMessage.includes('weather') || lowerMessage.includes('rain') || lowerMessage.includes('forecast')) {
      return await getWeatherInfo();
    }

    if (lowerMessage.includes('activity') || lowerMessage.includes('do') || lowerMessage.includes('rainy day')) {
      return await getActivitySuggestions();
    }

    if (userId) {
      const recommendations = await finnAI.getPersonalizedRecommendations(userId);
      if (recommendations.length > 0) {
        const topRec = recommendations[0];
        return {
          content: `Based on your preferences, I'd recommend: ${topRec.title}. ${topRec.description}. Would you like to book this?`,
          type: 'general',
        };
      }
    }

    return {
      content: "I'm here to help! I can assist with:\n• Booking vacation rentals\n• Finding activities and attractions\n• Checking weather and rain day alternatives\n• Planning your perfect Gulf Coast vacation\n\nWhat would you like to do?",
      type: 'general',
    };
  };

  const startBookingFlow = async (): Promise<{
    content: string;
    type: 'booking';
  }> => {
    return {
      content: "Great! I'll help you book the perfect vacation. Let me ask you a few quick questions to plan your entire trip:\n\n1. What type of accommodation are you looking for? (Beachfront condo, house, villa)\n2. When would you like to check in?\n3. How many guests?\n4. What's your budget range?\n5. Would you like to add a fishing charter or other activities?\n6. Any special preferences? (Pet-friendly, indoor activities for rainy days, etc.)\n\nJust tell me your answers and I'll find the perfect place and suggest backup activities in case of weather issues!",
      type: 'booking',
    };
  };

  const getWeatherInfo = async (): Promise<{
    content: string;
    type: 'weather';
  }> => {
    try {
      // Try GCC weather API first, then progno
      const gccUrl = process.env.NEXT_PUBLIC_GCC_BASE_URL || 'http://localhost:3009';
      const response = await fetch(`${gccUrl}/api/weather/current`);

      if (response.ok) {
        const weather = await response.json();
        let content = `🌤️ **Current Weather Conditions:**\n\n`;
        content += `• Temperature: ${weather.temperature}°F\n`;
        content += `• Conditions: ${weather.conditions}\n`;
        content += `• Wind: ${weather.windSpeed} mph ${weather.windDirection}\n\n`;

        if (weather.rainChance > 50) {
          content += `⚠️ **Rain Alert:** There's a ${weather.rainChance}% chance of rain. I can suggest indoor activities!\n\n`;
          content += `Would you like me to find rain day alternatives?`;
        } else {
          content += `✅ Perfect conditions for outdoor activities!`;
        }

        return { content, type: 'weather' };
      }
    } catch (error) {
      // Fallback
    }

    return {
      content: "I can check the weather for you! Currently seeing good conditions. Would you like me to check specific dates or find rain day alternatives?",
      type: 'weather',
    };
  };

  const getActivitySuggestions = async (): Promise<{
    content: string;
    type: 'activity';
  }> => {
    try {
      const gccUrl = process.env.NEXT_PUBLIC_GCC_BASE_URL || 'http://localhost:3009';

      // Get activities, boats, and rentals
      const [activitiesRes, boatsRes, rentalsRes] = await Promise.all([
        fetch(`${gccUrl}/api/activities/local`).catch(() => null),
        fetch(`${gccUrl}/api/boats?available=true&limit=5`).catch(() => null),
        fetch('/api/rentals?available=true&limit=5').catch(() => null),
      ]);

      const activities = activitiesRes?.ok ? await activitiesRes.json() : [];
      const boats = boatsRes?.ok ? await boatsRes.json() : [];
      const rentals = rentalsRes?.ok ? await rentalsRes.json() : [];

      let content = `🎯 **Local Activities & Options Available:**\n\n`;

      // Show activities
      if (activities.length > 0) {
        content += `**Indoor Activities:**\n`;
        activities.slice(0, 3).forEach((activity: any, index: number) => {
          content += `${index + 1}. **${activity.name}** - ${activity.description}\n`;
          content += `   Price: $${activity.price} | Duration: ${activity.duration}\n\n`;
        });
      }

      // Show boats/charters
      if (boats.length > 0) {
        content += `**Available Charters:**\n`;
        boats.slice(0, 2).forEach((boat: any, index: number) => {
          content += `${index + 1}. **${boat.name}** - ${boat.type || 'Charter'}\n`;
          content += `   $${boat.price || 'Contact'}/hour | ${boat.capacity || 'N/A'} guests | ${boat.home_port || 'Gulf Coast'}\n\n`;
        });
      }

      // Show rentals
      if (rentals.length > 0) {
        content += `**Available Rentals:**\n`;
        rentals.slice(0, 2).forEach((rental: any, index: number) => {
          content += `${index + 1}. **${rental.name}** - ${rental.type?.replace(/_/g, ' ') || 'Rental'}\n`;
          content += `   $${rental.nightly_rate}/night | ${rental.max_guests} guests | ${rental.address || 'Gulf Coast'}\n\n`;
        });
      }

      if (activities.length === 0 && boats.length === 0 && rentals.length === 0) {
        content = "I'm searching for activities, charters, and rentals in your area. Would you like me to check specific dates or locations?";
      } else {
        content += `Would you like to book any of these? I can help you plan your perfect vacation!`;
      }

      return { content, type: 'activity' };
    } catch (error) {
      return {
        content: "I can find great local activities, charters, and rentals for you! From indoor museums to fishing charters to beachfront condos, there's something for everyone. Would you like me to search for specific types?",
        type: 'activity',
      };
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all z-50 flex items-center gap-2"
          aria-label={t(language, 'finn.openLabel')}
        >
          <Sparkles className="w-6 h-6" />
          <span className="font-medium">{t(language, 'finn.openLabel')}</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold">Finn - Your Concierge</h3>
                <p className="text-xs text-blue-100">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-full p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t(language, 'finn.placeholder')}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
