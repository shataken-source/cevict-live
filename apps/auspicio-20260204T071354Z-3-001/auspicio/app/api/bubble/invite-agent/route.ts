// API Route for Inviting Agents to Bubbles
import { NextRequest, NextResponse } from 'next/server';

// Agent registry with all available agents
const AGENTS = [
  { id: 'GATEKEEPER', name: 'Gatekeeper', icon: '🛡️', description: 'Security & access control', can_invite: false }, // Auto-added
  { id: 'USER', name: 'User', icon: '👤', description: 'User interface agent', can_invite: true },
  { id: 'ARCHITECT', name: 'Architect', icon: '🏗️', description: 'System design & architecture', can_invite: true },
  { id: 'ENGINEER', name: 'Engineer', icon: '⚙️', description: 'Code implementation', can_invite: true },
  { id: 'VALIDATOR', name: 'Validator', icon: '✅', description: 'Quality assurance & testing', can_invite: true },
  { id: 'BUSINESS_ANALYST', name: 'Business Analyst', icon: '📊', description: 'Business analysis & strategy', can_invite: true },
  { id: 'DATA_INTELLIGENCE', name: 'Data Intelligence', icon: '🧠', description: 'Data analysis & insights', can_invite: true },
  { id: 'RISK_ASSESSMENT', name: 'Risk Assessment', icon: '⚠️', description: 'Risk analysis & mitigation', can_invite: true },
  { id: 'PRODUCT_DEVELOPMENT', name: 'Product Development', icon: '🚀', description: 'Product planning & development', can_invite: true },
  { id: 'MARKETING_STRATEGY', name: 'Marketing Strategy', icon: '📢', description: 'Marketing & growth strategy', can_invite: true },
  { id: 'GRAPHICS_DESIGNER', name: 'Graphics Designer', icon: '🎨', description: 'Visual design & graphics', can_invite: true },
  { id: 'MARKETING_SPECIALIST', name: 'Marketing Specialist', icon: '📈', description: 'Marketing campaigns & SEO', can_invite: true },
  { id: 'LEGAL_ADVISOR', name: 'Legal Advisor', icon: '⚖️', description: 'Legal & compliance', can_invite: true },
  { id: 'PR_SPECIALIST', name: 'PR Specialist', icon: '📰', description: 'Public relations', can_invite: true },
  { id: 'SECURITY_EXPERT', name: 'Security Expert', icon: '🔒', description: 'Security & privacy', can_invite: true },
  { id: 'DOCUMENTATION_SPECIALIST', name: 'Documentation Specialist', icon: '📚', description: 'Technical writing', can_invite: true },
  { id: 'DATA_ANALYST', name: 'Data Analyst', icon: '📊', description: 'Data & analytics', can_invite: true },
  { id: 'WEB_DATA_EXTRACTOR', name: 'Web Data Extractor', icon: '🔍', description: 'Web scraping & data processing', can_invite: true },
];

interface Bubble {
  id: string;
  name: string;
  created_at: string;
  status: 'active' | 'archived' | 'completed';
  agents: string[];
  description?: string;
  projectType?: string;
  metadata?: {
    lastActivity?: string;
    messageCount?: number;
    agentCount?: number;
  };
}

const getStoredBubbles = (): Bubble[] => {
  try {
    if (!global.bubbles) {
      global.bubbles = [] as Bubble[];
    }
    return global.bubbles as Bubble[];
  } catch (error) {
    console.error('❌ Error getting stored bubbles:', error);
    return [];
  }
};

const saveBubbles = (bubbles: Bubble[]): void => {
  try {
    global.bubbles = bubbles;
    console.log('💾 Bubbles saved to storage:', { count: bubbles.length });
  } catch (error) {
    console.error('❌ Error saving bubbles:', error);
    throw new Error('Failed to save bubbles');
  }
};

// GET: List available agents (filter out agents already in bubble)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bubbleId = searchParams.get('bubble_id');

    // Get all bubbles to check which agents are already in the specified bubble
    const bubbles = getStoredBubbles();
    const bubble = bubbleId ? bubbles.find(b => b.id === bubbleId) : null;
    const agentsInBubble = bubble ? bubble.agents.map(a => a.toUpperCase()) : [];

    // Map agents with can_invite status
    const agentsWithStatus = AGENTS.map(agent => ({
      ...agent,
      can_invite: agent.can_invite && !agentsInBubble.includes(agent.id.toUpperCase())
    }));

    console.log('📋 Available agents:', {
      bubbleId: bubbleId || 'none',
      totalAgents: AGENTS.length,
      agentsInBubble: agentsInBubble.length,
      inviteable: agentsWithStatus.filter(a => a.can_invite).length
    });

    return NextResponse.json({
      success: true,
      agents: agentsWithStatus,
      bubbleId: bubbleId || null,
      agentsInBubble: agentsInBubble
    });

  } catch (error) {
    console.error('❌ Failed to retrieve agents:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve agents',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Invite an agent to a bubble
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bubble_id, bubbleId, agent_id, agentId } = body;

    // Support both snake_case and camelCase
    const finalBubbleId = bubble_id || bubbleId;
    const finalAgentId = agent_id || agentId;

    if (!finalBubbleId || typeof finalBubbleId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'bubble_id is required'
      }, { status: 400 });
    }

    if (!finalAgentId || typeof finalAgentId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'agent_id is required'
      }, { status: 400 });
    }

    const agentIdUpper = finalAgentId.toUpperCase();

    // Find the agent
    const agent = AGENTS.find(a => a.id.toUpperCase() === agentIdUpper);
    if (!agent) {
      return NextResponse.json({
        success: false,
        error: `Agent '${finalAgentId}' not found`
      }, { status: 404 });
    }

    // GATEKEEPER cannot be manually invited (auto-added)
    if (agentIdUpper === 'GATEKEEPER') {
      return NextResponse.json({
        success: false,
        error: 'GATEKEEPER is automatically added to all bubbles and cannot be manually invited'
      }, { status: 400 });
    }

    // Get bubbles and find the target bubble
    const bubbles = getStoredBubbles();
    const bubbleIndex = bubbles.findIndex(b => b.id === finalBubbleId);

    if (bubbleIndex === -1) {
      return NextResponse.json({
        success: false,
        error: `Bubble '${finalBubbleId}' not found`
      }, { status: 404 });
    }

    const bubble = bubbles[bubbleIndex];

    // Check if agent is already in bubble
    if (bubble.agents.map(a => a.toUpperCase()).includes(agentIdUpper)) {
      return NextResponse.json({
        success: false,
        error: `Agent '${agent.name}' is already in this bubble`
      }, { status: 400 });
    }

    // Add agent to bubble
    bubble.agents.push(agent.id);
    bubble.metadata = bubble.metadata || {};
    bubble.metadata.agentCount = bubble.agents.length;
    bubble.metadata.lastActivity = new Date().toISOString();

    // Save updated bubbles
    bubbles[bubbleIndex] = bubble;
    saveBubbles(bubbles);

    console.log('✅ Agent invited successfully:', {
      bubbleId: finalBubbleId,
      bubbleName: bubble.name,
      agentId: agent.id,
      agentName: agent.name,
      totalAgents: bubble.agents.length
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        icon: agent.icon,
        description: agent.description
      },
      bubble: {
        id: bubble.id,
        name: bubble.name,
        agents: bubble.agents,
        agentCount: bubble.agents.length
      },
      message: `${agent.name} invited successfully`
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Failed to invite agent:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to invite agent',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}








