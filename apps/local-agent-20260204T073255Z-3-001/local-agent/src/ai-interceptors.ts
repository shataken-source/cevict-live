/**
 * AI API INTERCEPTORS
 * Automatic evidence logging for all AI interactions
 * 
 * These wrappers intercept all AI API calls and automatically log them
 * to the Evidence Locker for forensic analysis and legal compliance.
 */

import { evidenceLocker } from './evidence-locker';
import Anthropic from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';

/**
 * Anthropic (Claude) Interceptor
 */
export class AnthropicInterceptor {
  private client: Anthropic;
  private originalCreate: any;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });

    // Intercept the messages.create method
    this.originalCreate = this.client.messages.create.bind(this.client.messages);
    this.client.messages.create = this.interceptedCreate.bind(this);
  }

  private async interceptedCreate(params: any): Promise<any> {
    const startTime = Date.now();
    let response: any;
    let error: any;

    try {
      // Make the actual API call
      response = await this.originalCreate(params);
      
      const latency = Date.now() - startTime;

      // Log to Evidence Locker
      const evidenceId = await evidenceLocker.logInteraction({
        provider: 'anthropic',
        modelVersion: params.model || 'unknown',
        interactionType: 'api_call',
        requestId: response.id,
        rawRequest: params,
        rawResponse: response,
        latencyMs: latency,
      });

      // Auto-check for hallucinations if file paths are mentioned
      await this.checkForHallucinations(evidenceId, response);

      return response;
    } catch (err: any) {
      error = err;
      
      // Log failed interactions too
      await evidenceLocker.logInteraction({
        provider: 'anthropic',
        modelVersion: params.model || 'unknown',
        interactionType: 'api_call',
        requestId: 'error',
        rawRequest: params,
        rawResponse: { error: err.message, stack: err.stack },
        latencyMs: Date.now() - startTime,
      });

      throw err;
    }
  }

  private async checkForHallucinations(evidenceId: string, response: any): Promise<void> {
    try {
      const contentText = response.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');

      // Check for file path claims
      const filePathRegex = /(?:file|path|directory)[\s:]+([A-Za-z]:\\[^\s]+|\/[^\s]+)/gi;
      const matches = contentText.match(filePathRegex);

      if (matches) {
        for (const match of matches) {
          const path = match.split(/[\s:]+/).pop();
          if (path) {
            const exists = await evidenceLocker.verifyFileClaim(evidenceId, path, 'anthropic');
            if (!exists) {
              console.warn(`[CEL] Anthropic hallucinated file: ${path}`);
            }
          }
        }
      }
    } catch (error) {
      // Silent fail - don't break the main flow
      console.error('[CEL] Hallucination check failed:', error);
    }
  }

  getClient(): Anthropic {
    return this.client;
  }
}

/**
 * OpenAI Interceptor
 */
export class OpenAIInterceptor {
  private client: OpenAI;
  private originalCreate: any;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });

    // Intercept the chat.completions.create method
    this.originalCreate = this.client.chat.completions.create.bind(this.client.chat.completions);
    this.client.chat.completions.create = this.interceptedCreate.bind(this);
  }

  private async interceptedCreate(params: any): Promise<any> {
    const startTime = Date.now();

    try {
      const response = await this.originalCreate(params);
      const latency = Date.now() - startTime;

      // Log to Evidence Locker
      const evidenceId = await evidenceLocker.logInteraction({
        provider: 'openai',
        modelVersion: params.model || 'unknown',
        interactionType: 'api_call',
        requestId: response.id,
        rawRequest: params,
        rawResponse: response,
        latencyMs: latency,
      });

      // Check for hallucinations
      await this.checkForHallucinations(evidenceId, response);

      return response;
    } catch (err: any) {
      // Log failed interactions
      await evidenceLocker.logInteraction({
        provider: 'openai',
        modelVersion: params.model || 'unknown',
        interactionType: 'api_call',
        requestId: 'error',
        rawRequest: params,
        rawResponse: { error: err.message },
        latencyMs: Date.now() - startTime,
      });

      throw err;
    }
  }

  private async checkForHallucinations(evidenceId: string, response: any): Promise<void> {
    try {
      const contentText = response.choices
        .map((c: any) => c.message?.content || '')
        .join('\n');

      const filePathRegex = /(?:file|path)[\s:]+([A-Za-z]:\\[^\s]+|\/[^\s]+)/gi;
      const matches = contentText.match(filePathRegex);

      if (matches) {
        for (const match of matches) {
          const path = match.split(/[\s:]+/).pop();
          if (path) {
            const exists = await evidenceLocker.verifyFileClaim(evidenceId, path, 'openai');
            if (!exists) {
              console.warn(`[CEL] OpenAI hallucinated file: ${path}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('[CEL] Hallucination check failed:', error);
    }
  }

  getClient(): OpenAI {
    return this.client;
  }
}

/**
 * Generic HTTP Interceptor for other AI APIs (Google, etc.)
 */
export class GenericAIInterceptor {
  async logAndCall(
    provider: 'google' | 'cursor' | 'other',
    modelVersion: string,
    request: any,
    apiCallFunction: () => Promise<any>
  ): Promise<any> {
    const startTime = Date.now();

    try {
      const response = await apiCallFunction();
      const latency = Date.now() - startTime;

      await evidenceLocker.logInteraction({
        provider,
        modelVersion,
        interactionType: 'api_call',
        rawRequest: request,
        rawResponse: response,
        latencyMs: latency,
      });

      return response;
    } catch (err: any) {
      await evidenceLocker.logInteraction({
        provider,
        modelVersion,
        interactionType: 'api_call',
        requestId: 'error',
        rawRequest: request,
        rawResponse: { error: err.message },
        latencyMs: Date.now() - startTime,
      });

      throw err;
    }
  }
}

/**
 * Singleton instances for easy import
 */
export const anthropicLogged = new AnthropicInterceptor();
export const openaiLogged = new OpenAIInterceptor();
export const genericAILogged = new GenericAIInterceptor();

/**
 * Usage example:
 * 
 * // Instead of:
 * const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 * const response = await anthropic.messages.create({ ... });
 * 
 * // Use:
 * import { anthropicLogged } from './ai-interceptors';
 * const response = await anthropicLogged.getClient().messages.create({ ... });
 * 
 * // All calls are automatically logged to the Evidence Locker!
 */

