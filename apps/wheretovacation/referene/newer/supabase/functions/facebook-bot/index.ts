// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const FACEBOOK_PAGE_TOKEN = Deno.env.get('FACEBOOK_PAGE_TOKEN') || '';
const FACEBOOK_PAGE_ID = Deno.env.get('FACEBOOK_PAGE_ID') || '';

// Post to Facebook Page
async function postToFacebook(message: string, imageUrl?: string) {
  if (!FACEBOOK_PAGE_TOKEN || !FACEBOOK_PAGE_ID) {
    throw new Error('Facebook credentials not configured');
  }

  const url = `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/feed`;
  
  const body: any = {
    message,
    access_token: FACEBOOK_PAGE_TOKEN
  };
  
  if (imageUrl) {
    body.link = imageUrl;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error?.message || 'Facebook API error');
  }
  
  return result;
}

// Reply to comment
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

// Get page comments
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

// Auto-reply logic
function generateAutoReply(commentText: string): string | null {
  const text = commentText.toLowerCase();
  
  // Thanks/thank you
  if (text.includes('thanks') || text.includes('thank')) {
    return 'You\'re welcome! 🎣';
  }
  
  // Questions about how/what
  if (text.includes('how') || text.includes('what') || text.includes('where')) {
    return 'Check out PROGNO at [your URL] for more info!';
  }
  
  // Price/cost questions
  if (text.includes('price') || text.includes('cost') || text.includes('free')) {
    return 'PROGNO is FREE to use! Try it at [your URL]';
  }
  
  // Fishing questions
  if (text.includes('fish') || text.includes('fishing')) {
    return 'PROGNO predicts the best fishing times using moon phases and tides! Try it free: [your URL]';
  }
  
  // General positive
  if (text.includes('great') || text.includes('awesome') || text.includes('love')) {
    return 'Thanks! Glad you like it! 🎣';
  }
  
  return null;
}

serve(async (req) => {
  // CORS headers
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
    const { action, message, postId, commentId, imageUrl, autoReply } = await req.json();

    // Post to Facebook
    if (action === 'post') {
      if (!message) {
        throw new Error('message is required');
      }
      const result = await postToFacebook(message, imageUrl);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Reply to comment
    if (action === 'reply') {
      if (!commentId || !message) {
        throw new Error('commentId and message required');
      }
      const result = await replyToComment(commentId, message);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Get comments
    if (action === 'get-comments') {
      if (!postId) {
        throw new Error('postId required');
      }
      const result = await getComments(postId);
      return new Response(JSON.stringify({ success: true, comments: result.data || [] }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Auto-reply to all comments on a post
    if (action === 'auto-reply') {
      if (!postId) {
        throw new Error('postId required');
      }
      
      const comments = await getComments(postId);
      const replies = [];
      
      for (const comment of comments.data || []) {
        const autoReplyText = generateAutoReply(comment.message || '');
        if (autoReplyText) {
          try {
            const reply = await replyToComment(comment.id, autoReplyText);
            replies.push({ commentId: comment.id, reply });
          } catch (err) {
            replies.push({ commentId: comment.id, error: err.message });
          }
        }
      }
      
      return new Response(JSON.stringify({ success: true, replies }), {
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

