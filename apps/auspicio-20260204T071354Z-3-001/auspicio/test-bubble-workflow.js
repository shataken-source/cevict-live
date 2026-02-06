// Test script to submit a bubble and test the workflow
const http = require('http');

const BASE_URL = 'http://localhost:3009';

async function waitForServer(maxRetries = 10, delay = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await makeRequest('GET', '/api/bubble/create');
      return true;
    } catch (e) {
      if (i < maxRetries - 1) {
        console.log(`   Waiting for server... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error('Server is not running. Please start it with: pnpm --filter auspicio dev');
      }
    }
  }
}

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3009,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testBubbleWorkflow() {
  console.log('🧪 Starting bubble workflow test...\n');
  console.log('⏳ Checking if server is running...\n');

  try {
    await waitForServer();
    console.log('✅ Server is running!\n');
    // Step 1: Create a test bubble
    console.log('1️⃣ Creating test bubble...');
    const createResponse = await makeRequest('POST', '/api/bubble/create', {
      name: 'Test Bubble Workflow',
      description: 'Testing complete workflow from USER to VALIDATOR',
      agents: ['USER', 'ARCHITECT', 'ENGINEER', 'VALIDATOR']
    });

    if (!createResponse.data.success) {
      throw new Error('Failed to create bubble: ' + JSON.stringify(createResponse.data));
    }

    const bubbleId = createResponse.data.bubble.id;
    console.log('✅ Bubble created:', bubbleId);
    console.log('   Name:', createResponse.data.bubble.name);
    console.log('   Agents:', createResponse.data.bubble.agents.join(', '));
    console.log('');

    // Step 2: Send message from USER to ARCHITECT
    console.log('2️⃣ Sending message from USER to ARCHITECT...');
    const userMessage = await makeRequest('POST', '/api/bubble/message', {
      bubbleId: bubbleId,
      fromAgent: 'USER',
      toAgent: 'ARCHITECT',
      messageType: 'request',
      payload: {
        task: 'Create a contact form with validation and email notifications'
      }
    });

    if (!userMessage.data.success) {
      throw new Error('Failed to send USER message: ' + JSON.stringify(userMessage.data));
    }

    console.log('✅ USER message sent');
    console.log('   Message ID:', userMessage.data.message.id);
    console.log('   Response:', userMessage.data.message.response.substring(0, 100) + '...');
    console.log('   Confidence:', userMessage.data.message.confidence);
    console.log('');

    // Step 3: Send message from ARCHITECT to ENGINEER
    console.log('3️⃣ Sending message from ARCHITECT to ENGINEER...');
    const architectMessage = await makeRequest('POST', '/api/bubble/message', {
      bubbleId: bubbleId,
      fromAgent: 'ARCHITECT',
      toAgent: 'ENGINEER',
      messageType: 'request',
      payload: {
        task: 'Implement the contact form component with React, styled-components, form validation, and email notification integration'
      }
    });

    if (!architectMessage.data.success) {
      throw new Error('Failed to send ARCHITECT message: ' + JSON.stringify(architectMessage.data));
    }

    console.log('✅ ARCHITECT message sent');
    console.log('   Message ID:', architectMessage.data.message.id);
    console.log('   Files generated:', architectMessage.data.message.generatedFiles?.length || 0);
    console.log('');

    // Step 4: Send message from ENGINEER to VALIDATOR
    console.log('4️⃣ Sending message from ENGINEER to VALIDATOR...');
    const engineerMessage = await makeRequest('POST', '/api/bubble/message', {
      bubbleId: bubbleId,
      fromAgent: 'ENGINEER',
      toAgent: 'VALIDATOR',
      messageType: 'response',
      payload: {
        task_id: 'task-1',
        task: 'Review this implementation code',
        response: 'Contact form component implemented with validation',
        code_snippet: '// Contact form code here',
        status: 'completed'
      }
    });

    if (!engineerMessage.data.success) {
      throw new Error('Failed to send ENGINEER message: ' + JSON.stringify(engineerMessage.data));
    }

    console.log('✅ ENGINEER message sent');
    console.log('   Message ID:', engineerMessage.data.message.id);
    console.log('');

    // Step 5: Process the bubble
    console.log('5️⃣ Processing bubble through workflow...');
    const processResponse = await makeRequest('POST', '/api/bubble/process', {
      bubbleId: bubbleId
    });

    if (!processResponse.data.success) {
      throw new Error('Failed to process bubble: ' + JSON.stringify(processResponse.data));
    }

    console.log('✅ Bubble processed');
    console.log('   Status:', processResponse.data.processing.status);
    console.log('   Processing time:', processResponse.data.processing.processingTime);
    console.log('   Agents involved:', processResponse.data.processing.agentsInvolved.join(', '));
    console.log('   Confidence:', processResponse.data.processing.result.confidence);
    console.log('   Recommendations:', processResponse.data.processing.result.recommendations.length);
    console.log('');

    // Step 6: Retrieve all messages
    console.log('6️⃣ Retrieving all messages...');
    const messagesResponse = await makeRequest('GET', `/api/bubble/message?bubbleId=${bubbleId}`);

    if (!messagesResponse.data.success) {
      throw new Error('Failed to retrieve messages: ' + JSON.stringify(messagesResponse.data));
    }

    console.log('✅ Messages retrieved');
    console.log('   Total messages:', messagesResponse.data.messages.length);
    console.log('   Message flow:');
    messagesResponse.data.messages.forEach((msg, idx) => {
      console.log(`   ${idx + 1}. ${msg.fromAgent} → ${msg.toAgent || 'N/A'} (${msg.messageType})`);
    });
    console.log('');

    // Step 7: Verify output data
    console.log('7️⃣ Verifying output data...');
    const hasUserMessage = messagesResponse.data.messages.some(m => m.fromAgent === 'USER');
    const hasArchitectMessage = messagesResponse.data.messages.some(m => m.fromAgent === 'ARCHITECT');
    const hasEngineerMessage = messagesResponse.data.messages.some(m => m.fromAgent === 'ENGINEER');
    const hasProcessingResult = processResponse.data.processing && processResponse.data.processing.result;

    console.log('   ✓ USER message:', hasUserMessage ? '✅' : '❌');
    console.log('   ✓ ARCHITECT message:', hasArchitectMessage ? '✅' : '❌');
    console.log('   ✓ ENGINEER message:', hasEngineerMessage ? '✅' : '❌');
    console.log('   ✓ Processing result:', hasProcessingResult ? '✅' : '❌');
    console.log('   ✓ Usable data output:', hasProcessingResult && processResponse.data.processing.result.recommendations ? '✅' : '❌');
    console.log('');

    // Summary
    console.log('📊 Test Summary:');
    console.log('   Bubble ID:', bubbleId);
    console.log('   Messages sent:', messagesResponse.data.messages.length);
    console.log('   Workflow status:', processResponse.data.processing.status);
    console.log('   All checks passed:', hasUserMessage && hasArchitectMessage && hasEngineerMessage && hasProcessingResult ? '✅' : '❌');
    console.log('');

    if (hasUserMessage && hasArchitectMessage && hasEngineerMessage && hasProcessingResult) {
      console.log('✅ WORKFLOW TEST PASSED - All steps completed successfully!');
      console.log('');
      console.log('📋 Final Output Data:');
      console.log(JSON.stringify(processResponse.data.processing.result, null, 2));
      return true;
    } else {
      console.log('❌ WORKFLOW TEST FAILED - Some steps did not complete');
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    return false;
  }
}

// Run the test
testBubbleWorkflow().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

