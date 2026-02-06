/**
 * OpenAI Client Wrapper
 * 
 * Handles AI content generation for captions, replies, Q&A, scripts, hashtags
 */

const OpenAI = require('openai');

class OpenAIClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generate video script from PetReunion story
   * @param {object} story - Formatted story object
   * @returns {Promise<string>} Video script
   */
  async generateVideoScript(story) {
    const prompt = `Create a compelling 15-30 second TikTok video script for a lost pet alert.

Pet Details:
- Type: ${story.petType}
- Location: ${story.location}
- Description: ${story.description || 'No description provided'}
- Status: ${story.status}

Requirements:
- Keep it under 30 seconds when read aloud
- Be empathetic and urgent
- Include location prominently
- End with a call to action (share, contact info)
- Use simple, clear language
- Make it engaging for TikTok audience

Script:`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are a social media content creator specializing in helping reunite lost pets with their families.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      throw new Error(`Failed to generate video script: ${error.message}`);
    }
  }

  /**
   * Generate TikTok caption with hashtags
   * @param {object} story - Formatted story object
   * @param {string} script - Video script (optional)
   * @returns {Promise<object>} { caption: string, hashtags: string[] }
   */
  async generateCaption(story, script = null) {
    const prompt = `Create a TikTok caption for a lost pet post.

Pet Details:
- Type: ${story.petType}
- Location: ${story.location}
- Description: ${story.description || 'No description provided'}
${script ? `- Video Script: ${script}` : ''}

Requirements:
- Keep caption under 2200 characters (TikTok limit)
- Include relevant hashtags (5-10)
- Be concise but informative
- Include location
- Add urgency without being alarmist
- Format: Caption text\n\n#hashtag1 #hashtag2 etc.

Caption:`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are a social media expert creating engaging TikTok captions.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      });

      const content = response.choices[0].message.content.trim();
      
      // Extract hashtags
      const hashtagRegex = /#\w+/g;
      const hashtags = content.match(hashtagRegex) || [];
      const caption = content.replace(hashtagRegex, '').trim();

      return {
        caption: caption || content,
        hashtags: hashtags.map(h => h.substring(1)), // Remove # symbol
      };
    } catch (error) {
      throw new Error(`Failed to generate caption: ${error.message}`);
    }
  }

  /**
   * Generate comment reply
   * @param {string} comment - Original comment text
   * @param {object} story - Story context
   * @returns {Promise<string>} Reply text
   */
  async generateCommentReply(comment, story) {
    const prompt = `Generate a helpful, empathetic reply to this TikTok comment about a lost pet.

Comment: "${comment}"

Pet Story Context:
- Type: ${story.petType}
- Location: ${story.location}
- Status: ${story.status}

Requirements:
- Be helpful and empathetic
- Keep it brief (under 150 characters)
- If comment mentions seeing the pet, ask for location/details
- If comment is supportive, thank them
- If comment asks questions, provide helpful info
- Always encourage sharing

Reply:`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are a helpful community manager responding to comments about lost pets.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      throw new Error(`Failed to generate comment reply: ${error.message}`);
    }
  }

  /**
   * Generate Q&A response
   * @param {string} question - User question
   * @param {object} story - Story context
   * @returns {Promise<string>} Answer text
   */
  async generateQAResponse(question, story) {
    const prompt = `Answer this question about a lost pet post.

Question: "${question}"

Pet Story Context:
- Type: ${story.petType}
- Location: ${story.location}
- Description: ${story.description || 'No description provided'}
- Contact: ${story.contact || 'See post for contact info'}

Requirements:
- Be helpful and accurate
- Keep it concise (under 200 characters)
- If you don't know, say so and direct to contact info
- Encourage sharing if relevant

Answer:`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are a helpful assistant answering questions about lost pet posts.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      throw new Error(`Failed to generate Q&A response: ${error.message}`);
    }
  }
}

module.exports = OpenAIClient;
