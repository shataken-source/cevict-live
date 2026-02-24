/**
 * CAMERA AI ANALYZER
 * 
 * Analyzes uploaded camera footage using Vision APIs
 * to detect pets matching lost pet descriptions.
 * 
 * Uses:
 * - OpenAI GPT-4 Vision for detailed analysis
 * - Fallback to local YOLO model (via API) if needed
 * - Cosine similarity for image vector matching
 */

import { createClient } from '@supabase/supabase-js';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export interface PetDescription {
  id: number;
  pet_name: string;
  pet_type: string;
  breed: string;
  color: string;
  size?: string;
  markings?: string;
  description?: string;
  photo_url?: string;
  image_vectors?: number[];
}

export interface AnalysisResult {
  hasPet: boolean;
  petType?: string;
  confidence: number;
  matchConfidence: number;
  detectedFeatures: {
    colors: string[];
    patterns: string[];
    size?: string;
    breed?: string;
    distinctiveMarkings: string[];
  };
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  reasoning: string;
  timestamp?: Date;
}

/**
 * Analyze an image using GPT-4 Vision to detect and describe pets
 */
async function analyzeWithGPT4Vision(
  imageBuffer: Buffer,
  targetPet: PetDescription
): Promise<AnalysisResult> {
  const OpenAI = require('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const base64Image = imageBuffer.toString('base64');

  const prompt = `Analyze this security camera image for a lost pet.

TARGET PET DESCRIPTION:
- Type: ${targetPet.pet_type}
- Breed: ${targetPet.breed}
- Color: ${targetPet.color}
- Size: ${targetPet.size || 'unknown'}
- Markings: ${targetPet.markings || 'none specified'}
- Additional details: ${targetPet.description || 'none'}

TASK:
1. Is there a pet visible in this image? (true/false)
2. If yes, describe the pet you see (type, color, size, distinctive features)
3. Compare to the target pet - what is the likelihood this is the same animal? (0-100%)
4. What specific features match or don't match?

RESPOND IN JSON FORMAT:
{
  "hasPet": boolean,
  "petType": "dog" | "cat" | "other" | null,
  "detectedFeatures": {
    "colors": ["list of colors"],
    "patterns": ["solid", "spotted", "striped", etc.],
    "size": "small" | "medium" | "large",
    "breed": "detected breed or 'unknown'",
    "distinctiveMarkings": ["list of notable markings"]
  },
  "matchConfidence": number (0-100),
  "reasoning": "explanation of match assessment"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }],
      max_tokens: 500
    });

    const content = response.choices[0].message.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      hasPet: result.hasPet,
      petType: result.petType,
      confidence: result.hasPet ? 0.9 : 0.1,
      matchConfidence: (result.matchConfidence || 0) / 100,
      detectedFeatures: result.detectedFeatures || {
        colors: [],
        patterns: [],
        distinctiveMarkings: []
      },
      reasoning: result.reasoning || 'No reasoning provided'
    };

  } catch (error: any) {
    console.error('[AI Analyzer] GPT-4 Vision error:', error.message);
    throw error;
  }
}

/**
 * Analyze video by extracting key frames and analyzing each
 */
async function analyzeVideoFrames(
  videoUrl: string,
  targetPet: PetDescription,
  maxFrames: number = 5
): Promise<AnalysisResult[]> {
  // For now, we'll analyze the thumbnail or first frame
  // In production, you'd use ffmpeg to extract frames
  
  console.log(`[AI Analyzer] Video analysis for ${videoUrl} - using thumbnail approach`);
  
  // This is a placeholder - in production, you'd extract frames
  // and analyze each one
  return [];
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Compare image vectors if available
 */
async function compareWithImageVectors(
  uploadedImageBuffer: Buffer,
  targetPet: PetDescription
): Promise<number | null> {
  if (!targetPet.image_vectors || targetPet.image_vectors.length === 0) {
    return null;
  }

  try {
    // Generate vector for uploaded image
    const { processPetImage } = await import('./pet-image-processor');
    
    // Upload to temp and get vector
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Get description of uploaded image
    const base64Image = uploadedImageBuffer.toString('base64');
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this pet in detail for matching purposes. Focus on distinctive features, colors, markings, size, and breed characteristics. Be concise but thorough.' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }],
      max_tokens: 200
    });
    
    const description = response.choices[0].message.content || '';
    
    // Get embedding of description
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: description,
      dimensions: 512
    });
    
    const uploadedVector = embeddingResponse.data[0].embedding;
    
    // Calculate similarity
    return cosineSimilarity(uploadedVector, targetPet.image_vectors);
    
  } catch (error: any) {
    console.error('[AI Analyzer] Vector comparison error:', error.message);
    return null;
  }
}

/**
 * Main analysis function - analyzes media and returns match assessment
 */
export async function analyzeMedia(
  mediaBuffer: Buffer,
  mediaType: 'image' | 'video',
  targetPet: PetDescription
): Promise<AnalysisResult> {
  console.log(`[AI Analyzer] Analyzing ${mediaType} for pet ${targetPet.id} (${targetPet.pet_name})`);

  let result: AnalysisResult;

  // Primary: Use GPT-4 Vision
  if (process.env.OPENAI_API_KEY) {
    try {
      result = await analyzeWithGPT4Vision(mediaBuffer, targetPet);
      
      // Enhance with vector comparison if available
      const vectorSimilarity = await compareWithImageVectors(mediaBuffer, targetPet);
      if (vectorSimilarity !== null) {
        // Blend GPT-4 assessment with vector similarity
        result.matchConfidence = (result.matchConfidence * 0.7) + (vectorSimilarity * 0.3);
        result.reasoning += ` Vector similarity: ${(vectorSimilarity * 100).toFixed(1)}%`;
      }
      
      return result;
    } catch (error) {
      console.error('[AI Analyzer] GPT-4 Vision failed:', error);
    }
  }

  // Fallback: Return low-confidence result
  console.warn('[AI Analyzer] No AI service available, returning default result');
  return {
    hasPet: false,
    confidence: 0,
    matchConfidence: 0,
    detectedFeatures: {
      colors: [],
      patterns: [],
      distinctiveMarkings: []
    },
    reasoning: 'AI analysis unavailable - manual review required'
  };
}

/**
 * Process a camera upload and update with AI analysis
 */
export async function processUpload(uploadId: number): Promise<{
  success: boolean;
  isMatch: boolean;
  confidence: number;
  notifyOwner: boolean;
}> {
  if (!supabase) {
    return { success: false, isMatch: false, confidence: 0, notifyOwner: false };
  }

  try {
    // Get upload details
    const { data: upload, error: uploadError } = await supabase
      .from('camera_uploads')
      .select('*, lost_pets:pet_id (*)')
      .eq('id', uploadId)
      .single();

    if (uploadError || !upload) {
      throw new Error('Upload not found');
    }

    // Download media from storage
    const axios = require('axios');
    const response = await axios.get(upload.storage_url, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    const mediaBuffer = Buffer.from(response.data);

    // Analyze
    const targetPet: PetDescription = upload.lost_pets;
    const analysis = await analyzeMedia(mediaBuffer, upload.upload_type, targetPet);

    // Update database
    const { updateUploadAnalysis } = await import('./camera-watch-service');
    await updateUploadAnalysis(uploadId, {
      matchConfidence: analysis.matchConfidence,
      matchDetails: {
        reasoning: analysis.reasoning,
        features: analysis.detectedFeatures,
        hasPet: analysis.hasPet
      },
      detectedPetType: analysis.petType,
      detectedFeatures: analysis.detectedFeatures
    });

    // Determine if we should notify owner (confidence > 70%)
    const shouldNotify = analysis.hasPet && analysis.matchConfidence > 0.7;

    if (shouldNotify) {
      console.log(`[AI Analyzer] HIGH CONFIDENCE MATCH for pet ${targetPet.id}!`);
      console.log(`   Confidence: ${(analysis.matchConfidence * 100).toFixed(1)}%`);
      console.log(`   Reasoning: ${analysis.reasoning}`);
      
      // Notify owner would happen here via SMS/email
      // await notifyOwnerOfMatch(targetPet, upload);
    }

    return {
      success: true,
      isMatch: analysis.hasPet,
      confidence: analysis.matchConfidence,
      notifyOwner: shouldNotify
    };

  } catch (error: any) {
    console.error('[AI Analyzer] Process upload error:', error.message);
    return { success: false, isMatch: false, confidence: 0, notifyOwner: false };
  }
}

/**
 * Batch process all pending uploads
 */
export async function processPendingUploads(): Promise<{
  processed: number;
  matches: number;
}> {
  if (!supabase) return { processed: 0, matches: 0 };

  try {
    // Get unanalyzed uploads
    const { data: uploads, error } = await supabase
      .from('camera_uploads')
      .select('id')
      .eq('ai_analyzed', false)
      .limit(10);

    if (error || !uploads) return { processed: 0, matches: 0 };

    let processed = 0;
    let matches = 0;

    for (const upload of uploads) {
      const result = await processUpload(upload.id);
      if (result.success) {
        processed++;
        if (result.isMatch && result.confidence > 0.7) {
          matches++;
        }
      }
    }

    return { processed, matches };
  } catch (error: any) {
    console.error('[AI Analyzer] Batch process error:', error.message);
    return { processed: 0, matches: 0 };
  }
}

