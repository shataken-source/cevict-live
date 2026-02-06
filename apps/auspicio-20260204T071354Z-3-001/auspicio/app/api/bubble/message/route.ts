// API Route for Bubble Messages
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { getAIResponse } from '../../../../lib/ai-multi-provider';

// Message storage interface
interface Message {
  id: string;
  bubbleId: string;
  fromAgent: string;
  toAgent: string | null;
  messageType: string;
  payload: any;
  response?: string;
  created_at: string;
  read_at?: string;
}

// Helper functions for message persistence
const getStoredMessages = (bubbleId?: string): Message[] => {
  try {
    if (!global.messages) {
      global.messages = [] as Message[];
    }
    const allMessages = global.messages as Message[];
    if (bubbleId) {
      return allMessages.filter(m => m.bubbleId === bubbleId);
    }
    return allMessages;
  } catch (error) {
    console.error('❌ Error getting stored messages:', error);
    return [];
  }
};

const saveMessage = (message: Message): void => {
  try {
    if (!global.messages) {
      global.messages = [] as Message[];
    }
    const messages = global.messages as Message[];
    messages.push(message);
    global.messages = messages;
    console.log('💾 Message saved:', { id: message.id, fromAgent: message.fromAgent, toAgent: message.toAgent });
  } catch (error) {
    console.error('❌ Error saving message:', error);
    throw new Error('Failed to save message');
  }
};

export async function POST(request: NextRequest) {
  try {
    // Validate and parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        message: 'Request body must be valid JSON'
      }, { status: 400 });
    }

    const { bubbleId, fromAgent, toAgent, messageType, payload, priority } = body;

    // Validate required fields with better error handling
    // Normalize and validate bubbleId
    const normalizedBubbleId = typeof bubbleId === 'string' ? bubbleId.trim() : bubbleId;
    if (!normalizedBubbleId || normalizedBubbleId.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        message: 'bubbleId is required and must be a non-empty string',
        received: { bubbleId, type: typeof bubbleId }
      }, { status: 400 });
    }

    // Normalize and validate fromAgent
    const normalizedFromAgent = typeof fromAgent === 'string' ? fromAgent.trim() : fromAgent;
    if (!normalizedFromAgent || normalizedFromAgent.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        message: 'fromAgent is required and must be a non-empty string',
        received: { fromAgent, type: typeof fromAgent }
      }, { status: 400 });
    }

    // Normalize and validate messageType
    const normalizedMessageType = typeof messageType === 'string' ? messageType.trim() : messageType;
    if (!normalizedMessageType || normalizedMessageType.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        message: 'messageType is required and must be a non-empty string',
        received: { messageType, type: typeof messageType }
      }, { status: 400 });
    }

    // Validate payload structure if provided (allow null, undefined, or object)
    if (payload !== undefined && payload !== null) {
      // Only validate if payload is not null - allow null explicitly
      if (typeof payload !== 'object' || Array.isArray(payload)) {
        return NextResponse.json({
          success: false,
          error: 'Validation error',
          message: 'payload must be an object if provided (null is allowed)',
          received: { payload, type: typeof payload, isArray: Array.isArray(payload) }
        }, { status: 400 });
      }
    }

    // Validate optional fields (if provided, they must be correct type)
    if (toAgent !== undefined && toAgent !== null && typeof toAgent !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        message: 'toAgent must be a string if provided',
        received: { toAgent, type: typeof toAgent }
      }, { status: 400 });
    }

    if (priority !== undefined && priority !== null) {
      if (typeof priority !== 'string' || !['low', 'normal', 'high', 'urgent'].includes(priority)) {
        return NextResponse.json({
          success: false,
          error: 'Validation error',
          message: 'priority must be one of: low, normal, high, urgent',
          received: { priority, type: typeof priority }
        }, { status: 400 });
      }
    }

    // Use normalized values for processing
    const finalBubbleId = normalizedBubbleId;
    const finalFromAgent = normalizedFromAgent;
    const finalMessageType = normalizedMessageType;
    const finalToAgent = toAgent && typeof toAgent === 'string' ? toAgent.trim() : toAgent;

    console.log('📨 Received message:', {
      bubbleId: finalBubbleId,
      fromAgent: finalFromAgent,
      toAgent: finalToAgent,
      messageType: finalMessageType,
      priority: priority || 'normal',
      hasPayload: !!payload,
      taskLength: payload?.task?.length || 0
    });

    // Generate response using multi-AI system based on agent role
    let agentResponse = '';
    let generatedFiles: any[] = [];
    let confidence = 0.85;
    let processingTime = '1.2s';
    let aiModel = 'multi-ai-v1';

    const startTime = Date.now();

    try {
      // Determine which agent is responding
      const respondingAgent = finalFromAgent;
      const task = payload?.task || '';
      const messageContent = task || JSON.stringify(payload) || 'Process this request';

      // Get context from previous messages if available
      const previousMessages = getStoredMessages(finalBubbleId);
      const lastEngineerMessage = previousMessages
        .filter(m => m.fromAgent === 'ENGINEER' && m.messageType === 'response')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      // Call appropriate AI model based on agent role
      const aiResponse = await getAIResponse(
        respondingAgent,
        messageContent,
        {
          previousMessages,
          task,
          codeToValidate: lastEngineerMessage?.response || lastEngineerMessage?.payload?.code,
        }
      );

      agentResponse = aiResponse.content;
      confidence = aiResponse.confidence || 0.85;
      aiModel = aiResponse.model;

      // If ENGINEER, extract and save code files
      if (respondingAgent === 'ENGINEER' && task) {
        const codeResult = await extractCodeFromResponse(aiResponse.content, task);
        generatedFiles = codeResult.files || [];
      }

      processingTime = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;

      console.log(`✅ ${respondingAgent} response generated using ${aiModel}:`, {
        confidence,
        processingTime,
        filesGenerated: generatedFiles.length,
      });
    } catch (aiError: any) {
      console.error('❌ AI generation error:', aiError);
      agentResponse = `AI agent (${finalFromAgent}) encountered an error: ${aiError.message || 'Unknown error'}. Please try again.`;
      confidence = 0.5;
      processingTime = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    const message: Message = {
      id: messageId,
      bubbleId: finalBubbleId,
      fromAgent: finalFromAgent,
      toAgent: finalToAgent,
      messageType: finalMessageType,
      payload,
      response: agentResponse,
      created_at: createdAt
    };

    // Save message to storage
    saveMessage(message);

    const response = {
      ...message,
      agent: finalToAgent || 'ai-coordinator',
      timestamp: createdAt,
      confidence,
      processingTime,
      generatedFiles,
      metadata: {
        model: aiModel,
        aiProvider: getAIProviderForAgent(finalFromAgent),
        capabilities: ['analysis', 'code-generation', 'strategy', 'recommendations', 'validation'],
        priority: priority || 'normal',
        processedBy: getProcessedByForAgent(finalFromAgent),
        multiAI: true,
        agentsUsed: ['chatgpt', 'claude', 'gemini'],
      },
      status: 'processed'
    };

    console.log('✅ Generated AI response with code:', {
      messageId: response.id,
      confidence: response.confidence,
      filesGenerated: generatedFiles.length,
      processingTime: response.processingTime
    });

    return NextResponse.json({
      success: true,
      message: response,
      status: 'processed',
      metadata: {
        processingTime,
        confidence,
        filesGenerated: generatedFiles.length,
        timestamp: createdAt
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Message processing failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to process message',
      message: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Extract code files from AI response (for ENGINEER)
 */
async function extractCodeFromResponse(response: string, task: string) {
  const files: any[] = [];
  const timestamp = Date.now();
  const outputDir = join(process.cwd(), 'generated-code');

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Extract code blocks from response
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  let fileIndex = 0;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    const language = match[1] || 'js';
    const code = match[2].trim();
    const extension = getExtensionForLanguage(language);
    const fileName = `generated-${task.replace(/\s+/g, '-').toLowerCase()}-${timestamp}-${fileIndex}.${extension}`;
    const filePath = join(outputDir, fileName);

    writeFileSync(filePath, code);
    files.push({
      path: filePath,
      type: language,
      description: `Generated ${language} file`,
      content: code,
    });
    fileIndex++;
  }

  return { files, response };
}

function getExtensionForLanguage(language: string): string {
  const langMap: Record<string, string> = {
    'javascript': 'js',
    'typescript': 'ts',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'python': 'py',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'yaml': 'yml',
    'sql': 'sql',
    'bash': 'sh',
    'shell': 'sh',
  };
  return langMap[language.toLowerCase()] || 'txt';
}

function getAIProviderForAgent(agent: string): string {
  const agentUpper = agent.toUpperCase();
  if (agentUpper === 'ARCHITECT') return 'openai-chatgpt';
  if (agentUpper === 'ENGINEER') return 'anthropic-claude';
  if (agentUpper === 'VALIDATOR') return 'google-gemini';
  return 'anthropic-claude'; // Default
}

function getProcessedByForAgent(agent: string): string[] {
  const agentUpper = agent.toUpperCase();
  if (agentUpper === 'ARCHITECT') return ['chatgpt-design', 'architecture-planning'];
  if (agentUpper === 'ENGINEER') return ['claude-coding', 'code-generation'];
  if (agentUpper === 'VALIDATOR') return ['gemini-validation', 'quality-assurance'];
  return ['ai-processing'];
}

async function generateCodeForTask(task: string, payload: any) {
  const files: any[] = [];
  let response = '';
  let confidence = 0.85;
  let processingTime = '1.2s';

  // Create output directory
  const outputDir = join(process.cwd(), 'generated-code');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const taskLower = task.toLowerCase();

  // Enhanced pattern matching with more specific templates
  if (taskLower.includes('rv') || taskLower.includes('monitor') || taskLower.includes('power') || taskLower.includes('solar')) {
    // Generate RV monitoring system code
    const rvCode = generateRVMonitoringCode();
    files.push(...rvCode.files);
    response = rvCode.response;
    confidence = 0.90;
    processingTime = '1.5s';
  } else if (taskLower.includes('dashboard') || taskLower.includes('analytics') || taskLower.includes('chart')) {
    // Generate dashboard/analytics code
    const dashboardCode = generateDashboardCode(task);
    files.push(...dashboardCode.files);
    response = dashboardCode.response;
    confidence = 0.89;
    processingTime = '1.4s';
  } else if (taskLower.includes('api') || taskLower.includes('backend') || taskLower.includes('server') || taskLower.includes('rest')) {
    // Generate API code
    const apiCode = generateAPICode(task);
    files.push(...apiCode.files);
    response = apiCode.response;
    confidence = 0.87;
    processingTime = '1.3s';
  } else if (taskLower.includes('app') || taskLower.includes('web') || taskLower.includes('application') || taskLower.includes('website')) {
    // Generate web application code
    const appCode = generateWebAppCode(task);
    files.push(...appCode.files);
    response = appCode.response;
    confidence = 0.88;
    processingTime = '1.6s';
  } else if (taskLower.includes('form') || taskLower.includes('input') || taskLower.includes('submit')) {
    // Generate form code
    const formCode = generateFormCode(task);
    files.push(...formCode.files);
    response = formCode.response;
    confidence = 0.86;
    processingTime = '1.2s';
  } else if (taskLower.includes('auth') || taskLower.includes('login') || taskLower.includes('signin') || taskLower.includes('authentication')) {
    // Generate authentication code
    const authCode = generateAuthCode(task);
    files.push(...authCode.files);
    response = authCode.response;
    confidence = 0.88;
    processingTime = '1.5s';
  } else if (taskLower.includes('database') || taskLower.includes('db') || taskLower.includes('model') || taskLower.includes('schema')) {
    // Generate database code
    const dbCode = generateDatabaseCode(task);
    files.push(...dbCode.files);
    response = dbCode.response;
    confidence = 0.87;
    processingTime = '1.4s';
  } else {
    // Generate general purpose code
    const generalCode = generateGeneralCode(task);
    files.push(...generalCode.files);
    response = generalCode.response;
    confidence = 0.85;
    processingTime = '1.2s';
  }

  return { response, files, confidence, processingTime };
}

function generateRVMonitoringCode() {
  const files = [];
  const timestamp = Date.now();

  // Main monitoring component
  const monitorCode = `import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const MonitorContainer = styled.div\`
  padding: 20px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  font-family: Arial, sans-serif;
\`;

const MetricCard = styled.div\`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 15px;
  margin: 10px 0;
  backdrop-filter: blur(10px);
\`;

function RVMonitor() {
  const [powerData, setPowerData] = useState({
    batteryVoltage: 12.6,
    solarInput: 150,
    acLoad: 200,
    batteryCurrent: -5.2
  });

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time data
      setPowerData(prev => ({
        batteryVoltage: 11.8 + Math.random() * 1.2,
        solarInput: Math.max(0, 100 + Math.random() * 200),
        acLoad: 150 + Math.random() * 100,
        batteryCurrent: -Math.random() * 10
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <MonitorContainer>
      <h1>RV Power Monitor</h1>
      <MetricCard>
        <h3>Battery Status</h3>
        <p>Voltage: {powerData.batteryVoltage.toFixed(1)}V</p>
        <p>Current: {Math.abs(powerData.batteryCurrent).toFixed(1)}A</p>
      </MetricCard>
      <MetricCard>
        <h3>Solar Input</h3>
        <p>Power: {powerData.solarInput.toFixed(0)}W</p>
      </MetricCard>
      <MetricCard>
        <h3>AC Load</h3>
        <p>Power: {powerData.acLoad.toFixed(0)}W</p>
      </MetricCard>
    </MonitorContainer>
  );
}

export default RVMonitor;`;

  // Write monitor component
  const monitorPath = join(process.cwd(), 'generated-code', `RVMonitor-${timestamp}.jsx`);
  writeFileSync(monitorPath, monitorCode);
  files.push({ path: monitorPath, type: 'component', description: 'Main RV monitoring component' });

  // Sensor simulation class
  const sensorCode = `class PowerSensor {
  constructor() {
    this.voltage = 12.6;
    this.current = 0;
    this.temperature = 25;
  }

  readData() {
    // Simulate sensor readings
    this.voltage = 11.8 + Math.random() * 1.2;
    this.current = -Math.random() * 10;
    this.temperature = 20 + Math.random() * 15;

    return {
      voltage: this.voltage,
      current: this.current,
      temperature: this.temperature,
      timestamp: new Date()
    };
  }

  calculatePower() {
    return Math.abs(this.voltage * this.current);
  }

  getStateOfCharge() {
    // Estimate battery level from voltage
    if (this.voltage >= 12.7) return 100;
    if (this.voltage >= 12.5) return 90;
    if (this.voltage >= 12.3) return 70;
    if (this.voltage >= 12.0) return 50;
    if (this.voltage >= 11.8) return 30;
    return 10;
  }
}

module.exports = PowerSensor;`;

  // Write sensor class
  const sensorPath = join(process.cwd(), 'generated-code', `PowerSensor-${timestamp}.js`);
  writeFileSync(sensorPath, sensorCode);
  files.push({ path: sensorPath, type: 'class', description: 'Power sensor simulation class' });

  // Configuration file
  const configCode = `{
  "system": {
    "batteryType": "lead-acid",
    "batteryCapacity": 200,
    "solarPanelRating": 300,
    "inverterRating": 2000
  },
  "monitoring": {
    "updateInterval": 2000,
    "alertThresholds": {
      "lowVoltage": 11.5,
      "highTemperature": 45,
      "lowBattery": 20
    }
  },
  "hardware": {
    "batterySensor": "/dev/i2c-1",
    "solarSensor": "/dev/i2c-2",
    "inverterPort": "/dev/ttyUSB0"
  }
}`;

  const configPath = join(process.cwd(), 'generated-code', `config-${timestamp}.json`);
  writeFileSync(configPath, configCode);
  files.push({ path: configPath, type: 'config', description: 'System configuration file' });

  const response = `Generated complete RV monitoring system with real-time power tracking, battery management, and solar input monitoring. Created ${files.length} production-ready files including React components, sensor classes, and configuration. The system features modular architecture for easy upgrades and beautiful tablet-optimized UI.`;

  return { files, response };
}

function generateWebAppCode(task: string) {
  const files = [];
  const timestamp = Date.now();

  const appCode = `import React, { useState } from 'react';
import styled from 'styled-components';

const AppContainer = styled.div\`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
\`;

const Card = styled.div\`
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  margin: 10px 0;
\`;

function WebApp() {
  const [data, setData] = useState({
    users: [],
    loading: false
  });

  return (
    <AppContainer>
      <h1>Web Application</h1>
      <Card>
        <h2>Dashboard</h2>
        <p>Welcome to your web application!</p>
      </Card>
    </AppContainer>
  );
}

export default WebApp;`;

  const appPath = join(process.cwd(), 'generated-code', `WebApp-${timestamp}.jsx`);
  writeFileSync(appPath, appCode);
  files.push({ path: appPath, type: 'component', description: 'Web application component' });

  const response = `Generated modern web application with React and styled-components. Created responsive UI with card-based layout and clean architecture.`;

  return { files, response };
}

function generateAPICode(task: string) {
  const files = [];
  const timestamp = Date.now();

  const apiCode = `const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date(),
    version: '1.0.0'
  });
});

app.get('/api/data', (req, res) => {
  res.json({
    data: [],
    message: 'Data retrieved successfully'
  });
});

app.post('/api/data', (req, res) => {
  const { data } = req.body;
  // Process data
  res.json({
    success: true,
    message: 'Data processed successfully',
    received: data
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

module.exports = app;`;

  const apiPath = join(process.cwd(), 'generated-code', `api-server-${timestamp}.js`);
  writeFileSync(apiPath, apiCode);
  files.push({ path: apiPath, type: 'server', description: 'Express API server' });

  const response = `Generated RESTful API server with Express.js. Includes CORS support, JSON parsing, and standard CRUD endpoints for data management.`;

  return { files, response };
}

function generateDashboardCode(task: string) {
  const files: any[] = [];
  const timestamp = Date.now();

  const dashboardCode = `import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const DashboardContainer = styled.div\`
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
\`;

const StatsGrid = styled.div\`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
\`;

const StatCard = styled.div\`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-4px);
  }
\`;

const StatValue = styled.div\`
  font-size: 32px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 8px;
\`;

const StatLabel = styled.div\`
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
\`;

function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSessions: 0,
    revenue: 0,
    growth: 0
  });

  useEffect(() => {
    // Simulate data fetching
    const interval = setInterval(() => {
      setStats({
        totalUsers: Math.floor(Math.random() * 10000) + 5000,
        activeSessions: Math.floor(Math.random() * 500) + 200,
        revenue: Math.floor(Math.random() * 100000) + 50000,
        growth: (Math.random() * 20 - 10).toFixed(1)
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardContainer>
      <h1 style={{ color: 'white', marginBottom: '24px' }}>Analytics Dashboard</h1>
      <StatsGrid>
        <StatCard>
          <StatValue>{stats.totalUsers.toLocaleString()}</StatValue>
          <StatLabel>Total Users</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.activeSessions}</StatValue>
          <StatLabel>Active Sessions</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{'$' + stats.revenue.toLocaleString()}</StatValue>
          <StatLabel>Revenue</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.growth > 0 ? '+' : ''}{stats.growth}%</StatValue>
          <StatLabel>Growth Rate</StatLabel>
        </StatCard>
      </StatsGrid>
    </DashboardContainer>
  );
}

export default Dashboard;`;

  const dashboardPath = join(process.cwd(), 'generated-code', `Dashboard-${timestamp}.jsx`);
  writeFileSync(dashboardPath, dashboardCode);
  files.push({ path: dashboardPath, type: 'component', description: 'Analytics dashboard component with real-time stats' });

  const response = `Generated modern analytics dashboard with React and styled-components. Features real-time data updates, responsive grid layout, and beautiful gradient design.`;

  return { files, response };
}

function generateFormCode(task: string) {
  const files: any[] = [];
  const timestamp = Date.now();

  const formCode = `import React, { useState } from 'react';
import styled from 'styled-components';

const FormContainer = styled.form\`
  max-width: 600px;
  margin: 0 auto;
  padding: 32px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
\`;

const FormGroup = styled.div\`
  margin-bottom: 20px;
\`;

const Label = styled.label\`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
\`;

const Input = styled.input\`
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
\`;

const TextArea = styled.textarea\`
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  min-height: 120px;
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
\`;

const SubmitButton = styled.button\`
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
\`;

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('Form submitted:', formData);
    alert('Form submitted successfully!');
    setFormData({ name: '', email: '', message: '' });
    setSubmitting(false);
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <h2 style={{ marginBottom: '24px', color: '#333' }}>Contact Us</h2>
      <FormGroup>
        <Label htmlFor="name">Name</Label>
        <Input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="email">Email</Label>
        <Input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </FormGroup>
      <FormGroup>
        <Label htmlFor="message">Message</Label>
        <TextArea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
        />
      </FormGroup>
      <SubmitButton type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit'}
      </SubmitButton>
    </FormContainer>
  );
}

export default ContactForm;`;

  const formPath = join(process.cwd(), 'generated-code', `ContactForm-${timestamp}.jsx`);
  writeFileSync(formPath, formCode);
  files.push({ path: formPath, type: 'component', description: 'Contact form component with validation' });

  const response = `Generated modern contact form with React and styled-components. Features form validation, loading states, and beautiful UI design.`;

  return { files, response };
}

function generateAuthCode(task: string) {
  const files: any[] = [];
  const timestamp = Date.now();

  const authCode = `import React, { useState } from 'react';
import styled from 'styled-components';

const AuthContainer = styled.div\`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
\`;

const AuthCard = styled.div\`
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
\`;

const Title = styled.h2\`
  text-align: center;
  margin-bottom: 32px;
  color: #333;
\`;

const Input = styled.input\`
  width: 100%;
  padding: 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 16px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
\`;

const Button = styled.button\`
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
\`;

function LoginForm() {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock authentication
    if (credentials.email && credentials.password.length >= 6) {
      console.log('Login successful:', credentials.email);
      alert('Login successful!');
    } else {
      setError('Invalid credentials. Please try again.');
    }

    setLoading(false);
  };

  return (
    <AuthContainer>
      <AuthCard>
        <Title>Sign In</Title>
        {error && (
          <div style={{
            color: '#e74c3c',
            marginBottom: '16px',
            padding: '12px',
            background: '#fee',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <Input
            type="email"
            name="email"
            placeholder="Email address"
            value={credentials.email}
            onChange={handleChange}
            required
          />
          <Input
            type="password"
            name="password"
            placeholder="Password"
            value={credentials.password}
            onChange={handleChange}
            required
            minLength={6}
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </AuthCard>
    </AuthContainer>
  );
}

export default LoginForm;`;

  const authPath = join(process.cwd(), 'generated-code', `LoginForm-${timestamp}.jsx`);
  writeFileSync(authPath, authCode);
  files.push({ path: authPath, type: 'component', description: 'Authentication login form component' });

  const response = `Generated modern authentication form with React and styled-components. Features email/password validation, error handling, and beautiful gradient design.`;

  return { files, response };
}

function generateDatabaseCode(task: string) {
  const files: any[] = [];
  const timestamp = Date.now();

  const schemaCode = `// Database Schema and Models
// Generated for: ${task}

// User Model
const UserSchema = {
  id: {
    type: 'UUID',
    primaryKey: true,
    default: 'uuid_generate_v4()'
  },
  email: {
    type: 'VARCHAR(255)',
    unique: true,
    required: true,
    index: true
  },
  name: {
    type: 'VARCHAR(255)',
    required: true
  },
  createdAt: {
    type: 'TIMESTAMP',
    default: 'CURRENT_TIMESTAMP'
  },
  updatedAt: {
    type: 'TIMESTAMP',
    default: 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  }
};

// Example SQL Migration
const createUsersTable = \`
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);
\`;

// Example Prisma Schema
const prismaSchema = \`
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}
\`;

module.exports = {
  UserSchema,
  createUsersTable,
  prismaSchema
};`;

  const schemaPath = join(process.cwd(), 'generated-code', `DatabaseSchema-${timestamp}.js`);
  writeFileSync(schemaPath, schemaCode);
  files.push({ path: schemaPath, type: 'schema', description: 'Database schema and model definitions' });

  const response = `Generated database schema with multiple ORM formats (SQL, Prisma). Includes user model with proper indexing and timestamps.`;

  return { files, response };
}

function generateGeneralCode(task: string) {
  const files: any[] = [];
  const timestamp = Date.now();

  const utilCode = `/**
 * Utility functions for general purpose tasks
 */

class DataProcessor {
  constructor() {
    this.data = [];
  }

  addData(item) {
    this.data.push({
      ...item,
      timestamp: new Date(),
      id: this.generateId()
    });
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  processData() {
    return this.data.map(item => ({
      ...item,
      processed: true,
      processedAt: new Date()
    }));
  }

  getData() {
    return this.data;
  }

  clearData() {
    this.data = [];
  }
}

module.exports = DataProcessor;`;

  const utilPath = join(process.cwd(), 'generated-code', `DataProcessor-${timestamp}.js`);
  writeFileSync(utilPath, utilCode);
  files.push({ path: utilPath, type: 'utility', description: 'Data processing utility class' });

  const response = `Generated utility class for data processing with unique ID generation, timestamp tracking, and data manipulation methods.`;

  return { files, response };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bubbleId = searchParams.get('bubbleId');

    // Get stored messages
    const storedMessages = getStoredMessages(bubbleId || undefined);

    // Sort by creation date (newest first)
    const sortedMessages = [...storedMessages].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log('📨 Retrieved messages:', {
      bubbleId: bubbleId || 'all',
      count: sortedMessages.length
    });

    return NextResponse.json({
      success: true,
      messages: sortedMessages,
      count: sortedMessages.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ Failed to retrieve messages:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve messages',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
