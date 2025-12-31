import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    // Read current configuration from alpha-hunter
    const configPath = path.join(process.cwd(), '../../apps/alpha-hunter/src/live-trader-24-7.ts');
    const fileContent = fs.readFileSync(configPath, 'utf8');

    // Extract CONFIG values using regex
    const minConfidenceMatch = fileContent.match(/minConfidence:\s*(\d+)/);
    const maxTradeSizeMatch = fileContent.match(/maxTradeSize:\s*(\d+)/);
    const minEdgeMatch = fileContent.match(/minEdge:\s*(\d+\.?\d*)/);
    const dailyLossLimitMatch = fileContent.match(/dailyLossLimit:\s*(\d+)/);
    const dailySpendingLimitMatch = fileContent.match(/dailySpendingLimit:\s*(\d+)/);
    const maxOpenPositionsMatch = fileContent.match(/maxOpenPositions:\s*(\d+)/);

    const config = {
      minConfidence: minConfidenceMatch ? parseInt(minConfidenceMatch[1]) : 50,
      maxTradeSize: maxTradeSizeMatch ? parseInt(maxTradeSizeMatch[1]) : 10,
      minEdge: minEdgeMatch ? parseFloat(minEdgeMatch[1]) : 2,
      dailyLossLimit: dailyLossLimitMatch ? parseInt(dailyLossLimitMatch[1]) : 25,
      dailySpendingLimit: dailySpendingLimitMatch ? parseInt(dailySpendingLimitMatch[1]) : 50,
      maxOpenPositions: maxOpenPositionsMatch ? parseInt(maxOpenPositionsMatch[1]) : 10,
    };

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error: any) {
    console.error('Error reading bot config:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { minConfidence, maxTradeSize, minEdge, dailyLossLimit, dailySpendingLimit, maxOpenPositions } = body;

    // Validate inputs
    if (minConfidence < 0 || minConfidence > 100) {
      return NextResponse.json({ success: false, error: 'minConfidence must be 0-100' }, { status: 400 });
    }

    // Read current file
    const configPath = path.join(process.cwd(), '../../apps/alpha-hunter/src/live-trader-24-7.ts');
    let fileContent = fs.readFileSync(configPath, 'utf8');

    // Update CONFIG values
    if (minConfidence !== undefined) {
      fileContent = fileContent.replace(/minConfidence:\s*\d+/, `minConfidence: ${minConfidence}`);
    }
    if (maxTradeSize !== undefined) {
      fileContent = fileContent.replace(/maxTradeSize:\s*\d+/, `maxTradeSize: ${maxTradeSize}`);
    }
    if (minEdge !== undefined) {
      fileContent = fileContent.replace(/minEdge:\s*\d+\.?\d*/, `minEdge: ${minEdge}`);
    }
    if (dailyLossLimit !== undefined) {
      fileContent = fileContent.replace(/dailyLossLimit:\s*\d+/, `dailyLossLimit: ${dailyLossLimit}`);
    }
    if (dailySpendingLimit !== undefined) {
      fileContent = fileContent.replace(/dailySpendingLimit:\s*\d+/, `dailySpendingLimit: ${dailySpendingLimit}`);
    }
    if (maxOpenPositions !== undefined) {
      fileContent = fileContent.replace(/maxOpenPositions:\s*\d+/, `maxOpenPositions: ${maxOpenPositions}`);
    }

    // Write back to file
    fs.writeFileSync(configPath, fileContent, 'utf8');

    // Note: Bot needs to be restarted to pick up changes
    return NextResponse.json({
      success: true,
      message: 'Configuration updated. Bot restart required to apply changes.',
      config: body,
    });
  } catch (error: any) {
    console.error('Error updating bot config:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

