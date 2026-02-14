import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  API: Trigger PetScanner.ps1                                               ║
// ║  Calls the centralized script at C:\cevict-live\scripts\PetScanner.ps1    ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

const SCRIPT_PATH = 'C:\\cevict-live\\scripts\\PetScanner.ps1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location, source = 'all', maxPets = 200 } = body;

    if (!location) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }

    console.log(`[TRIGGER-SCANNER] Executing PetScanner.ps1 for location: ${location}`);

    // Build PowerShell command
    const psCommand = `powershell -ExecutionPolicy Bypass -File "${SCRIPT_PATH}" -Location "${location}" -Source "${source}" -MaxPets ${maxPets} -Quiet`;

    console.log(`[TRIGGER-SCANNER] Command: ${psCommand}`);

    try {
      const { stdout, stderr } = await execAsync(psCommand, {
        timeout: 300000, // 5 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      console.log(`[TRIGGER-SCANNER] stdout: ${stdout}`);
      if (stderr) console.log(`[TRIGGER-SCANNER] stderr: ${stderr}`);

      // Try to parse the PowerShell output
      let result = { petsFound: 0, petsSaved: 0, errors: [] as string[] };
      
      try {
        // Look for JSON-like output in stdout
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          // Parse text output
          const foundMatch = stdout.match(/Found:\s*(\d+)/i);
          const savedMatch = stdout.match(/Saved:\s*(\d+)/i);
          if (foundMatch) result.petsFound = parseInt(foundMatch[1]);
          if (savedMatch) result.petsSaved = parseInt(savedMatch[1]);
        }
      } catch (parseErr) {
        console.log('[TRIGGER-SCANNER] Could not parse output as JSON');
      }

      return NextResponse.json({
        success: true,
        message: 'PetScanner.ps1 executed successfully',
        location,
        source,
        maxPets,
        ...result,
        stdout: stdout.substring(0, 1000), // First 1000 chars
      });

    } catch (execError: any) {
      console.error(`[TRIGGER-SCANNER] Execution error:`, execError);
      
      return NextResponse.json({
        success: false,
        error: execError.message,
        stderr: execError.stderr?.substring(0, 500),
        stdout: execError.stdout?.substring(0, 500),
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[TRIGGER-SCANNER] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger scanner' },
      { status: 500 }
    );
  }
}

// GET endpoint to check script status
export async function GET() {
  try {
    const fs = require('fs');
    const scriptExists = fs.existsSync(SCRIPT_PATH);
    
    return NextResponse.json({
      scriptPath: SCRIPT_PATH,
      exists: scriptExists,
      status: scriptExists ? 'ready' : 'not_found',
      message: scriptExists 
        ? 'PetScanner.ps1 is ready to execute'
        : `Script not found at ${SCRIPT_PATH}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

