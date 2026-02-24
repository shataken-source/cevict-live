/**
 * PET IMAGE PROCESSOR
 * Downloads images, uploads to Supabase Storage, and generates vectors
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface ProcessedImage {
  originalUrl: string;
  supabaseUrl: string;
  vector: number[] | null;
  width: number;
  height: number;
  size: number;
}

/**
 * Download image from URL
 */
async function downloadImage(imageUrl: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    return Buffer.from(response.data);
  } catch (error: any) {
    console.error(`[Image Processor] Failed to download ${imageUrl}:`, error.message);
    return null;
  }
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToSupabaseStorage(
  imageBuffer: Buffer,
  petId: string,
  imageIndex: number,
  mimeType: string = 'image/jpeg'
): Promise<string | null> {
  if (!supabase) return null;
  
  try {
    const fileExt = mimeType.includes('png') ? 'png' : 'jpeg';
    const fileName = `${petId}/${imageIndex}-${Date.now()}.${fileExt}`;
    const bucket = 'pet-images';
    
    // Ensure bucket exists (create if needed)
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find(b => b.name === bucket)) {
      await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
      });
    }
    
    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        upsert: false
      });
    
    if (error) {
      console.error(`[Image Processor] Upload error:`, error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  } catch (error: any) {
    console.error(`[Image Processor] Upload failed:`, error.message);
    return null;
  }
}

/**
 * Generate 512-point vector using AWS Rekognition, Google Vision, or OpenAI CLIP
 */
async function generateImageVector(imageBuffer: Buffer): Promise<number[] | null> {
  // Try OpenAI CLIP first (best for embeddings)
  if (process.env.OPENAI_API_KEY) {
    try {
      const vector = await generateVectorWithOpenAICLIP(imageBuffer);
      if (vector) return vector;
    } catch (error) {
      console.warn('[Image Processor] OpenAI CLIP failed, trying Rekognition');
    }
  }
  
  // Try AWS Rekognition
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
      const vector = await generateVectorWithRekognition(imageBuffer);
      if (vector) return vector;
    } catch (error) {
      console.warn('[Image Processor] Rekognition failed, trying Vision API');
    }
  }
  
  // Fallback to Google Vision API
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_VISION_API_KEY) {
    try {
      const vector = await generateVectorWithVisionAPI(imageBuffer);
      if (vector) return vector;
    } catch (error) {
      console.error('[Image Processor] Vision API failed:', error);
    }
  }
  
  console.warn('[Image Processor] No vector generation service available');
  return null;
}

/**
 * Generate vector using OpenAI CLIP (best for image embeddings)
 */
async function generateVectorWithOpenAICLIP(imageBuffer: Buffer): Promise<number[] | null> {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    
    // Use OpenAI's image embedding (if available) or vision model
    // Note: OpenAI doesn't have a direct embedding endpoint for images,
    // so we'll use a workaround with the vision model
    
    // For now, use a simplified approach - in production, use a dedicated
    // image embedding service or AWS Rekognition Custom Labels
    
    // Alternative: Use OpenAI to describe image, then embed the description
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this pet in detail for matching purposes. Focus on distinctive features, colors, markings, size, and breed characteristics.' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }],
      max_tokens: 200
    });
    
    const description = response.choices[0].message.content || '';
    
    // Embed the description using text-embedding-3-small (512 dimensions)
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: description,
      dimensions: 512
    });
    
    return embeddingResponse.data[0].embedding;
  } catch (error: any) {
    console.error('[Image Processor] OpenAI CLIP error:', error.message);
    return null;
  }
}

/**
 * Generate vector using AWS Rekognition
 */
async function generateVectorWithRekognition(imageBuffer: Buffer): Promise<number[] | null> {
  try {
    const AWS = require('aws-sdk');
    const rekognition = new AWS.Rekognition({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
    
    // Use DetectLabels to get features, then convert to vector
    // Note: Rekognition doesn't directly return vectors, so we'll use labels as features
    const params = {
      Image: { Bytes: imageBuffer },
      MaxLabels: 50,
      MinConfidence: 50
    };
    
    const result = await rekognition.detectLabels(params).promise();
    
    // Convert labels to 512-point vector
    // This is a simplified approach - in production, use Rekognition Custom Labels or
    // a dedicated embedding model
    const vector = new Array(512).fill(0);
    
    // Use label confidence scores to populate vector
    result.Labels?.forEach((label: any, index: number) => {
      if (index < 512) {
        vector[index] = label.Confidence / 100; // Normalize to 0-1
      }
    });
    
    // Fill remaining with image metadata (simplified)
    if (result.Labels && result.Labels.length > 0) {
      const avgConfidence = result.Labels.reduce((sum: number, l: any) => sum + l.Confidence, 0) / result.Labels.length;
      for (let i = result.Labels.length; i < 512; i++) {
        vector[i] = avgConfidence / 100;
      }
    }
    
    return vector;
  } catch (error: any) {
    console.error('[Image Processor] Rekognition error:', error.message);
    return null;
  }
}

/**
 * Generate vector using Google Vision API
 */
async function generateVectorWithVisionAPI(imageBuffer: Buffer): Promise<number[] | null> {
  try {
    const vision = require('@google-cloud/vision');
    
    // Initialize client
    let client;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      client = new vision.ImageAnnotatorClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
    } else if (process.env.GOOGLE_VISION_API_KEY) {
      client = new vision.ImageAnnotatorClient({
        apiKey: process.env.GOOGLE_VISION_API_KEY
      });
    } else {
      return null;
    }
    
    // Detect labels
    const [result] = await client.labelDetection({
      image: { content: imageBuffer }
    });
    
    const labels = result.labelAnnotations || [];
    
    // Convert to 512-point vector
    const vector = new Array(512).fill(0);
    
    labels.forEach((label: any, index: number) => {
      if (index < 512) {
        vector[index] = label.score || 0;
      }
    });
    
    // Fill remaining with average score
    if (labels.length > 0) {
      const avgScore = labels.reduce((sum: number, l: any) => sum + (l.score || 0), 0) / labels.length;
      for (let i = labels.length; i < 512; i++) {
        vector[i] = avgScore;
      }
    }
    
    return vector;
  } catch (error: any) {
    console.error('[Image Processor] Vision API error:', error.message);
    return null;
  }
}

/**
 * Process a single image: download, upload, generate vector
 */
export async function processPetImage(
  imageUrl: string,
  petId: string,
  imageIndex: number
): Promise<ProcessedImage | null> {
  if (!supabase) {
    console.error('[Image Processor] Supabase not configured');
    return null;
  }
  
  // Download image
  const imageBuffer = await downloadImage(imageUrl);
  if (!imageBuffer) {
    return null;
  }
  
  // Get image dimensions (simplified - would need image library)
  const size = imageBuffer.length;
  
  // Upload to Supabase Storage
  const supabaseUrl = await uploadToSupabaseStorage(imageBuffer, petId, imageIndex);
  if (!supabaseUrl) {
    console.error('[Image Processor] Failed to upload image');
    return null;
  }
  
  // Generate vector
  const vector = await generateImageVector(imageBuffer);
  
  return {
    originalUrl: imageUrl,
    supabaseUrl,
    vector,
    width: 0, // Would need image library to get actual dimensions
    height: 0,
    size
  };
}

/**
 * Process multiple images for a pet
 */
export async function processPetImages(
  imageUrls: string[],
  petId: string
): Promise<ProcessedImage[]> {
  const processed: ProcessedImage[] = [];
  
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    if (!imageUrl) continue;
    
    try {
      const processedImage = await processPetImage(imageUrl, petId, i);
      if (processedImage) {
        processed.push(processedImage);
      }
    } catch (error: any) {
      console.error(`[Image Processor] Failed to process image ${i}:`, error.message);
    }
  }
  
  return processed;
}

