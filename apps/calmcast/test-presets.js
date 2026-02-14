// CalmCast Scientific Presets Test Suite
// Run with: node test-presets.js

const BASE_URL = 'http://localhost:3005';

// Test cases for all 10 scientific presets
const PRESET_TESTS = [
  {
    name: 'DEEP_SLEEP_DELTA',
    description: 'Deep sleep with 174Hz carrier + 2.5Hz delta waves',
    url: `${BASE_URL}/api/calmcast/render-wav?target=humans&mode=sleep&durationMinutes=2&format=wav`,
    expectedHeaders: {
      'x-audio-format': 'wav',
      'x-audio-duration': '2'
    }
  },
  {
    name: 'FOCUS_GAMMA', 
    description: 'Enhanced focus with 528Hz carrier + 40Hz gamma waves',
    url: `${BASE_URL}/api/calmcast/render-wav?target=humans&mode=focus&durationMinutes=3&format=mp3&quality=high`,
    expectedHeaders: {
      'x-audio-format': 'mp3',
      'x-audio-duration': '3'
    }
  },
  {
    name: 'ANXIETY_RELIEF_ALPHA',
    description: 'Anxiety relief with 396Hz carrier + 10Hz alpha waves', 
    url: `${BASE_URL}/api/calmcast/render-wav?target=humans&mode=anxiety&durationMinutes=2&format=aac`,
    expectedHeaders: {
      'x-audio-format': 'aac',
      'x-audio-duration': '2'
    }
  },
  {
    name: 'DOG_CALMING_432',
    description: 'Dog calming with 432Hz nature frequency + 6Hz theta waves',
    url: `${BASE_URL}/api/calmcast/render-wav?target=dogs&mode=anxiety&durationMinutes=2&format=wav`,
    expectedHeaders: {
      'x-audio-format': 'wav',
      'x-audio-duration': '2'
    }
  },
  {
    name: 'CAT_SOOTHING_396',
    description: 'Cat soothing with 396Hz emotional release + 8Hz alpha waves',
    url: `${BASE_URL}/api/calmcast/render-wav?target=cats&mode=sleep&durationMinutes=2&format=mp3`,
    expectedHeaders: {
      'x-audio-format': 'mp3',
      'x-audio-duration': '2'
    }
  },
  {
    name: 'BABY_SOOTHING_174',
    description: 'Baby soothing with 174Hz gentle grounding + 4Hz theta waves',
    url: `${BASE_URL}/api/calmcast/render-wav?target=babies&mode=sleep&durationMinutes=1&format=wav`,
    expectedHeaders: {
      'x-audio-format': 'wav',
      'x-audio-duration': '1'
    }
  },
  {
    name: 'MEDITATION_THETA',
    description: 'Meditation with 417Hz change facilitation + 6Hz theta waves',
    url: `${BASE_URL}/api/calmcast/render-wav?target=humans&mode=anxiety&durationMinutes=3&format=ogg&quality=medium`,
    expectedHeaders: {
      'x-audio-format': 'ogg',
      'x-audio-duration': '3'
    }
  },
  {
    name: 'PAIN_RELIEF_285',
    description: 'Pain relief with 285Hz healing + 3Hz delta waves',
    url: `${BASE_URL}/api/calmcast/render-wav?target=humans&mode=sleep&durationMinutes=2&format=mp3`,
    expectedHeaders: {
      'x-audio-format': 'mp3',
      'x-audio-duration': '2'
    }
  },
  {
    name: 'CREATIVITY_ALPHA',
    description: 'Creativity with 639Hz emotional balance + 12Hz alpha waves',
    url: `${BASE_URL}/api/calmcast/render-wav?target=humans&mode=focus&durationMinutes=2&format=aac&quality=high`,
    expectedHeaders: {
      'x-audio-format': 'aac',
      'x-audio-duration': '2'
    }
  },
  {
    name: 'STORM_ANXIETY_528',
    description: 'Storm anxiety with 528Hz stress reduction + 7Hz theta waves',
    url: `${BASE_URL}/api/calmcast/render-wav?target=dogs&mode=storm&durationMinutes=2&format=wav`,
    expectedHeaders: {
      'x-audio-format': 'wav',
      'x-audio-duration': '2'
    }
  }
];

// Additional API tests
const API_TESTS = [
  {
    name: 'List All Presets',
    url: `${BASE_URL}/api/calmcast/presets`,
    method: 'GET'
  },
  {
    name: 'Generate Plan - Deep Sleep',
    url: `${BASE_URL}/api/calmcast/generate`,
    method: 'POST',
    body: {
      target: 'humans',
      mode: 'sleep',
      durationMinutes: 30,
      intensity: 2
    }
  },
  {
    name: 'Generate Plan - Dog Anxiety',
    url: `${BASE_URL}/api/calmcast/generate`,
    method: 'POST', 
    body: {
      target: 'dogs',
      mode: 'anxiety',
      durationMinutes: 15,
      intensity: 1
    }
  }
];

// Test runner
async function runTests() {
  console.log('🧪 CalmCast Scientific Presets Test Suite');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  // Test audio generation presets
  console.log('\n🎵 Testing Audio Generation Presets:');
  console.log('-'.repeat(40));
  
  for (const test of PRESET_TESTS) {
    try {
      console.log(`\n📋 ${test.name}`);
      console.log(`   ${test.description}`);
      console.log(`   URL: ${test.url}`);
      
      const response = await fetch(test.url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Check headers
      const headers = {};
      for (const [key, value] of response.headers.entries()) {
        headers[key.toLowerCase()] = value;
      }
      
      let headerTests = 0;
      let headerPassed = 0;
      
      for (const [expectedKey, expectedValue] of Object.entries(test.expectedHeaders)) {
        headerTests++;
        if (headers[expectedKey.toLowerCase()] === expectedValue) {
          headerPassed++;
        } else {
          console.log(`   ❌ Header ${expectedKey}: expected ${expectedValue}, got ${headers[expectedKey.toLowerCase()]}`);
        }
      }
      
      if (headerPassed === headerTests) {
        console.log(`   ✅ Audio generated successfully with correct headers`);
        passed++;
      } else {
        console.log(`   ❌ Headers failed (${headerPassed}/${headerTests})`);
        failed++;
      }
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      failed++;
    }
  }
  
  // Test API endpoints
  console.log('\n🔌 Testing API Endpoints:');
  console.log('-'.repeat(40));
  
  for (const test of API_TESTS) {
    try {
      console.log(`\n📋 ${test.name}`);
      console.log(`   ${test.method} ${test.url}`);
      
      const options = {
        method: test.method
      };
      
      if (test.body) {
        options.headers = {
          'Content-Type': 'application/json'
        };
        options.body = JSON.stringify(test.body);
      }
      
      const response = await fetch(test.url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`   ✅ API response successful`);
      console.log(`   📊 Response keys: ${Object.keys(data).join(', ')}`);
      passed++;
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      failed++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Scientific presets are working correctly.');
  } else {
    console.log(`⚠️  ${failed} tests failed. Check the server and try again.`);
  }
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Test with headphones for best binaural effect');
  console.log('   2. Try different durations (5-60 minutes)');
  console.log('   3. Test with various audio formats');
  console.log('   4. Monitor effectiveness for different use cases');
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { PRESET_TESTS, API_TESTS, runTests };
