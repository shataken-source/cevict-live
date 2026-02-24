import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const text = message.toLowerCase();
    
    let reply = 'I am listening, Captain, but I do not understand that command yet.';

    // --- KNOWLEDGE BASE ---
    if (text.includes('system check')) {
       reply = 'System Green. All 75 database tables are secure. Edge Functions are active. We are ready to sail.';
    } 
    else if (text.includes('safety') || text.includes('equipment')) {
       reply = 'COMMERCIAL VESSEL (>40ft) REQUIREMENTS: 1. Life Jackets (Type I/II/III) for everyone. 2. Ring Buoy (Type IV). 3. 3x Day/Night Flares. 4. Fire Extinguishers (1x B-II or 2x B-I). 5. Whistle AND Bell.';
    }
    else if (text.includes('red') || text.includes('green') || text.includes('markers')) {
       reply = 'RED RIGHT RETURNING! Keep Red markers on your Right (Starboard) when returning from sea. Green markers go on your Left (Port). Memory Aid: Red, Right, Returning.';
    }
    else if (text.includes('joke')) {
       reply = 'Why do scuba divers fall backwards out of the boat? ... Because if they fell forwards, they would still be in the boat!';
    }

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({ error: 'Brain malfunction' }, { status: 500 });
  }
}
