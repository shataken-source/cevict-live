// Test script for visual search API
// Run: tsx test-visual-search.ts

import { readFileSync } from 'fs';
import { join } from 'path';

const TEST_IMAGE_PATH = 'test-pet.jpg'; // Place a test image here

async function testVisualSearch() {
  try {
    // Read test image and convert to base64
    const imageBuffer = readFileSync(TEST_IMAGE_PATH);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

    console.log('🔍 Testing visual search API...');
    console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

    const response = await fetch('http://localhost:3006/api/petreunion/match-by-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: base64Image,
        threshold: 0.60, // Lower threshold for testing
        limit: 5,
        status: 'all',
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Success! Found ${data.count} matches`);
      data.matches.forEach((match: any, i: number) => {
        console.log(`\n${i + 1}. ${match.pet_name} (${match.pet_type})`);
        console.log(`   Similarity: ${(match.similarity * 100).toFixed(1)}%`);
        console.log(`   Location: ${match.location_city}, ${match.location_state}`);
        console.log(`   Status: ${match.status}`);
      });
    } else {
      console.error('❌ Error:', data.error);
    }
  } catch (err: any) {
    console.error('❌ Test failed:', err.message);
  }
}

testVisualSearch();
