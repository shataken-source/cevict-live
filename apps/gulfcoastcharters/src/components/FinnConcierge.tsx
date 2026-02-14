'use client';

import { Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import FINNAI from '../lib/finnAI';

interface Message {
  id: string;
  role: 'user' | 'finn';
  content: string;
  timestamp: Date;
  type?: 'booking' | 'weather' | 'activity' | 'general';
}

interface BookingQuestion {
  id: string;
  question: string;
  type: 'text' | 'date' | 'number' | 'select';
  options?: string[];
  required: boolean;
}

export default function FinnConcierge({ userId }: { userId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [bookingFlow, setBookingFlow] = useState<{
    active: boolean;
    questions: BookingQuestion[];
    answers: Record<string, any>;
    currentQuestionIndex: number;
    completed: boolean;
    progress: number;
  }>({
    active: false,
    questions: [],
    answers: {},
    currentQuestionIndex: 0,
    completed: false,
    progress: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const finnAI = FINNAI.getInstance();
  const [packageRec, setPackageRec] = useState<{
    discount_amount: number;
    final_price: number;
    finn_reasoning: string[];
  } | null>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial greeting
      const greeting: Message = {
        id: '1',
        role: 'finn',
        content: "Hi! I'm Finn, your personal vacation concierge! 🌊 I can help you book your entire Gulf Coast vacation - from charters to accommodations to activities. What would you like to do today?",
        timestamp: new Date(),
        type: 'general',
      };
      setMessages([greeting]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Finn package recommendation: "Book charter + rental, save 15%"
  useEffect(() => {
    if (!isOpen || packageRec) return;
    const start = new Date();
    const end = new Date();
    start.setDate(start.getDate() + 7);
    end.setDate(end.getDate() + 9);
    fetch('/api/gcc/packages/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: userId || 'anonymous',
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        location: 'Gulf Coast',
      }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.success && data?.data) {
          setPackageRec({
            discount_amount: data.data.discount_amount ?? 0,
            final_price: data.data.final_price ?? 0,
            finn_reasoning: data.data.finn_reasoning ?? [],
          });
        }
      })
      .catch(() => {});
  }, [isOpen, userId]);

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

    // Process with FINN AI
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
            proactiveMessage = `\n\n🎉 By the way, I noticed your ${nextAnn.type === 'wedding' ? 'wedding ' : ''}anniversary is coming up in ${daysUntil} days! `;
            if (nextAnn.originalBookingDate) {
              proactiveMessage += `You booked a vacation around this time last year. Would you like me to help you rebook another special vacation for your anniversary? 🌊`;
            } else {
              proactiveMessage += `Would you like to plan a special anniversary vacation? I can help you book a charter or find the perfect accommodation! 🌊`;
            }
          }
        } else if (occasions.birthdays.length > 0) {
          const nextBd = occasions.birthdays[0];
          const bdDate = new Date(nextBd.date);
          const daysUntil = Math.ceil((bdDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= 30 && daysUntil > 0) {
            proactiveMessage = `\n\n🎂 I see ${nextBd.name || 'your'}'s birthday is coming up in ${daysUntil} days! Would you like to plan a special birthday celebration? I can help you book a charter or find activities! 🎉`;
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

    // Log conversation for learning - EVERY interaction is logged
    if (userId || true) { // Log even for anonymous users
      const userIdToUse = userId || `anonymous-${Date.now()}`;
      try {
        await finnAI.logConversation(
          userIdToUse,
          userInput,
          response.content,
          response.type
        );
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
            serviceType: userInput.toLowerCase().includes('charter') ? 'charter' : 'condo',
            specialOccasion: userInput.toLowerCase().includes('anniversary') ? 'anniversary' :
                           userInput.toLowerCase().includes('birthday') ? 'birthday' : null
          })
        });
      } catch (error) {
        console.error('Failed to track booking:', error);
      }
    }

    // If booking flow is active, continue with questions
    if (response.bookingFlow) {
      setBookingFlow(response.bookingFlow);
    } else if (bookingFlow.active) {
      // Process answer in booking flow
      await processBookingAnswer(userInput);
    }
  };

  const processBookingAnswer = async (answer: string) => {
    if (!bookingFlow.active) return;

    const currentQuestion = bookingFlow.questions[bookingFlow.currentQuestionIndex];
    if (!currentQuestion) return;

    // Validate answer
    let validatedAnswer: any = answer.trim();

    if (currentQuestion.type === 'number') {
      const num = parseInt(answer);
      if (isNaN(num) || num < 1) {
        const errorMsg: Message = {
          id: Date.now().toString(),
          role: 'finn',
          content: `Please provide a valid number. ${currentQuestion.question}`,
          timestamp: new Date(),
          type: 'booking',
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }
      validatedAnswer = num;
    } else if (currentQuestion.type === 'date') {
      const date = new Date(answer);
      if (isNaN(date.getTime())) {
        const errorMsg: Message = {
          id: Date.now().toString(),
          role: 'finn',
          content: `Please provide a valid date (e.g., MM/DD/YYYY or "next Friday"). ${currentQuestion.question}`,
          timestamp: new Date(),
          type: 'booking',
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }
      validatedAnswer = date.toISOString().split('T')[0];
    } else if (currentQuestion.type === 'select') {
      const match = currentQuestion.options?.find(opt =>
        opt.toLowerCase().includes(answer.toLowerCase()) ||
        answer.toLowerCase().includes(opt.toLowerCase())
      );
      if (!match && currentQuestion.required) {
        const errorMsg: Message = {
          id: Date.now().toString(),
          role: 'finn',
          content: `Please choose one of: ${currentQuestion.options?.join(', ')}`,
          timestamp: new Date(),
          type: 'booking',
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }
      validatedAnswer = match || answer;
    }

    // Save answer
    const newAnswers = { ...bookingFlow.answers, [currentQuestion.id]: validatedAnswer };
    const nextIndex = bookingFlow.currentQuestionIndex + 1;

    // Build dynamic questions based on answers
    let allQuestions = [...bookingFlow.questions];

    // If type was just answered, add conditional questions
    if (currentQuestion.id === 'type' && validatedAnswer) {
      const conditional = (bookingFlow as any).conditionalQuestions?.[validatedAnswer] || [];
      allQuestions = [...allQuestions, ...conditional];
    }

    // Add final questions if we're near the end
    if (nextIndex >= allQuestions.length - 2 && (bookingFlow as any).finalQuestions) {
      allQuestions = [...allQuestions, ...(bookingFlow as any).finalQuestions];
    }

    const totalQuestions = allQuestions.length;
    const answeredCount = Object.keys(newAnswers).length;
    const progress = Math.round((answeredCount / totalQuestions) * 100);

    // Check if flow is complete
    const requiredQuestions = allQuestions.filter(q => q.required);
    const requiredAnswered = requiredQuestions.every(q => newAnswers[q.id]);
    const isComplete = nextIndex >= allQuestions.length || (requiredAnswered && nextIndex >= requiredQuestions.length);

    if (isComplete) {
      // Complete booking flow
      const completionMsg: Message = {
        id: Date.now().toString(),
        role: 'finn',
        content: `Perfect! I have all the information I need. Let me find the best options for you based on:\n\n${Object.entries(newAnswers).map(([key, value]) => `• ${key}: ${value}`).join('\n')}\n\n**Progress: 100%** ✅\n\nI'll search for available options and get back to you shortly!`,
        timestamp: new Date(),
        type: 'booking',
      };
      setMessages((prev) => [...prev, completionMsg]);

      setBookingFlow({
        active: false,
        questions: [],
        answers: {},
        currentQuestionIndex: 0,
        completed: true,
        progress: 100,
      });

      // Submit booking request
      try {
        const response = await fetch('/api/bookings/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            ...newAnswers,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create booking');
        }
        
        const result = await response.json();
        console.log('Booking created:', result);
      } catch (error) {
        console.error('Failed to create booking:', error);
        // Show error message to user
        const errorMsg: Message = {
          id: Date.now().toString(),
          role: 'finn',
          content: "I encountered an issue submitting your booking request. Please try again or contact our support team directly.",
          timestamp: new Date(),
          type: 'booking',
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } else {
      // Continue with next question
      const nextQuestion = allQuestions[nextIndex];
      const nextMsg: Message = {
        id: Date.now().toString(),
        role: 'finn',
        content: `**Progress: ${progress}%**\n\n${nextQuestion.question}${nextQuestion.options ? `\nOptions: ${nextQuestion.options.join(', ')}` : ''}`,
        timestamp: new Date(),
        type: 'booking',
      };
      setMessages((prev) => [...prev, nextMsg]);

      setBookingFlow({
        ...bookingFlow,
        questions: allQuestions,
        answers: newAnswers,
        currentQuestionIndex: nextIndex,
        progress,
      });
    }
  };

  const processMessage = async (message: string, userId?: string): Promise<{
    content: string;
    type?: 'booking' | 'weather' | 'activity' | 'general';
    bookingFlow?: any;
  }> => {
    const lowerMessage = message.toLowerCase();

    // Check for booking intent
    if (lowerMessage.includes('book') || lowerMessage.includes('charter') || lowerMessage.includes('vacation')) {
      return await startBookingFlow(userId);
    }

    // Check for weather intent
    if (lowerMessage.includes('weather') || lowerMessage.includes('rain') || lowerMessage.includes('forecast')) {
      return await getWeatherInfo();
    }

    // Check for activity intent
    if (lowerMessage.includes('activity') || lowerMessage.includes('do') || lowerMessage.includes('rainy day')) {
      return await getActivitySuggestions();
    }

    // General response with FINN AI
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
      content: "I'm here to help! I can assist with:\n• Booking charters and accommodations\n• Checking weather and rain day alternatives\n• Finding local activities\n• Planning your perfect vacation\n\nWhat would you like to do?",
      type: 'general',
    };
  };

  const startBookingFlow = async (userId?: string): Promise<{
    content: string;
    type: 'booking';
    bookingFlow: any;
  }> => {
    // Smart question flow - adapts based on user preferences if available
    const baseQuestions: BookingQuestion[] = [
      {
        id: 'type',
        question: 'What type of experience are you looking for?',
        type: 'select',
        options: ['Fishing Charter', 'Vacation Rental', 'Activity', 'Full Package'],
        required: true,
      },
      {
        id: 'date',
        question: 'When would you like to go? (Please provide a date)',
        type: 'date',
        required: true,
      },
      {
        id: 'guests',
        question: 'How many people will be joining?',
        type: 'number',
        required: true,
      },
      {
        id: 'budget',
        question: 'What is your budget range?',
        type: 'select',
        options: ['$200-500', '$500-1000', '$1000-2000', '$2000+'],
        required: true,
      },
    ];

    // Conditional questions based on type
    const conditionalQuestions: Record<string, BookingQuestion[]> = {
      'Fishing Charter': [
        {
          id: 'charter_type',
          question: 'What type of fishing? (Deep Sea, Inshore, Fly Fishing, etc.)',
          type: 'text',
          required: false,
        },
        {
          id: 'duration',
          question: 'How many hours? (Half Day, Full Day, Multi-Day)',
          type: 'select',
          options: ['4 hours', '6 hours', '8 hours', 'Full Day', 'Multi-Day'],
          required: true,
        },
      ],
      'Vacation Rental': [
        {
          id: 'duration',
          question: 'How many nights?',
          type: 'number',
          required: true,
        },
        {
          id: 'location_preference',
          question: 'Preferred location? (Beachfront, Downtown, Quiet Area)',
          type: 'text',
          required: false,
        },
      ],
      'Activity': [
        {
          id: 'activity_type',
          question: 'What type of activity? (Indoor, Outdoor, Water Sports, etc.)',
          type: 'text',
          required: false,
        },
      ],
      'Full Package': [
        {
          id: 'duration',
          question: 'How many nights?',
          type: 'number',
          required: true,
        },
        {
          id: 'charter_included',
          question: 'Would you like to include a fishing charter?',
          type: 'select',
          options: ['Yes', 'No', 'Maybe'],
          required: false,
        },
      ],
    };

    // Common final questions
    const finalQuestions: BookingQuestion[] = [
      {
        id: 'preferences',
        question: 'Any special preferences? (Beachfront, pet-friendly, indoor activities for rainy days, etc.)',
        type: 'text',
        required: false,
      },
      {
        id: 'special_occasion',
        question: 'Is this for a special occasion? (Anniversary, Birthday, etc.)',
        type: 'text',
        required: false,
      },
    ];

    // Questions will be dynamically built based on answers
    const questions = [...baseQuestions];

    return {
      content: "Great! I'll help you book the perfect vacation. Let me ask you a few quick questions to find the best options for you. I'll make sure to suggest backup activities in case of weather issues!\n\n**Progress: 0%**",
      type: 'booking',
      bookingFlow: {
        active: true,
        questions,
        conditionalQuestions,
        finalQuestions,
        answers: {},
        currentQuestionIndex: 0,
        completed: false,
        progress: 0,
      },
    };
  };

  const getWeatherInfo = async (): Promise<{
    content: string;
    type: 'weather';
  }> => {
    // Fetch weather from API (integrate with progno or weather service)
    try {
      const response = await fetch('/api/weather/current');
      const weather = await response.json();

      let content = `🌤️ **Current Weather Conditions:**\n\n`;
      content += `• Temperature: ${weather.temperature}°F\n`;
      content += `• Conditions: ${weather.conditions}\n`;
      content += `• Wind: ${weather.windSpeed} mph ${weather.windDirection}\n`;
      content += `• Water Temp: ${weather.waterTemperature}°F\n\n`;

      if (weather.rainChance > 50) {
        content += `⚠️ **Rain Alert:** There's a ${weather.rainChance}% chance of rain. I can suggest indoor activities and backup plans!\n\n`;
        content += `Would you like me to find rain day alternatives?`;
      } else {
        content += `✅ Perfect conditions for outdoor activities!`;
      }

      return { content, type: 'weather' };
    } catch (error) {
      return {
        content: "I can check the weather for you! Currently, I'm seeing good conditions for outdoor activities. Would you like me to check specific dates or find rain day alternatives?",
        type: 'weather',
      };
    }
  };

  const getActivitySuggestions = async (): Promise<{
    content: string;
    type: 'activity';
  }> => {
    try {
      // Get activities from local activities API
      const activitiesResponse = await fetch('/api/activities/local');
      const activities = activitiesResponse.ok ? await activitiesResponse.json() : [];

      // Also get available boats and rentals for context
      const boatsResponse = await fetch('/api/boats?available=true&limit=5');
      const boats = boatsResponse.ok ? await boatsResponse.json() : [];

      const rentalsResponse = await fetch('/api/rentals?available=true&limit=5').catch(() => null);
      const rentals = rentalsResponse?.ok ? await rentalsResponse.json() : [];

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
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all z-50 flex items-center gap-2"
        >
          <Sparkles className="w-6 h-6" />
          <span className="font-medium">Chat with Finn</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-xl shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header */}
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

          {/* Package CTA: Book charter + rental, save 15% */}
          {packageRec && (
            <div className="mx-4 mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-sm font-medium text-emerald-800">Save 15% — Book charter + rental together</p>
              {packageRec.discount_amount > 0 && (
                <p className="text-xs text-emerald-700 mt-0.5">Save ${packageRec.discount_amount.toFixed(0)} • Package from ${packageRec.final_price.toFixed(0)}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setInput("I'd like to see my vacation package and book charter + rental");
                }}
                className="mt-2 w-full text-sm font-medium text-emerald-800 bg-emerald-200 hover:bg-emerald-300 rounded-md py-1.5"
              >
                Get my package
              </button>
            </div>
          )}

          {/* Messages */}
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
                  {message.type === 'booking' && bookingFlow.active && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${bookingFlow.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Question {bookingFlow.currentQuestionIndex + 1} of {bookingFlow.questions.length}
                      </p>
                    </div>
                  )}
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

          {/* Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Finn anything..."
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
