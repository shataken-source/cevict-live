import { NextResponse } from 'next/server';
import { diagnostic } from '@/lib/bots/diagnostic-bot';

export async function POST(req: Request) {
  const { service, instruction } = await req.json();
  
  try {
    // 1. Scan the master context for the bottleneck
    const analysis = await diagnostic.analyzeBottleneck(service);
    
    // 2. Log the intent to your Command Center terminal
    console.log(\🤖 AI Repair Initialized for: \\);
    console.log(\🔍 Issue Found: \\);

    // 3. Return the suggested fix for your approval in the Control Window
    return NextResponse.json({
      status: 'success',
      analysis,
      message: 'Bottleneck identified. Review fix in Control Window to apply.'
    });
  } catch (err) {
    return NextResponse.json({ error: 'Repair analysis failed' }, { status: 500 });
  }
}
