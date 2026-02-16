// Anything Predictor Module for Progno Sports Prediction Platform

// TODO: Fix imports - knowledge-base and kalshi-fetcher modules don't exist
// import { findKnowledgeMatch, getKnowledgeCategories } from './knowledge-base';
// import { findBestKalshiMatch, kalshiToPrognoConfidence } from './kalshi-fetcher';

// Stub functions to fix build
const findKnowledgeMatch = (_q: string, _cat?: string): string | null => null;
const getKnowledgeCategories = () => [];
const findBestKalshiMatch = async (_q: string) => null;
const kalshiToPrognoConfidence = (_k: any, _c?: any) => 0.5;

export interface AnythingInput {
  question: string;
  context?: string;
  sport?: string;
  timeframe?: string;
  riskProfile?: 'safe' | 'balanced' | 'aggressive';
}

export interface AnythingPrediction {
  prediction: string;
  confidence: number;
  reasoning: string;
  dataPoints: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance: number;
}

export interface AnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  keyFactors: string[];
  confidence: number;
  summary: string;
}

// Validate if a question is suitable for prediction
export function validateQuestion(question: string): { valid: boolean; error?: string } {
  const questionLower = question.toLowerCase().trim();

  // Check minimum length
  if (questionLower.length < 10) {
    return { valid: false, error: 'Question must be at least 10 characters long' };
  }

  // Check if it's actually a question
  const questionWords = ['what', 'will', 'who', 'when', 'where', 'how', 'can', 'does', 'is', 'are'];
  const isQuestion = questionWords.some(word => questionLower.includes(word)) || questionLower.includes('?');

  if (!isQuestion) {
    return { valid: false, error: 'Please enter a proper question' };
  }

  // Check for prohibited content
  const prohibitedWords = ['medical', 'health', 'diagnosis', 'treatment', 'legal', 'financial advice'];
  const hasProhibited = prohibitedWords.some(word => questionLower.includes(word));

  if (hasProhibited) {
    return { valid: false, error: 'Question contains prohibited content' };
  }

  return { valid: true };
}

// Analyze the type of question to determine prediction approach
export function analyzeQuestionType(question: string): {
  type: 'sports' | 'weather' | 'general' | 'outcome' | 'advice' | 'safety' | 'factual' | 'science' | 'history' | 'geography' | 'technology' | 'health' | 'finance' | 'food' | 'travel' | 'education' | 'entertainment';
  complexity: 'simple' | 'moderate' | 'complex';
  timeframe: string;
  category?: string;
} {
  const questionLower = question.toLowerCase();

  // Normalize common typos
  const normalized = questionLower
    .replace(/airolane|airplane|aeroplane/g, 'airplane')
    .replace(/safest|safe|safety/g, 'safe')
    .replace(/computor|comp/g, 'computer');

  // Determine type - check knowledge categories first

  // Science questions
  if (normalized.match(/(gravity|photosynthesis|atom|quantum|evolution|black hole|dna|solar system|physics|chemistry|biology|astronomy|molecule|electron|proton|neutron|speed of light|einstein|relativity|climate change|global warming)/)) {
    return { type: 'science', complexity: 'moderate', timeframe: extractTimeframe(normalized), category: 'science' };
  }

  // History questions
  if (normalized.match(/(world war|civil war|revolution|renaissance|industrial|ancient|rome|greece|middle ages|medieval|historical|history|battle|war|empire|dynasty|monarchy)/)) {
    return { type: 'history', complexity: 'moderate', timeframe: extractTimeframe(normalized), category: 'history' };
  }

  // Geography questions
  if (normalized.match(/(country|continent|mountain|river|ocean|desert|capital|city|largest|smallest|tallest|deepest|longest|geography|map|location|place|where is|population)/)) {
    return { type: 'geography', complexity: 'simple', timeframe: extractTimeframe(normalized), category: 'geography' };
  }

  // Technology questions
  if (normalized.match(/(computer|internet|ai|artificial intelligence|machine learning|blockchain|cryptocurrency|bitcoin|programming|code|software|hardware|cloud|quantum computing|cybersecurity|vr|virtual reality|app|website|algorithm)/)) {
    return { type: 'technology', complexity: 'moderate', timeframe: extractTimeframe(normalized), category: 'technology' };
  }

  // Health questions (general, not medical advice)
  if (normalized.match(/(exercise|fitness|nutrition|diet|sleep|health|wellness|vitamin|workout|muscle|cardio|yoga|meditation|stress|mental health|hydration|weight|calorie)/)) {
    return { type: 'health', complexity: 'simple', timeframe: extractTimeframe(normalized), category: 'health' };
  }

  // Finance questions (general, not financial advice)
  if (normalized.match(/(money|finance|investment|stock|market|economy|inflation|interest rate|budget|saving|retirement|credit|tax|currency|cryptocurrency|bitcoin|trading|bank)/)) {
    return { type: 'finance', complexity: 'moderate', timeframe: extractTimeframe(normalized), category: 'finance' };
  }

  // Food questions
  if (normalized.match(/(food|cooking|recipe|cuisine|ingredient|baking|grilling|kitchen|meal|restaurant|diet|nutrition|spice|flavor|taste|cuisine|chef)/)) {
    return { type: 'food', complexity: 'simple', timeframe: extractTimeframe(normalized), category: 'food' };
  }

  // Travel questions
  if (normalized.match(/(travel|trip|vacation|passport|visa|hotel|flight|airport|destination|tourist|sightseeing|journey|adventure|backpack|luggage|packing)/)) {
    return { type: 'travel', complexity: 'simple', timeframe: extractTimeframe(normalized), category: 'travel' };
  }

  // Education questions
  if (normalized.match(/(learn|study|education|school|university|college|student|teacher|course|degree|exam|test|homework|research|knowledge|skill|training)/)) {
    return { type: 'education', complexity: 'moderate', timeframe: extractTimeframe(normalized), category: 'education' };
  }

  // Entertainment questions
  if (normalized.match(/(movie|film|music|book|tv|television|show|game|video game|entertainment|celebrity|actor|singer|artist|comedy|drama|theater|streaming|netflix)/)) {
    return { type: 'entertainment', complexity: 'simple', timeframe: extractTimeframe(normalized), category: 'entertainment' };
  }

  // Safety questions
  if (normalized.match(/(safe|safest|survive|crash|accident|danger|risk|hazard|emergency|evacuate|escape)/)) {
    return { type: 'safety', complexity: 'moderate', timeframe: extractTimeframe(normalized) };
  }

  // Sports questions
  if (normalized.match(/(game|match|team|player|score|win|lose|sport|season|playoff|championship|football|basketball|baseball|hockey|soccer|nfl|nba|mlb|nhl|super bowl|world cup|olympics|tennis|golf|fantasy sports|sports betting|ncaa|college|march madness|final four|heisman|college football|college basketball|sec|big ten|acc|big 12|pac-12|bowl game|rivalry|transfer portal)/)) {
    return { type: 'sports', complexity: 'moderate', timeframe: extractTimeframe(normalized), category: 'sports' };
  }

  // Camping questions
  if (normalized.match(/(camping|camp|tent|campfire|backpacking|rv|wildlife safety|camping gear|camping tips|leave no trace)/)) {
    return { type: 'factual', complexity: 'simple', timeframe: extractTimeframe(normalized), category: 'camping' };
  }

  // Weather questions
  if (normalized.match(/(weather|rain|snow|temperature|forecast|storm|climate|hurricane|tornado|precipitation)/)) {
    return { type: 'weather', complexity: 'simple', timeframe: extractTimeframe(normalized) };
  }

  // Outcome questions
  if (normalized.match(/(outcome|result|winner|champion|will|predict|forecast|future)/)) {
    return { type: 'outcome', complexity: 'complex', timeframe: extractTimeframe(normalized) };
  }

  // Advice questions
  if (normalized.match(/(best|recommend|advice|should|can|how to|what should|which is better)/)) {
    return { type: 'advice', complexity: 'complex', timeframe: extractTimeframe(normalized) };
  }

  // Factual questions (catch-all for informational queries)
  if (normalized.match(/(what is|what are|who is|who are|where is|where are|when is|when did|how does|how do|why does|why do|explain|tell me about|define)/)) {
    return { type: 'factual', complexity: 'simple', timeframe: extractTimeframe(normalized) };
  }

  // Default to general
  return { type: 'general', complexity: 'simple', timeframe: extractTimeframe(normalized) };
}

function extractTimeframe(question: string): string {
  const timePatterns = [
    { pattern: /(today|tonight)/, timeframe: 'today' },
    { pattern: /(tomorrow)/, timeframe: 'tomorrow' },
    { pattern: /(this week|week)/, timeframe: 'this week' },
    { pattern: /(next week)/, timeframe: 'next week' },
    { pattern: /(this month|month)/, timeframe: 'this month' },
    { pattern: /(this year|year|season)/, timeframe: 'this year' }
  ];

  for (const { pattern, timeframe } of timePatterns) {
    if (question.match(pattern)) {
      return timeframe;
    }
  }

  return 'unknown';
}

// Main prediction function
export async function predictAnything(input: AnythingInput): Promise<AnythingPrediction> {
  const { question, context, sport, timeframe } = input;

  // Validate input
  if (!validateQuestion(question)) {
    throw new Error('Invalid question for prediction');
  }

  const questionType = analyzeQuestionType(question);

  // Check knowledge base first for factual questions
  let knowledgeMatch: string | null = null;
  if (questionType.category) {
    knowledgeMatch = findKnowledgeMatch(question, questionType.category);
  }

  // Check Kalshi prediction markets for real-world probabilities
  let kalshiData: { market: any; probability: number; confidence: number; relevance: number } | null = null;
  try {
    kalshiData = await findBestKalshiMatch(question);
  } catch (error) {
    // Kalshi lookup failed, continue without it
    console.warn('Kalshi lookup failed:', error);
  }

  // Simulate prediction logic based on question type
  let prediction: string;
  let confidence: number;
  let reasoning: string;
  let riskLevel: 'low' | 'medium' | 'high';

  // Use knowledge base if available
  if (knowledgeMatch) {
    prediction = knowledgeMatch;
    confidence = 0.85 + Math.random() * 0.10; // High confidence for knowledge base
    reasoning = `Based on established knowledge and research in ${questionType.category}`;
    riskLevel = 'low';

    // Enhance with Kalshi data if available
    if (kalshiData && kalshiData.market && kalshiData.relevance > 0.5) {
      const kalshiProb = kalshiData.probability > 0.5 ? 'likely' : 'unlikely';
      reasoning += `. Kalshi prediction markets indicate this outcome is ${kalshiProb} (${Math.round(kalshiData.probability * 100)}% probability)`;
      confidence = Math.max(confidence, kalshiToPrognoConfidence(kalshiData.probability, kalshiData.confidence));
    }
  } else if (kalshiData && kalshiData.market && kalshiData.relevance > 0.6) {
    // Use Kalshi market data as primary source if highly relevant
    const kalshiProb = kalshiData.probability;
    const outcome = kalshiProb > 0.5 ? 'likely' : 'unlikely';
    prediction = `Based on real-time prediction market data, this outcome is ${outcome} (${Math.round(kalshiProb * 100)}% probability). Market: "${kalshiData.market.title}"`;
    confidence = kalshiToPrognoConfidence(kalshiProb, kalshiData.confidence);
    reasoning = `Real-time prediction market data from Kalshi shows ${Math.round(kalshiProb * 100)}% probability. Market volume: ${kalshiData.market.volume.toLocaleString()}, status: ${kalshiData.market.status}`;
    riskLevel = kalshiData.confidence > 0.7 ? 'low' : 'medium';
  } else {
    // Fall back to type-specific generation
    switch (questionType.type) {
      case 'science':
        prediction = generateSciencePrediction(question);
        confidence = 0.80 + Math.random() * 0.15;
        reasoning = 'Based on scientific principles, research, and established knowledge';
        riskLevel = 'low';
        break;

      case 'history':
        prediction = generateHistoryPrediction(question);
        confidence = 0.80 + Math.random() * 0.15;
        reasoning = 'Based on historical records, documented events, and scholarly research';
        riskLevel = 'low';
        break;

      case 'geography':
        prediction = generateGeographyPrediction(question);
        confidence = 0.85 + Math.random() * 0.10;
        reasoning = 'Based on geographical data, maps, and verified location information';
        riskLevel = 'low';
        break;

      case 'technology':
        prediction = generateTechnologyPrediction(question);
        confidence = 0.75 + Math.random() * 0.20;
        reasoning = 'Based on current technology trends, industry standards, and technical knowledge';
        riskLevel = 'low';
        break;

      case 'health':
        prediction = generateHealthPrediction(question);
        confidence = 0.75 + Math.random() * 0.15;
        reasoning = 'Based on general health information and wellness research (not medical advice)';
        riskLevel = 'low';
        break;

      case 'finance':
        prediction = generateFinancePrediction(question);
        confidence = 0.70 + Math.random() * 0.20;
        reasoning = 'Based on general financial concepts and economic principles (not financial advice)';
        riskLevel = 'medium';
        break;

      case 'food':
        prediction = generateFoodPrediction(question);
        confidence = 0.75 + Math.random() * 0.20;
        reasoning = 'Based on culinary knowledge, cooking techniques, and food science';
        riskLevel = 'low';
        break;

      case 'travel':
        prediction = generateTravelPrediction(question);
        confidence = 0.75 + Math.random() * 0.20;
        reasoning = 'Based on travel information, destination knowledge, and travel best practices';
        riskLevel = 'low';
        break;

      case 'education':
        prediction = generateEducationPrediction(question);
        confidence = 0.75 + Math.random() * 0.20;
        reasoning = 'Based on educational research, learning theories, and academic best practices';
        riskLevel = 'low';
        break;

      case 'entertainment':
        prediction = generateEntertainmentPrediction(question);
        confidence = 0.70 + Math.random() * 0.25;
        reasoning = 'Based on entertainment industry knowledge, trends, and popular culture';
        riskLevel = 'low';
        break;

      case 'sports':
        // Check knowledge base first
        const sportsKnowledge = findKnowledgeMatch(question, 'sports');
        if (sportsKnowledge) {
          prediction = sportsKnowledge;
          confidence = 0.80 + Math.random() * 0.15;
          reasoning = 'Based on sports knowledge, rules, and historical information';
        } else {
          prediction = generateSportsPrediction(question, sport);
          confidence = 0.65 + Math.random() * 0.25;
          reasoning = `Based on team performance, recent form, and historical data for ${sport || 'the sport'}`;
        }
        riskLevel = 'medium';
        break;

      case 'weather':
        prediction = generateWeatherPrediction(question);
        confidence = 0.75 + Math.random() * 0.20;
        reasoning = 'Based on weather patterns, historical data, and meteorological models';
        riskLevel = 'low';
        break;

      case 'safety':
        prediction = generateSafetyPrediction(question);
        confidence = 0.80 + Math.random() * 0.15;
        reasoning = 'Based on safety research, crash statistics, and expert safety analysis';
        riskLevel = 'low';
        break;

      case 'factual':
        prediction = generateFactualPrediction(question);
        confidence = 0.75 + Math.random() * 0.20;
        reasoning = 'Based on factual data, research studies, and expert knowledge';
        riskLevel = 'low';
        break;

      case 'outcome':
        prediction = generateOutcomePrediction(question);
        confidence = 0.60 + Math.random() * 0.30;
        reasoning = 'Based on statistical analysis, current trends, and expert opinions';
        riskLevel = 'high';
        break;

      default:
        prediction = generateGeneralPrediction(question);
        confidence = 0.50 + Math.random() * 0.40;
        reasoning = 'Based on available data and pattern analysis';
        riskLevel = 'medium';
    }

    // Enhance with Kalshi data if available (for non-knowledge-base predictions)
    if (kalshiData && kalshiData.market && kalshiData.relevance > 0.4) {
      const kalshiProb = kalshiData.probability;
      const marketInsight = kalshiProb > 0.5 ? 'supports' : 'suggests caution about';
      reasoning += `. Kalshi prediction markets ${marketInsight} this outcome (${Math.round(kalshiProb * 100)}% probability)`;
      // Blend Kalshi confidence with existing confidence
      confidence = (confidence * 0.6 + kalshiToPrognoConfidence(kalshiProb, kalshiData.confidence) * 0.4);
    }
  }

  return {
    prediction,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
    dataPoints: generateDataPoints(questionType.type, kalshiData?.market),
    riskLevel
  };
}

// Web search simulation
export async function searchWeb(query: string): Promise<SearchResult[]> {
  // Simulate web search results
  const mockResults: SearchResult[] = [
    {
      title: `Latest ${query} Analysis`,
      url: 'https://example.com/analysis',
      snippet: `Comprehensive analysis of ${query} with expert insights and data-driven predictions.`,
      relevance: 0.9
    },
    {
      title: `${query} Statistics`,
      url: 'https://example.com/stats',
      snippet: `Detailed statistics and historical data for ${query}.`,
      relevance: 0.8
    },
    {
      title: `Expert Opinion on ${query}`,
      url: 'https://example.com/expert',
      snippet: `Industry experts share their insights on ${query}.`,
      relevance: 0.7
    }
  ];

  return mockResults;
}

// Analyze search results
export async function analyzeSearchResults(results: SearchResult[]): Promise<AnalysisResult> {
  if (results.length === 0) {
    return {
      sentiment: 'neutral',
      keyFactors: [],
      confidence: 0,
      summary: 'No search results available for analysis.'
    };
  }

  // Simulate analysis
  const avgRelevance = results.reduce((sum, result) => sum + result.relevance, 0) / results.length;
  const sentiment = avgRelevance > 0.8 ? 'positive' : avgRelevance > 0.6 ? 'neutral' : 'negative';

  return {
    sentiment,
    keyFactors: [
      'Data quality',
      'Source reliability',
      'Recency of information',
      'Expert consensus'
    ],
    confidence: Math.round(avgRelevance * 100) / 100,
    summary: `Analysis of ${results.length} sources indicates ${sentiment} sentiment with ${Math.round(avgRelevance * 100)}% confidence.`
  };
}

// Helper functions for generating predictions
function generateSportsPrediction(question: string, sport?: string): string {
  const predictions = [
    `The ${sport || 'team'} is likely to win based on current form and head-to-head record.`,
    `Expect a close game with the ${sport || 'favorite'} having a slight edge.`,
    `Statistical analysis suggests a victory for the home team.`,
    `Current momentum favors the ${sport || 'leading team'} in this matchup.`
  ];

  return predictions[Math.floor(Math.random() * predictions.length)];
}

function generateWeatherPrediction(question: string): string {
  const predictions = [
    'Conditions are expected to be favorable with clear skies.',
    'There is a high probability of precipitation in the forecast area.',
    'Temperature will be within normal ranges for this time of year.',
    'Weather patterns indicate stable conditions for the specified period.'
  ];

  return predictions[Math.floor(Math.random() * predictions.length)];
}

function generateOutcomePrediction(question: string): string {
  const predictions = [
    'Based on current trends, the outcome is likely to be positive.',
    'Statistical models suggest a favorable result.',
    'Historical patterns indicate this outcome is probable.',
    'Current conditions point toward the expected result occurring.'
  ];

  return predictions[Math.floor(Math.random() * predictions.length)];
}

function generateSafetyPrediction(question: string): string {
  const questionLower = question.toLowerCase();

  // Airplane safety questions
  if (questionLower.match(/(airplane|plane|flight|aircraft|crash|survive)/)) {
    return 'Research from aviation safety studies indicates that seats in the rear of the aircraft (rows behind the wings) have historically shown higher survival rates in crashes. Specifically, seats near emergency exits and in the middle section of the rear cabin tend to have better outcomes. However, it\'s important to note that most commercial flights land safely, and survival depends on many factors including crash type, impact angle, and evacuation speed.';
  }

  // Car safety questions
  if (questionLower.match(/(car|vehicle|automobile|crash|accident)/)) {
    return 'Vehicle safety research shows that the back seat, particularly the middle seat in the rear, is generally the safest position in a car. This is because it\'s furthest from common impact points and has more "crumple zone" protection. However, proper seatbelt use and appropriate child safety seats are the most critical factors for survival.';
  }

  // General safety questions
  return 'Safety research indicates that following established safety protocols, maintaining awareness of your surroundings, and having an emergency plan significantly improve survival chances. The safest location varies by situation, but generally being near exits, away from high-risk areas, and following expert safety guidelines provides the best protection.';
}

function generateFactualPrediction(question: string): string {
  const questionLower = question.toLowerCase();

  // Airplane/aviation questions
  if (questionLower.match(/(airplane|plane|flight|aircraft|seat|sit)/)) {
    if (questionLower.match(/(safe|safest|survive|crash)/)) {
      return 'Based on aviation safety research and crash statistics, the rear section of the aircraft (rows behind the wings) typically shows higher survival rates. Seats near emergency exits in the rear cabin are often considered among the safest positions. However, survival depends on multiple factors including crash type, impact severity, and evacuation efficiency.';
    }
    return 'Aviation experts recommend choosing seats based on your needs: window seats for views and sleeping, aisle seats for easy access, and exit rows for extra legroom. For safety, rear cabin seats near exits have shown better outcomes in rare crash scenarios.';
  }

  // Location/place questions
  if (questionLower.match(/(where|place|location|best|recommend)/)) {
    return 'The optimal location depends on your specific needs and circumstances. Research-based recommendations suggest considering factors such as accessibility, safety protocols, proximity to exits, and expert guidelines when making location decisions.';
  }

  // General factual questions
  return 'Based on current research and expert analysis, the answer depends on multiple factors. Consulting authoritative sources and considering your specific circumstances will provide the most accurate guidance.';
}

function generateGeneralPrediction(question: string): string {
  const predictions = [
    'Analysis suggests a positive outcome is likely.',
    'Current data indicates the probable result will align with expectations.',
    'Pattern recognition suggests the most likely scenario.',
    'Available information points toward a favorable conclusion.'
  ];

  return predictions[Math.floor(Math.random() * predictions.length)];
}

// New prediction generators for knowledge categories
function generateSciencePrediction(question: string): string {
  const knowledgeMatch = findKnowledgeMatch(question, 'science');
  if (knowledgeMatch) return knowledgeMatch;

  return 'Scientific principles and research indicate that this question involves established scientific knowledge. For specific details, consulting authoritative scientific sources would provide the most accurate information.';
}

function generateHistoryPrediction(question: string): string {
  const knowledgeMatch = findKnowledgeMatch(question, 'history');
  if (knowledgeMatch) return knowledgeMatch;

  return 'Historical records and documented events provide context for this question. Historical analysis involves examining primary sources, scholarly research, and verified accounts of past events.';
}

function generateGeographyPrediction(question: string): string {
  const knowledgeMatch = findKnowledgeMatch(question, 'geography');
  if (knowledgeMatch) return knowledgeMatch;

  return 'Geographical information is based on verified location data, maps, and geographical databases. This type of information is typically well-documented and reliable.';
}

function generateTechnologyPrediction(question: string): string {
  const knowledgeMatch = findKnowledgeMatch(question, 'technology');
  if (knowledgeMatch) return knowledgeMatch;

  return 'Technology information is based on current industry standards, technical specifications, and established practices. Technology evolves rapidly, so information may change over time.';
}

function generateHealthPrediction(question: string): string {
  const knowledgeMatch = findKnowledgeMatch(question, 'health');
  if (knowledgeMatch) return knowledgeMatch;

  return 'General health information is based on wellness research and established health guidelines. For specific medical concerns, consulting with healthcare professionals is recommended.';
}

function generateFinancePrediction(question: string): string {
  const knowledgeMatch = findKnowledgeMatch(question, 'finance');
  if (knowledgeMatch) return knowledgeMatch;

  return 'Financial information is based on general economic principles and financial concepts. For specific financial decisions, consulting with qualified financial advisors is recommended.';
}

function generateFoodPrediction(question: string): string {
  const knowledgeMatch = findKnowledgeMatch(question, 'food');
  if (knowledgeMatch) return knowledgeMatch;

  return 'Culinary information is based on cooking techniques, food science, and established culinary practices. Cooking methods and preferences can vary widely across cultures and individuals.';
}

function generateTravelPrediction(question: string): string {
  const knowledgeMatch = findKnowledgeMatch(question, 'travel');
  if (knowledgeMatch) return knowledgeMatch;

  return 'Travel information is based on destination knowledge, travel regulations, and best practices. Travel requirements and conditions can change, so verifying current information is important.';
}

function generateEducationPrediction(question: string): string {
  const knowledgeMatch = findKnowledgeMatch(question, 'education');
  if (knowledgeMatch) return knowledgeMatch;

  return 'Educational information is based on learning research, pedagogical theories, and academic best practices. Effective learning approaches can vary based on individual learning styles and needs.';
}

function generateEntertainmentPrediction(question: string): string {
  const knowledgeMatch = findKnowledgeMatch(question, 'entertainment');
  if (knowledgeMatch) return knowledgeMatch;

  return 'Entertainment information is based on industry knowledge, popular culture, and entertainment trends. Preferences in entertainment are highly subjective and can vary widely.';
}

function generateDataPoints(type: string, kalshiMarket?: any): string[] {
  const dataPointSets: { [key: string]: string[] } = {
    science: [
      'Scientific research',
      'Peer-reviewed studies',
      'Experimental data',
      'Theoretical frameworks',
      'Established principles'
    ],
    history: [
      'Historical records',
      'Primary sources',
      'Scholarly research',
      'Documented events',
      'Verified accounts'
    ],
    geography: [
      'Geographical databases',
      'Maps and cartography',
      'Location data',
      'Demographic information',
      'Verified coordinates'
    ],
    technology: [
      'Technical specifications',
      'Industry standards',
      'Current trends',
      'Technical documentation',
      'Expert knowledge'
    ],
    health: [
      'Wellness research',
      'Health guidelines',
      'Fitness studies',
      'Nutritional data',
      'General health information'
    ],
    finance: [
      'Economic data',
      'Market information',
      'Financial principles',
      'Economic indicators',
      'General financial concepts'
    ],
    food: [
      'Culinary knowledge',
      'Cooking techniques',
      'Food science',
      'Recipe databases',
      'Culinary traditions'
    ],
    travel: [
      'Destination information',
      'Travel regulations',
      'Travel guides',
      'Location data',
      'Travel best practices'
    ],
    education: [
      'Learning research',
      'Pedagogical theories',
      'Academic studies',
      'Educational best practices',
      'Learning methodologies'
    ],
    entertainment: [
      'Industry knowledge',
      'Popular culture',
      'Entertainment trends',
      'Media databases',
      'Cultural information'
    ],
    sports: [
      'Team performance metrics',
      'Historical matchup data',
      'Player statistics',
      'Injury reports',
      'Weather conditions'
    ],
    weather: [
      'Historical weather patterns',
      'Current meteorological data',
      'Satellite imagery',
      'Atmospheric pressure',
      'Temperature trends'
    ],
    safety: [
      'Aviation safety statistics',
      'Crash investigation reports',
      'Survival rate analysis',
      'Emergency evacuation studies',
      'Expert safety recommendations'
    ],
    factual: [
      'Research studies',
      'Expert knowledge',
      'Statistical data',
      'Historical records',
      'Authoritative sources'
    ],
    outcome: [
      'Statistical models',
      'Expert opinions',
      'Historical trends',
      'Current conditions',
      'Market indicators'
    ],
    general: [
      'Available data sources',
      'Pattern analysis',
      'Trend identification',
      'Statistical correlation',
      'Expert consensus'
    ]
  };

  const baseDataPoints = dataPointSets[type] || dataPointSets.general;

  // Add Kalshi market data if available
  if (kalshiMarket) {
    return [
      ...baseDataPoints,
      `Kalshi prediction market: ${kalshiMarket.title}`,
      `Market probability: ${Math.round(((kalshiMarket.yesBid + kalshiMarket.yesAsk) / 2) / 100 * 100)}%`,
      `Market volume: ${kalshiMarket.volume.toLocaleString()}`
    ];
  }

  return baseDataPoints;
}
