'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users, 
  Plane, 
  Hotel, 
  Car, 
  Camera,
  Sparkles,
  Send,
  Plus,
  Trash2,
  Clock,
  Star
} from 'lucide-react';

interface TripDestination {
  id: string;
  name: string;
  days: number;
  estimatedCost: number;
  activities: string[];
  accommodation: string;
  transportation: string;
}

interface TripPlan {
  name: string;
  destinations: TripDestination[];
  totalDays: number;
  totalCost: number;
  travelers: number;
  startDate: string;
  endDate: string;
}

interface FinnResponse {
  message: string;
  suggestions?: string[];
  planUpdate?: Partial<TripPlan>;
}

export default function FinnTripPlanner() {
  const [tripPlan, setTripPlan] = useState<TripPlan>({
    name: '',
    destinations: [],
    totalDays: 0,
    totalCost: 0,
    travelers: 2,
    startDate: '',
    endDate: ''
  });

  const [userMessage, setUserMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'finn', message: string}>>([
    {
      role: 'finn',
      message: "🐠 Howdy! I'm Finn, your Gulf Coast regional expert! I know all five Gulf Coast states like the back of my hand - from Alabama's sugar-white beaches to Florida's emerald waters, Mississippi's hidden gems, Louisiana's Cajun coast, and Texas's vast shoreline. I can help you plan the perfect Gulf Coast vacation with all the local secrets! Which Gulf Coast state interests you?"
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [newDestination, setNewDestination] = useState({
    name: '',
    days: 1,
    estimatedCost: 500,
    activities: [],
    accommodation: '',
    transportation: ''
  });

  // Finn AI responses based on user input with Gulf Coast regional knowledge
  const generateFinnResponse = (message: string): FinnResponse => {
    const lowerMessage = message.toLowerCase();
    
    // Gulf Coast state detection
    const isFlorida = lowerMessage.includes('florida') || lowerMessage.includes('destin') || lowerMessage.includes('panama city') || lowerMessage.includes('clearwater') || lowerMessage.includes('tampa') || lowerMessage.includes('naples');
    const isMississippi = lowerMessage.includes('mississippi') || lowerMessage.includes('biloxi') || lowerMessage.includes('gulfport') || lowerMessage.includes('ocean springs');
    const isLouisiana = lowerMessage.includes('louisiana') || lowerMessage.includes('new orleans') || lowerMessage.includes('grand isle') || lowerMessage.includes('lafayette');
    const isTexas = lowerMessage.includes('texas') || lowerMessage.includes('galveston') || lowerMessage.includes('corpus christi') || lowerMessage.includes('south padre') || lowerMessage.includes('houston');
    const isAlabama = lowerMessage.includes('alabama') || lowerMessage.includes('orange beach') || lowerMessage.includes('gulf shores') || lowerMessage.includes('bon secour');
    
    // State-specific beach responses
    if (lowerMessage.includes('beach') || lowerMessage.includes('gulf')) {
      if (isFlorida) {
        return {
          message: "🏖️ Florida's Gulf Coast is paradise! Destin has the emerald waters, Panama City Beach offers family fun, and Clearwater has stunning sunsets. Local secret: Henderson Beach State Park in Destin is less crowded than the main beaches. Pro tip: Avoid spring break crowds in March by visiting the quieter areas like Seaside or Rosemary Beach. Which Florida spot interests you?",
          suggestions: ['Add Destin', 'Add Panama City Beach', 'Add Clearwater', 'Florida hidden gems']
        };
      } else if (isMississippi) {
        return {
          message: "🏖️ Mississippi's Gulf Coast is the Coast's hidden gem! Biloxi has casinos and history, Gulfport offers beautiful beaches, and Ocean Springs has the art scene. Local secret: Ship Island has some of the whitest sand you'll ever see - take the ferry from Gulfport. The Buccaneer State Park is perfect for families. Want to explore Mississippi's coast?",
          suggestions: ['Add Biloxi', 'Add Gulfport', 'Add Ocean Springs', 'Ship Island day trip']
        };
      } else if (isLouisiana) {
        return {
          message: "🏖️ Louisiana's Gulf Coast is unique! Grand Isle offers authentic Cajun beach culture, while New Orleans provides the Gulf access with city amenities. Local secret: Grand Isle State Park is where locals go for crabbing and fishing. For something different, try the marshlands near Lafitte for incredible wildlife. What's your Louisiana coastal preference?",
          suggestions: ['Add Grand Isle', 'Add New Orleans', 'Add Lafitte', 'Cajun coastal experience']
        };
      } else if (isTexas) {
        return {
          message: "🏖️ Texas Gulf Coast is massive and diverse! Galveston has history and charm, Corpus Christi offers pristine beaches, and South Padre Island is the party capital. Local secret: Mustang Island State Park near Port Aransas is less crowded than Padre but just as beautiful. Padre Island National Seashore has 60 miles of undeveloped beach. Which Texas coast calls to you?",
          suggestions: ['Add Galveston', 'Add Corpus Christi', 'Add South Padre', 'Mustang Island']
        };
      } else {
        return {
          message: "🏖️ Y'all picked the perfect spot! The Alabama Gulf Coast has 32 miles of sugar-white sand beaches. I recommend Orange Beach for families (calmer waters) or Gulf Shores for more action. Pro tip: Avoid Saturday check-in traffic on Highway 59 - arrive in Foley by 10 AM or take the Foley Beach Express. Or tell me which Gulf Coast state interests you - Florida, Mississippi, Louisiana, or Texas all have amazing offerings!",
          suggestions: ['Add Orange Beach', 'Add Gulf Shores', 'Explore Florida', 'Explore Texas Coast', 'Explore Mississippi', 'Explore Louisiana']
        };
      }
    }
    
    // State-specific dining responses
    if (lowerMessage.includes('dinner') || lowerMessage.includes('seafood') || lowerMessage.includes('eat')) {
      if (isFlorida) {
        return {
          message: "🦞 Florida Gulf seafood is incredible! In Destin, try Dewey Destin's for harbor views, or The Back Porch for beachfront dining. Panama City has Saltwater Grill for upscale seafood. Local secret: The locals eat at Hunt's Oyster Bar in Destin - no frills, amazing seafood. For fresh catch, many restaurants will cook what you caught that day!",
          suggestions: ['Destin harbor restaurants', 'Panama City seafood', 'Florida fish markets', 'Cook-Your-Catch spots']
        };
      } else if (isMississippi) {
        return {
          message: "🦞 Mississippi's Gulf Coast has the best seafood! The Scarlet Pearl in D'Iberville has great casino dining, while Half Shell Oyster House in Biloxi is a local favorite. Local secret: Mary Mahoney's in Biloxi has been serving since 1964 - ask for the turtle soup! For fresh-off-the-boat, try the Biloxi Fishing Fleet restaurants.",
          suggestions: ['Biloxi casino dining', 'Gulfport seafood', 'Ocean Springs cuisine', 'Local fish houses']
        };
      } else if (isLouisiana) {
        return {
          message: "🦞 Louisiana Gulf Coast means incredible Cajun seafood! In Grand Isle, try Starfish Restaurant for waterfront dining. New Orleans has the world-famous seafood, but drive down to Lafitte for authentic Cajun seafood joints. Local secret: Jean Lafitte National Historical Park area has hidden gems serving fresh catch daily. Don't miss the boiled crawfish in season!",
          suggestions: ['Grand Isle seafood', 'New Orleans Gulf seafood', 'Cajun seafood joints', 'Fresh crawfish spots']
        };
      } else if (isTexas) {
        return {
          message: "🦞 Texas Gulf seafood is underrated! In Galveston, try Gaido's for historic seafood or The Spot for casual beach dining. Corpus Christi has Water Street Oyster Bar. Local secret: The locals go to Port Aransas for fresh-off-the-boat seafood at small family-run places. In Rockport, try Big Shell for the best Gulf views with dinner.",
          suggestions: ['Galveston seafood', 'Corpus Christi dining', 'Port Aransas spots', 'Texas fish markets']
        };
      } else {
        return {
          message: "🦞 For the best seafood experience, I recommend the 'Cook-Your-Catch' spots! If you book with Gulf Coast Charters, you can take your fresh-caught fillets to Tacky Jacks or Flora-Bama Yacht Club - they'll cook them up fresh for you! For local favorites away from tourists, try the hole-in-the-wall oyster bar in Bon Secour. Or tell me which Gulf Coast state you're interested in!",
          suggestions: ['Cook-Your-Catch restaurants', 'Local seafood spots', 'Florida Gulf seafood', 'Texas Gulf dining', 'Mississippi seafood', 'Louisiana Cajun cuisine']
        };
      }
    }
    
    // State-specific fishing responses
    if (lowerMessage.includes('fishing')) {
      if (isFlorida) {
        return {
          message: "🎣 Florida Gulf fishing is world-class! Destin is the 'World's Luckiest Fishing Village' for deep-sea charters. Panama City has great reef fishing. Local secret: The Choctawhatchee Bay around Destin offers incredible inshore fishing for redfish and speckled trout. In the Panhandle, St. George Island has fantastic flats fishing. What type of Florida fishing adventure interests you?",
          suggestions: ['Destin deep-sea', 'Panama City reef fishing', 'Florida inshore fishing', 'St. George Island flats']
        };
      } else if (isMississippi) {
        return {
          message: "🎣 Mississippi Gulf fishing is fantastic! Biloxi has great charter operations for snapper and grouper. Local secret: The barrier islands (Horn, Ship, Cat) offer incredible fishing - take a ferry from Gulfport. The Back Bay of Biloxi is perfect for redfish and flounder. Mississippi Sound offers great speckled trout fishing. Ready to fish Mississippi waters?",
          suggestions: ['Biloxi charters', 'Barrier island fishing', 'Back Bay fishing', 'Mississippi Sound trips']
        };
      } else if (isLouisiana) {
        return {
          message: "🎣 Louisiana Gulf fishing is legendary! Grand Isle offers fantastic tarpon and redfish fishing. The marshes south of New Orleans are incredible for speckled trout. Local secret: The Lafitte area has some of the best redfish fishing in the Gulf. Venice is the 'Tuna Town' for yellowfin tuna. Louisiana's waters produce more fish than any other Gulf state! What's your Louisiana fishing target?",
          suggestions: ['Grand Isle tarpon', 'Venice tuna fishing', 'Lafitte redfish', 'New Orleans marsh fishing']
        };
      } else if (isTexas) {
        return {
          message: "🎣 Texas Gulf fishing is incredible! Galveston has great bay fishing for speckled trout and redfish. Port Aransas offers fantastic offshore fishing. Local secret: The Laguna Madre near South Padre has incredible sight-casting for redfish. Rockport has some of the best bay fishing in Texas. For trophy fish, try Port Mansfield for big trout. What Texas fishing adventure calls to you?",
          suggestions: ['Galveston bay fishing', 'Port Aransas offshore', 'Laguna Madre sight-casting', 'Rockport bay trips']
        };
      } else {
        return {
          message: "🎣 You're talking my language! Since you're in Alabama waters, Red Snapper season is usually June/July in state waters. For families with kids, I recommend inshore fishing for calmer waters and more action. For trophy fish, go offshore. Gulf Coast Charters handles all licenses and gear, so you don't worry about legal compliance. Or tell me which Gulf Coast state you want to fish in!",
          suggestions: ['Alabama inshore family fishing', 'Alabama offshore trophy fishing', 'Florida Gulf fishing', 'Texas Gulf charters', 'Mississippi Gulf fishing', 'Louisiana Gulf adventures']
        };
      }
    }
    
    // State-specific weather/rain responses
    if (lowerMessage.includes('rain') || lowerMessage.includes('weather') || lowerMessage.includes('storm')) {
      if (isFlorida) {
        return {
          message: "🌧️ Florida weather can be unpredictable! Afternoon thunderstorms are common in summer but usually pass quickly. In the Panhandle, storms move through fast - perfect time to visit Pier Park in Panama City. Local secret: The best time for beach activities is early morning - storms typically build in the afternoon. Hurricane season runs June-November, but most days are beautiful!",
          suggestions: ['Florida weather patterns', 'Indoor Florida activities', 'Best beach times', 'Hurricane season info']
        };
      } else if (isMississippi) {
        return {
          message: "🌧️ Mississippi Gulf weather is milder than Florida! Summer storms are common but brief. Local secret: The casinos in Biloxi make perfect rainy day destinations - gaming, shows, and great dining. The Ohr-O'Keefe Museum in Biloxia is great for rainy days. Gulf storms usually pass in 30 minutes - perfect for a long lunch!",
          suggestions: ['Mississippi weather', 'Biloxi casino activities', 'Rainy day museums', 'Storm patterns']
        };
      } else if (isLouisiana) {
        return {
          message: "🌧️ Louisiana Gulf weather is humid but beautiful! Summer afternoon storms are common but short. Local secret: New Orleans has endless indoor activities for rainy days - museums, aquarium, shopping. The Louisiana Swamp Tour can actually be better in light rain - more wildlife comes out! Grand Isle storms pass quickly to the Gulf.",
          suggestions: ['Louisiana weather', 'New Orleans rainy day activities', 'Swamp tour in rain', 'Storm patterns']
        };
      } else if (isTexas) {
        return {
          message: "🌧️ Texas Gulf weather varies by location! Houston area gets more rain, while South Padre is drier. Local secret: The Texas State Aquarium in Corpus Christi is perfect for rainy days. In Galveston, Moody Gardens has indoor pyramids and aquarium. Summer storms are intense but brief - perfect time for Tex-Mex and margaritas!",
          suggestions: ['Texas Gulf weather', 'Corpus Christi indoor activities', 'Galveston rainy day fun', 'Storm patterns by region']
        };
      } else {
        return {
          message: "🌧️ Don't let a little Gulf rain ruin your day! I have the perfect rainy day itinerary! Start with Tropic Falls at OWA (massive indoor waterpark under glass roof), then hit The Wharf for movies and laser tag, or watch glass blowing at the Coastal Arts Center. For a full day trip, the National Naval Aviation Museum in Pensacola is FREE and world-class! Gulf storms usually pass in 20-30 minutes, so you'll be back on the beach by afternoon. Want my complete 5-spot rainy day plan?",
          suggestions: ['Tropic Falls waterpark', 'The Wharf indoor fun', 'Coastal Arts Center', 'Naval Aviation Museum', 'Complete rainy day itinerary']
        };
      }
    }
    
    // State-specific secret/local responses
    if (lowerMessage.includes('secret') || lowerMessage.includes('hidden') || lowerMessage.includes('local')) {
      if (isFlorida) {
        return {
          message: "🤫 Florida Gulf secrets! Grayton Beach is the hidden gem - less crowded than Seagrove. St. George Island has pristine beaches and no high-rises. Local secret: Apalachicola has incredible oysters and small-town charm. The Forgotten Coast (Mexico Beach, Port St. Joe) is like Florida 50 years ago. Want more Florida secrets?",
          suggestions: ['Grayton Beach', 'St. George Island', 'Apalachicola oysters', 'Forgotten Coast towns']
        };
      } else if (isMississippi) {
        return {
          message: "🤫 Mississippi Gulf secrets! The Pascagoula River has incredible wildlife and few tourists. Ocean Springs has the art scene and Walter Anderson Museum. Local secret: Pass Christian has beautiful historic homes and quiet beaches. The DeSoto National Forest near the coast offers hiking few visitors know about. Want more Mississippi secrets?",
          suggestions: ['Pascagoula River', 'Ocean Springs art', 'Pass Christian history', 'DeSoto Forest hiking']
        };
      } else if (isLouisiana) {
        return {
          message: "🤫 Louisiana Gulf secrets! The Jean Lafitte National Historical Park has incredible swamp tours few tourists find. Grand Isle has amazing bird watching in spring. Local secret: The towns along Bayou Lafourche (Thibodaux, Raceland) offer authentic Cajun culture without the crowds. The Atchafalaya Basin has the largest swamp in America - incredible for wildlife!",
          suggestions: ['Jean Lafitte swamps', 'Grand Isle birds', 'Bayou Lafourche towns', 'Atchafalaya Basin']
        };
      } else if (isTexas) {
        return {
          message: "🤫 Texas Gulf secrets! Port Aransas is less crowded than Padre but just as beautiful. Rockport has incredible art galleries and fishing. Local secret: Matagorda Bay has pristine beaches and few crowds. The Texas Coastal Bend (Port Lavaca, Palacios) offers authentic coastal Texas culture. Want more Texas secrets?",
          suggestions: ['Port Aransas', 'Rockport art scene', 'Matagorda Bay', 'Coastal Bend towns']
        };
      } else {
        return {
          message: "🤫 Alright, here's a local secret - the Bon Secour National Wildlife Refuge is the 'Anti-Strip'! No high-rises, just pristine dunes and peace. It's where locals go when they want to escape the crowds. For another hidden gem, try the Hugh S. Branyon Backcountry Trail - 15 miles of paved trails through six different ecosystems. Or tell me which Gulf Coast state you want secrets for!",
          suggestions: ['More Alabama secrets', 'Florida hidden gems', 'Texas Gulf secrets', 'Mississippi hidden spots', 'Louisiana Bayou secrets']
        };
      }
    }
    
    // State-specific family responses
    if (lowerMessage.includes('family') || lowerMessage.includes('kids')) {
      if (isFlorida) {
        return {
          message: "👨‍👩‍👧‍👦 Florida Gulf is perfect for families! Panama City Beach has Shipwreck Island Waterpark, Destin has Big Kahuna's, and Clearwater has the Marine Aquarium. Local secret: Henderson Beach State Park has calm waters perfect for little ones. The Gulf World Marine Park in Panama City is great for kids. How many kids and what ages?",
          suggestions: ['Panama City family fun', 'Destin kids activities', 'Clearwater marine life', 'Florida state parks']
        };
      } else if (isMississippi) {
        return {
          message: "👨‍👩‍👧‍👦 Mississippi Gulf offers great family fun! Biloxi has the Institute for Marine Mammal Studies, Gulf Shores has water parks, and Ocean Springs has great parks. Local secret: The Lynn Meadows Discovery Center in Gulfport is amazing for kids. Ship Island has calm waters perfect for family swimming. What ages are your kids?",
          suggestions: ['Biloxi marine life', 'Gulfport discovery center', 'Ship Island family day', 'Ocean Springs parks']
        };
      } else if (isLouisiana) {
        return {
          message: "👨‍👩‍👧‍👦 Louisiana Gulf Coast families love Grand Isle! The state park has calm beaches and great fishing. New Orleans has the Audubon Aquarium and Insectarium. Local secret: The Global Wildlife Center in Folsom (near the coast) has safari-style tours kids love. The Louisiana Children's Museum in New Orleans is fantastic. What family activities interest you?",
          suggestions: ['Grand Isle family beach', 'New Orleans kids museums', 'Global Wildlife Center', 'Louisiana state parks']
        };
      } else if (isTexas) {
        return {
          message: "👨‍👩‍👧‍👦 Texas Gulf Coast is family paradise! Galveston has Moody Gardens and Schlitterbahn, Corpus Christi has the Texas State Aquarium, and South Padre has dolphin tours. Local secret: Padre Island National Seashore has ranger programs perfect for kids. The Texas State Aquarium in Corpus has touch tanks and dolphin shows. What ages are your children?",
          suggestions: ['Galveston Moody Gardens', 'Corpus Christi aquarium', 'Padre Island ranger programs', 'Texas Gulf family beaches']
        };
      } else {
        return {
          message: "👨‍👩‍👧‍👦 Perfect choice for a family trip! I recommend the Gulf State Park Pier for easy fishing, and the park has amazing trails and pavilions. The Wharf has great family dining and even a ferris wheel! For the little ones, inshore fishing is best - calmer waters and they'll catch something every 10-15 minutes. How many kids and what ages? Or tell me which Gulf Coast state!",
          suggestions: ['Alabama family beaches', 'Florida Gulf family fun', 'Texas Gulf kids activities', 'Mississippi Gulf family', 'Louisiana Gulf family']
        };
      }
    }
    
    // Add destination to plan
    if (lowerMessage.includes('add') || lowerMessage.includes('plan') || lowerMessage.includes('include')) {
      const destinationMatch = message.match(/(?:add|plan|include)\s+(.+?)(?:\s+to|\s+for|\s+in|$)/i);
      if (destinationMatch) {
        const destination = destinationMatch[1].trim();
        return {
          message: `✨ Great choice! I'll add ${destination} to your trip plan. How many days would you like to spend there? I can also suggest the best local spots once you tell me what you're interested in! Whether you're exploring Alabama's beaches, Florida's emerald coast, Texas's vast shoreline, Mississippi's hidden gems, or Louisiana's Cajun coast, I've got all the local secrets!`,
          planUpdate: {
            destinations: [...tripPlan.destinations, {
              id: Date.now().toString(),
              name: destination,
              days: 3,
              estimatedCost: 800,
              activities: [],
              accommodation: '',
              transportation: ''
            }]
          }
        };
      }
    }
    
    // Default response with Gulf Coast regional expertise
    return {
      message: "🌟 Howdy! I'm Finn, your Gulf Coast regional expert! I know all five Gulf Coast states like the back of my hand - from Alabama's sugar-white beaches to Florida's emerald waters, Mississippi's hidden gems, Louisiana's Cajun coast, and Texas's vast shoreline. Tell me which Gulf Coast state interests you, or let me know what kind of adventure you're dreaming of - beach relaxation, fishing, family fun, or local secrets!",
      suggestions: ['Alabama Gulf Coast', 'Florida Gulf Coast', 'Texas Gulf Coast', 'Mississippi Gulf Coast', 'Louisiana Gulf Coast', 'Beach vacation', 'Fishing charter', 'Family fun', 'Local secrets']
    };
  };

  const sendMessage = () => {
    if (!userMessage.trim()) return;
    
    const userMsg = { role: 'user' as const, message: userMessage };
    setChatHistory(prev => [...prev, userMsg]);
    
    setIsTyping(true);
    
    // Simulate Finn thinking
    setTimeout(() => {
      const finnResponse = generateFinnResponse(userMessage);
      const finnMsg = { role: 'finn' as const, message: finnResponse.message };
      setChatHistory(prev => [...prev, finnMsg]);
      
      if (finnResponse.planUpdate) {
        const planUpdate = finnResponse.planUpdate;
        setTripPlan(prev => ({
          ...prev,
          ...planUpdate,
          totalDays: (planUpdate.destinations || prev.destinations).reduce((sum, d) => sum + d.days, 0),
          totalCost: (planUpdate.destinations || prev.destinations).reduce((sum, d) => sum + d.estimatedCost, 0)
        }));
      }
      
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
    
    setUserMessage('');
  };

  const addDestination = () => {
    if (newDestination.name) {
      setTripPlan(prev => ({
        ...prev,
        destinations: [...prev.destinations, { ...newDestination, id: Date.now().toString() }],
        totalDays: prev.totalDays + newDestination.days,
        totalCost: prev.totalCost + newDestination.estimatedCost
      }));
      setNewDestination({
        name: '',
        days: 1,
        estimatedCost: 500,
        activities: [],
        accommodation: '',
        transportation: ''
      });
    }
  };

  const removeDestination = (id: string) => {
    setTripPlan(prev => {
      const updatedDestinations = prev.destinations.filter(d => d.id !== id);
      return {
        ...prev,
        destinations: updatedDestinations,
        totalDays: updatedDestinations.reduce((sum, d) => sum + d.days, 0),
        totalCost: updatedDestinations.reduce((sum, d) => sum + d.estimatedCost, 0)
      };
    });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setUserMessage(suggestion);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Finn AI Trip Planner</h1>
        </div>
        <p className="text-gray-600">Your intelligent travel companion for perfect vacation planning</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-cyan-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h2 className="font-semibold text-gray-900">Chat with Finn</h2>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Suggestions */}
            <div className="p-4 border-t">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-sm text-gray-600">Try asking:</span>
                {['Alabama Gulf Coast', 'Florida Gulf Coast', 'Texas Gulf Coast', 'Mississippi Gulf Coast', 'Louisiana Gulf Coast'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Ask Finn about any Gulf Coast state - Florida, Alabama, Mississippi, Louisiana, or Texas..."
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={isTyping}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Trip Plan Panel */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Your Trip Plan
            </h3>
            
            <div className="space-y-4">
              <Input
                placeholder="Trip Name"
                value={tripPlan.name}
                onChange={(e) => setTripPlan(prev => ({ ...prev, name: e.target.value }))}
              />
              
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={tripPlan.startDate}
                  onChange={(e) => setTripPlan(prev => ({ ...prev, startDate: e.target.value }))}
                />
                <Input
                  type="date"
                  placeholder="End Date"
                  value={tripPlan.endDate}
                  onChange={(e) => setTripPlan(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              
              <Input
                type="number"
                placeholder="Number of Travelers"
                value={tripPlan.travelers}
                onChange={(e) => setTripPlan(prev => ({ ...prev, travelers: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Destinations
            </h3>
            
            <div className="space-y-3 mb-4">
              {tripPlan.destinations.map((dest) => (
                <div key={dest.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{dest.name}</h4>
                      <p className="text-sm text-gray-600">{dest.days} days • ${dest.estimatedCost}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDestination(dest.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-2">
              <Input
                placeholder="Add destination"
                value={newDestination.name}
                onChange={(e) => setNewDestination(prev => ({ ...prev, name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Days"
                  value={newDestination.days}
                  onChange={(e) => setNewDestination(prev => ({ ...prev, days: parseInt(e.target.value) || 1 }))}
                />
                <Input
                  type="number"
                  placeholder="Est. Cost"
                  value={newDestination.estimatedCost}
                  onChange={(e) => setNewDestination(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <Button onClick={addDestination} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Destination
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50">
            <h3 className="font-semibold text-gray-900 mb-4">Trip Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Duration:</span>
                <span className="font-medium">{tripPlan.totalDays} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Cost:</span>
                <span className="font-medium">${tripPlan.totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Per Person:</span>
                <span className="font-medium">
                  ${tripPlan.travelers > 0 ? Math.round(tripPlan.totalCost / tripPlan.travelers) : 0}
                </span>
              </div>
            </div>
            
            <Button className="w-full mt-4" disabled={tripPlan.destinations.length === 0}>
              <Star className="w-4 h-4 mr-2" />
              Complete Trip Plan
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
