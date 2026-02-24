// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FACEBOOK_PAGE_TOKEN = Deno.env.get('FACEBOOK_PAGE_TOKEN') || '';
const FACEBOOK_PAGE_ID = Deno.env.get('FACEBOOK_PAGE_ID') || '';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// PetReunion knowledge base
const PETREUNION_KNOWLEDGE = {
  what: "PetReunion is a FREE public service to help reunite lost pets with their families. No registration required, completely free for everyone.",
  how: "To report a lost pet, visit petreunion.org/report and fill out a simple 4-step form with your pet's photo, location, and contact info.",
  cost: "PetReunion is 100% FREE. No fees, no registration, no hidden costs.",
  features: "PetReunion features: photo uploads, location-based search, optional reward system, mobile-friendly, and shelter login for quick entry.",
  shelter: "Animal shelters can log in at petreunion.org/shelter/login to quickly add found pets and match them with lost pet reports.",
  report: "Report a lost pet at petreunion.org/report. It takes less than 2 minutes and is completely free.",
  website: "Visit petreunion.org for more information, to report a lost pet, or for shelters to log in."
};

// Use Gemini AI to understand questions
async function understandQuestion(question: string): Promise<{ topic: string; confidence: number; answer?: string }> {
  if (!GEMINI_API_KEY) {
    // Fallback to keyword matching if no API key
    return keywordMatch(question);
  }

  try {
    const prompt = `You are a helpful assistant for PetReunion.org, a FREE lost pet recovery service.

User question: "${question}"

Based on this knowledge about PetReunion:
- FREE public service to reunite lost pets
- No registration required
- Report lost pets at petreunion.org/report
- Shelters can log in at petreunion.org/shelter/login
- Features: photo uploads, location search, mobile-friendly
- Website: petreunion.org

Determine:
1. What topic is the user asking about? (what, how, cost, features, shelter, report, website, or "unknown")
2. Can you answer it? (yes/no)
3. If yes, provide a helpful answer (2-3 sentences max)
4. If no, suggest they visit petreunion.org for more info

Respond in JSON format:
{
  "topic": "topic_name",
  "canAnswer": true/false,
  "answer": "your answer or null",
  "confidence": 0.0-1.0
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Try to parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        topic: parsed.topic || 'unknown',
        confidence: parsed.confidence || 0.5,
        answer: parsed.canAnswer ? parsed.answer : undefined
      };
    }

    // Fallback
    return keywordMatch(question);
  } catch (error) {
    console.error('Gemini API error:', error);
    return keywordMatch(question);
  }
}

// Keyword-based fallback
function keywordMatch(question: string): { topic: string; confidence: number; answer?: string } {
  const text = question.toLowerCase();
  
  if (text.includes('what') && (text.includes('petreunion') || text.includes('pet reunion'))) {
    return { topic: 'what', confidence: 0.9, answer: PETREUNION_KNOWLEDGE.what };
  }
  
  if (text.includes('how') || text.includes('report') || text.includes('lost')) {
    return { topic: 'how', confidence: 0.8, answer: PETREUNION_KNOWLEDGE.how };
  }
  
  if (text.includes('cost') || text.includes('price') || text.includes('free') || text.includes('fee')) {
    return { topic: 'cost', confidence: 0.9, answer: PETREUNION_KNOWLEDGE.cost };
  }
  
  if (text.includes('shelter')) {
    return { topic: 'shelter', confidence: 0.9, answer: PETREUNION_KNOWLEDGE.shelter };
  }
  
  if (text.includes('feature') || text.includes('what can')) {
    return { topic: 'features', confidence: 0.8, answer: PETREUNION_KNOWLEDGE.features };
  }
  
  return { topic: 'unknown', confidence: 0.3 };
}

// Store interaction for learning
async function storeInteraction(question: string, answer: string | null, topic: string, confidence: number) {
  try {
    await supabase.from('facebook_bot_interactions').insert({
      question,
      answer,
      topic,
      confidence,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to store interaction:', error);
    // Don't fail if storage fails
  }
}

// Get learned answers from database
async function getLearnedAnswer(question: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('facebook_bot_interactions')
      .select('answer, topic')
      .ilike('question', `%${question.slice(0, 50)}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data?.answer) {
      return data.answer;
    }
  } catch (error) {
    // No match found or table doesn't exist
  }
  return null;
}

// Generate intelligent reply
async function generateReply(commentText: string): Promise<string> {
  // Check learned answers first
  const learnedAnswer = await getLearnedAnswer(commentText);
  if (learnedAnswer) {
    return learnedAnswer;
  }

  // Use AI to understand question
  const analysis = await understandQuestion(commentText);
  
  let answer: string;
  
  if (analysis.answer && analysis.confidence > 0.6) {
    // We have a good answer
    answer = analysis.answer;
    
    // Store for learning
    await storeInteraction(commentText, answer, analysis.topic, analysis.confidence);
  } else {
    // Can't answer - suggest website
    answer = `I'm not sure about that specific question, but you can find all the information you need at petreunion.org! 🐕

Visit petreunion.org to:
• Report a lost pet (FREE)
• Search for lost pets
• Learn more about how it works
• For shelters: Log in to add found pets

If you have more questions, the website has all the details!`;
    
    // Store unknown question for review
    await storeInteraction(commentText, null, 'unknown', analysis.confidence);
  }
  
  return answer;
}

// Reply to Facebook comment
async function replyToComment(commentId: string, message: string) {
  if (!FACEBOOK_PAGE_TOKEN) {
    throw new Error('Facebook credentials not configured');
  }

  const url = `https://graph.facebook.com/v18.0/${commentId}/comments`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      access_token: FACEBOOK_PAGE_TOKEN
    })
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error?.message || 'Facebook API error');
  }
  
  return result;
}

// Get comments from a post
async function getComments(postId: string) {
  if (!FACEBOOK_PAGE_TOKEN) {
    throw new Error('Facebook credentials not configured');
  }

  const url = `https://graph.facebook.com/v18.0/${postId}/comments?access_token=${FACEBOOK_PAGE_TOKEN}`;
  const response = await fetch(url);
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error?.message || 'Facebook API error');
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      } 
    });
  }

  try {
    const { action, question, postId, commentId } = await req.json();

    // Auto-reply to comments with learning
    if (action === 'auto-reply-learn') {
      if (!postId) {
        throw new Error('postId required');
      }
      
      const comments = await getComments(postId);
      const replies = [];
      
      for (const comment of comments.data || []) {
        const commentText = comment.message || '';
        
        // Skip if already replied (check for replies)
        if (comment.comment_count > 0) continue;
        
        // Generate intelligent reply
        const replyText = await generateReply(commentText);
        
        try {
          const reply = await replyToComment(comment.id, replyText);
          replies.push({ 
            commentId: comment.id, 
            question: commentText,
            reply: replyText,
            success: true
          });
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          replies.push({ 
            commentId: comment.id, 
            question: commentText,
            error: err.message,
            success: false
          });
        }
      }
      
      return new Response(JSON.stringify({ success: true, replies }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Answer a single question (for testing)
    if (action === 'answer-question') {
      if (!question) {
        throw new Error('question required');
      }
      
      const answer = await generateReply(question);
      return new Response(JSON.stringify({ success: true, question, answer }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Reply to specific comment
    if (action === 'reply') {
      if (!commentId || !question) {
        throw new Error('commentId and question required');
      }
      
      const answer = await generateReply(question);
      const result = await replyToComment(commentId, answer);
      
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { 
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});

