/**
 * Bot Academy Curriculum for Fishy
 * Training program to make Fishy smarter
 */

export interface LearningTask {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  status: 'pending' | 'in_progress' | 'completed';
  steps: Array<{
    id: string;
    action: string;
    description: string;
    command?: string;
  }>;
  expectedOutcome: string;
  hints: string[];
}

export const FISHY_TRAINING_CURRICULUM: LearningTask[] = [
  {
    id: 'understand-cevict-ecosystem',
    title: 'Understand CEVICT Ecosystem',
    description: 'Learn about all CEVICT projects and their purposes',
    difficulty: 'beginner',
    status: 'pending',
    steps: [
      {
        id: 'study-projects',
        action: 'Study all CEVICT projects',
        description: 'Learn about Auspicio, Brain, Progno, GCC, PetReunion, etc.',
        command: 'Read: apps/cevict/app/projects/page.tsx'
      },
      {
        id: 'understand-relationships',
        action: 'Understand project relationships',
        description: 'Learn how projects work together in the ecosystem',
        command: 'Read: apps/cevict/app/ecosystem/page.tsx'
      }
    ],
    expectedOutcome: 'Fishy can accurately describe all CEVICT projects',
    hints: [
      'Projects are organized by category',
      'Some projects depend on others',
      'All projects are part of the CEVICT ecosystem'
    ]
  },
  {
    id: 'learn-ai-integration',
    title: 'Learn AI Integration',
    description: 'Understand how to use Google Gemini AI for intelligent responses',
    difficulty: 'intermediate',
    status: 'pending',
    steps: [
      {
        id: 'setup-gemini',
        action: 'Set up Google Gemini API',
        description: 'Configure API key and understand the model',
        command: 'Read: apps/cevict/app/api/fishy/route.ts'
      },
      {
        id: 'build-context',
        action: 'Build conversation context',
        description: 'Learn how to maintain conversation history',
        command: 'Study: conversationHistory parameter'
      },
      {
        id: 'craft-prompts',
        action: 'Craft effective prompts',
        description: 'Learn how to structure prompts for best responses',
        command: 'Review: FISHY_KNOWLEDGE_BASE'
      }
    ],
    expectedOutcome: 'Fishy can provide intelligent, context-aware responses',
    hints: [
      'Use system prompts to define personality',
      'Include conversation history for context',
      'Structure knowledge base clearly'
    ]
  },
  {
    id: 'master-project-knowledge',
    title: 'Master Project Knowledge',
    description: 'Deep dive into each project\'s features and capabilities',
    difficulty: 'intermediate',
    status: 'pending',
    steps: [
      {
        id: 'learn-auspicio',
        action: 'Learn Auspicio Forge',
        description: 'Understand AI agent creation and workflow automation',
        command: 'Read: apps/auspicio documentation'
      },
      {
        id: 'learn-brain',
        action: 'Learn Brain monitoring',
        description: 'Understand autonomous monitoring and self-healing',
        command: 'Read: apps/brain documentation'
      },
      {
        id: 'learn-progno',
        action: 'Learn Progno predictions',
        description: 'Understand prediction engine and Kaggle integration',
        command: 'Read: apps/progno documentation'
      },
      {
        id: 'learn-gcc',
        action: 'Learn Gulf Coast Charters',
        description: 'Understand charter booking and weather intelligence',
        command: 'Read: apps/gcc documentation'
      }
    ],
    expectedOutcome: 'Fishy can provide detailed, accurate information about any project',
    hints: [
      'Each project has unique features',
      'Some projects have integrations',
      'Projects serve different purposes'
    ]
  },
  {
    id: 'develop-conversation-skills',
    title: 'Develop Conversation Skills',
    description: 'Learn to have natural, helpful conversations',
    difficulty: 'advanced',
    status: 'pending',
    steps: [
      {
        id: 'understand-user-intent',
        action: 'Understand user intent',
        description: 'Learn to identify what users really want',
        command: 'Practice: Analyzing different question types'
      },
      {
        id: 'provide-actionable-advice',
        action: 'Provide actionable advice',
        description: 'Learn to give specific, helpful guidance',
        command: 'Practice: Converting general questions to specific answers'
      },
      {
        id: 'handle-unknown-topics',
        action: 'Handle unknown topics gracefully',
        description: 'Learn to admit when you don\'t know something',
        command: 'Practice: Polite fallback responses'
      }
    ],
    expectedOutcome: 'Fishy can have natural, helpful conversations with users',
    hints: [
      'Ask clarifying questions when needed',
      'Provide examples when helpful',
      'Always be honest about limitations'
    ]
  },
  {
    id: 'become-embeddable',
    title: 'Become Embeddable Widget',
    description: 'Learn to work as an embeddable widget for any website',
    difficulty: 'advanced',
    status: 'pending',
    steps: [
      {
        id: 'create-widget-api',
        action: 'Create widget API',
        description: 'Build API that can be called from any domain',
        command: 'Build: CORS-enabled API endpoint'
      },
      {
        id: 'design-widget-interface',
        action: 'Design widget interface',
        description: 'Create embeddable chat widget component',
        command: 'Build: React component for embedding'
      },
      {
        id: 'handle-multiple-instances',
        action: 'Handle multiple instances',
        description: 'Support multiple Fishy instances on same page',
        command: 'Implement: Instance isolation'
      }
    ],
    expectedOutcome: 'Fishy can be embedded in any website as a chat widget',
    hints: [
      'Use iframe or script tag embedding',
      'Support CORS for cross-origin requests',
      'Make widget responsive and accessible'
    ]
  },
  {
    id: 'integrate-animation',
    title: 'Integrate Animation System',
    description: 'Work with animation system for visual Fishy',
    difficulty: 'expert',
    status: 'pending',
    steps: [
      {
        id: 'understand-animation-api',
        action: 'Understand animation API',
        description: 'Learn how the animation system works',
        command: 'Review: Animation system documentation'
      },
      {
        id: 'sync-with-responses',
        action: 'Sync responses with animation',
        description: 'Coordinate AI responses with visual animations',
        command: 'Implement: Animation triggers based on message type'
      },
      {
        id: 'optimize-performance',
        action: 'Optimize performance',
        description: 'Ensure smooth animations with AI responses',
        command: 'Optimize: Reduce latency and improve UX'
      }
    ],
    expectedOutcome: 'Fishy works seamlessly with animation system',
    hints: [
      'Animation should match conversation tone',
      'Keep animations smooth and non-distracting',
      'Allow users to disable animations if needed'
    ]
  },
  {
    id: 'learn-kalshi-integration',
    title: 'Learn Kalshi Prediction Markets',
    description: 'Understand how to use Kalshi data for training and predictions',
    difficulty: 'intermediate',
    status: 'pending',
    steps: [
      {
        id: 'study-kalshi-api',
        action: 'Study Kalshi API integration',
        description: 'Learn how Kalshi prediction markets work and how to fetch data',
        command: 'Read: apps/progno/app/kalshi-fetcher.ts'
      },
      {
        id: 'understand-market-probabilities',
        action: 'Understand market probabilities',
        description: 'Learn how to extract probabilities from Kalshi markets',
        command: 'Study: getMarketProbability function'
      },
      {
        id: 'integrate-kalshi-training',
        action: 'Integrate Kalshi for training',
        description: 'Use Kalshi market data to train prediction models',
        command: 'Use: /api/bot/kalshi-training endpoint'
      },
      {
        id: 'match-predictions-to-markets',
        action: 'Match predictions to markets',
        description: 'Learn how to find relevant Kalshi markets for prediction questions',
        command: 'Use: findBestKalshiMatch function'
      }
    ],
    expectedOutcome: 'Bot can use Kalshi prediction market data to improve predictions and training',
    hints: [
      'Kalshi provides real-time market probabilities (0-100%)',
      'Market data can enhance confidence scores',
      'Use Kalshi data to validate and improve predictions',
      'Kalshi markets cover sports, economics, politics, tech, and more'
    ]
  }
];

export function getFishyCurriculum() {
  return FISHY_TRAINING_CURRICULUM;
}

export function getFishyTask(taskId: string): LearningTask | undefined {
  return FISHY_TRAINING_CURRICULUM.find(task => task.id === taskId);
}

