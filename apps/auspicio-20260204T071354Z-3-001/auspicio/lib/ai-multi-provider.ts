/**
 * Multi-AI Provider Service
 * Uses ChatGPT (OpenAI), Claude (Anthropic), and Gemini (Google) together
 *
 * Agent Roles:
 * - ARCHITECT: ChatGPT (design, planning, coordination)
 * - ENGINEER: Claude (coding, implementation)
 * - VALIDATOR: Gemini (validation, quality assurance)
 */

interface AIResponse {
  content: string;
  model: string;
  confidence?: number;
  metadata?: any;
}

interface AgentRole {
  ARCHITECT: 'chatgpt';
  ENGINEER: 'claude';
  VALIDATOR: 'gemini';
}

const AGENT_MODEL_MAP: AgentRole = {
  ARCHITECT: 'chatgpt',
  ENGINEER: 'claude',
  VALIDATOR: 'gemini',
};

/**
 * Call ChatGPT (OpenAI) - Used by ARCHITECT for design
 */
async function callChatGPT(prompt: string, systemPrompt?: string): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`OpenAI API error: ${error.error?.message || 'Failed to get response'}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || 'No response from ChatGPT',
      model: 'gpt-4-turbo-preview',
      confidence: 0.9,
      metadata: {
        usage: data.usage,
        finishReason: data.choices[0]?.finish_reason,
      },
    };
  } catch (error) {
    console.error('❌ ChatGPT API error:', error);
    throw error;
  }
}

/**
 * Call Claude (Anthropic) - Used by ENGINEER for coding
 */
async function callClaude(prompt: string, systemPrompt?: string): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt || 'You are an expert software engineer. Write clean, production-ready code.',
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Anthropic API error: ${error.error?.message || 'Failed to get response'}`);
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || 'No response from Claude',
      model: 'claude-3-5-sonnet-20241022',
      confidence: 0.92,
      metadata: {
        usage: data.usage,
        stopReason: data.stop_reason,
      },
    };
  } catch (error) {
    console.error('❌ Claude API error:', error);
    throw error;
  }
}

/**
 * Call Gemini (Google) - Used by VALIDATOR for validation
 */
async function callGemini(prompt: string, systemPrompt?: string): Promise<AIResponse> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY not configured');
  }

  try {
    // Use Gemini API v1
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3, // Lower temperature for validation (more deterministic)
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Gemini API error: ${error.error?.message || 'Failed to get response'}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0]?.content?.parts[0]?.text || 'No response from Gemini',
      model: 'gemini-pro',
      confidence: 0.88,
      metadata: {
        finishReason: data.candidates[0]?.finishReason,
        safetyRatings: data.candidates[0]?.safetyRatings,
      },
    };
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    throw error;
  }
}

/**
 * Get AI response based on agent role
 */
export async function getAIResponse(
  agent: string,
  prompt: string,
  context?: {
    previousMessages?: any[];
    task?: string;
    codeToValidate?: string;
  }
): Promise<AIResponse> {
  const agentUpper = agent.toUpperCase();
  const modelType = AGENT_MODEL_MAP[agentUpper as keyof AgentRole];

  if (!modelType) {
    // Default to Claude if agent not recognized
    console.warn(`⚠️ Unknown agent "${agent}", defaulting to Claude`);
    return callClaude(prompt);
  }

  // Build system prompts based on agent role
  let systemPrompt = '';
  let enhancedPrompt = prompt;

  switch (agentUpper) {
    case 'ARCHITECT':
      // ChatGPT for design and architecture
      systemPrompt = `You are an expert software architect and UX designer. Your role is to:
- Analyze user requirements and break them down into clear, actionable tasks
- Design system architecture and user experience
- Create detailed specifications for implementation
- Coordinate between different components and agents
- Focus on design patterns, scalability, and user experience

Provide clear, structured design plans and specifications.`;
      return callChatGPT(enhancedPrompt, systemPrompt);

    case 'ENGINEER':
      // Claude for coding
      systemPrompt = `You are an expert software engineer. Your role is to:
- Write clean, production-ready code
- Implement features based on specifications
- Follow best practices and coding standards
- Generate complete, working code solutions
- Include proper error handling and documentation

Write code that is maintainable, efficient, and follows industry best practices.`;

      if (context?.task) {
        enhancedPrompt = `Task: ${context.task}\n\n${prompt}\n\nGenerate complete, production-ready code for this task.`;
      }
      return callClaude(enhancedPrompt, systemPrompt);

    case 'VALIDATOR':
      // Gemini for validation
      systemPrompt = `You are a quality assurance expert and code validator. Your role is to:
- Review code for correctness, security, and best practices
- Validate that implementations match specifications
- Identify potential bugs, security issues, or improvements
- Ensure code quality and maintainability
- Provide constructive feedback and validation results

Be thorough, critical, and constructive in your validation.`;

      if (context?.codeToValidate) {
        enhancedPrompt = `Code to validate:\n\`\`\`\n${context.codeToValidate}\n\`\`\`\n\n${prompt}\n\nReview this code thoroughly and provide validation feedback.`;
      }
      return callGemini(enhancedPrompt, systemPrompt);

    default:
      // Fallback to Claude
      return callClaude(prompt);
  }
}

/**
 * Get all three AI models' perspectives on a task (for consensus)
 */
export async function getConsensusResponse(
  prompt: string,
  task?: string
): Promise<{
  chatgpt: AIResponse;
  claude: AIResponse;
  gemini: AIResponse;
  consensus?: string;
}> {
  const [chatgpt, claude, gemini] = await Promise.all([
    callChatGPT(prompt, 'You are an expert software architect. Analyze this request and provide design recommendations.'),
    callClaude(prompt, 'You are an expert software engineer. Analyze this request and provide implementation recommendations.'),
    callGemini(prompt, 'You are a quality assurance expert. Analyze this request and provide validation recommendations.'),
  ]);

  // Generate consensus summary using Gemini (validator role)
  const consensusPrompt = `Three AI experts have provided their perspectives:

ChatGPT (Architect): ${chatgpt.content.substring(0, 500)}
Claude (Engineer): ${claude.content.substring(0, 500)}
Gemini (Validator): ${gemini.content.substring(0, 500)}

Synthesize a consensus recommendation that combines the best insights from all three perspectives.`;

  const consensus = await callGemini(consensusPrompt, 'You synthesize expert opinions into actionable consensus recommendations.');

  return {
    chatgpt,
    claude,
    gemini,
    consensus: consensus.content,
  };
}

export { AGENT_MODEL_MAP };

