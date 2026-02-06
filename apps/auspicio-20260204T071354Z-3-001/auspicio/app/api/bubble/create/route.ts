// API Route for Bubble Creation
import { NextRequest, NextResponse } from 'next/server';

// Enhanced type definitions
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

// Helper functions for localStorage-like persistence with enhanced error handling
const getStoredBubbles = (): Bubble[] => {
  try {
    // In a real app, this would be a database. For now, we'll use in-memory storage
    // that persists between API calls within the same server session
    if (!global.bubbles) {
      global.bubbles = [] as Bubble[]; // Start with empty array - no mock bubbles
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

export async function GET(request: NextRequest) {
  try {
    const bubbles = getStoredBubbles();

    // Sort by creation date (newest first)
    const sortedBubbles = [...bubbles].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Calculate statistics
    const stats = {
      total: sortedBubbles.length,
      active: sortedBubbles.filter(b => b.status === 'active').length,
      archived: sortedBubbles.filter(b => b.status === 'archived').length,
      completed: sortedBubbles.filter(b => b.status === 'completed').length,
      totalAgents: sortedBubbles.reduce((sum, b) => sum + (b.agents?.length || 0), 0)
    };

    console.log('📋 Retrieving bubbles list:', {
      count: sortedBubbles.length,
      stats
    });

    return NextResponse.json({
      success: true,
      bubbles: sortedBubbles,
      message: 'Bubbles retrieved successfully',
      metadata: {
        stats,
        retrievedAt: new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ Failed to retrieve bubbles:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve bubbles',
      message: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        message: 'Request body must be valid JSON'
      }, { status: 400 });
    }

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        message: 'Bubble name is required and must be a non-empty string'
      }, { status: 400 });
    }

    // Sanitize input
    const sanitizedName = body.name.trim().substring(0, 100); // Limit length
    const sanitizedDescription = body.description ? body.description.trim().substring(0, 500) : '';
    // Always include GATEKEEPER and default agents
    const defaultAgents = ['GATEKEEPER', 'USER', 'ARCHITECT', 'ENGINEER', 'VALIDATOR'];
    const providedAgents = Array.isArray(body.agents)
      ? body.agents.filter((a: any) => typeof a === 'string' && a !== 'GATEKEEPER').slice(0, 20) // Limit agents, exclude GATEKEEPER (always included)
      : [];

    // Merge: GATEKEEPER first, then provided agents, then defaults (avoiding duplicates)
    const allAgents = [...defaultAgents];
    providedAgents.forEach((agent: string) => {
      if (!allAgents.includes(agent.toUpperCase())) {
        allAgents.push(agent.toUpperCase());
      }
    });
    const sanitizedAgents = allAgents;

    console.log('🫧 Creating new bubble:', {
      name: sanitizedName,
      agents: sanitizedAgents,
      description: sanitizedDescription ? 'provided' : 'none'
    });

    // Get current bubbles and create new one
    const bubbles = getStoredBubbles();

    // Check for duplicate names (optional - can be removed if duplicates are allowed)
    const duplicateName = bubbles.find(b =>
      b.name.toLowerCase() === sanitizedName.toLowerCase()
    );
    if (duplicateName) {
      console.warn('⚠️ Duplicate bubble name detected:', sanitizedName);
      // Allow duplicates but log warning
    }

    // Create new bubble with enhanced metadata
    const newBubble: Bubble = {
      id: `bubble-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: sanitizedName,
      created_at: new Date().toISOString(),
      status: 'active',
      agents: sanitizedAgents,
      description: sanitizedDescription,
      projectType: body.projectType || 'general',
      metadata: {
        lastActivity: new Date().toISOString(),
        messageCount: 0,
        agentCount: sanitizedAgents.length
      }
    };

    // Add to storage
    const updatedBubbles = [...bubbles, newBubble];
    saveBubbles(updatedBubbles);

    console.log('✅ Bubble created successfully:', {
      id: newBubble.id,
      name: newBubble.name,
      totalBubbles: updatedBubbles.length,
      agentCount: sanitizedAgents.length
    });

    return NextResponse.json({
      success: true,
      bubble: newBubble,
      allBubbles: updatedBubbles, // Return updated list
      message: 'Bubble created successfully',
      metadata: {
        totalBubbles: updatedBubbles.length,
        createdAt: newBubble.created_at
      }
    }, { status: 201 }); // Use 201 Created status

  } catch (error) {
    console.error('❌ Failed to create bubble:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to create bubble',
      message: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
